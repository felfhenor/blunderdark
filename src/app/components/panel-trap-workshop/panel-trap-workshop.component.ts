import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import {
  contentGetEntry,
  floorCurrent,
  gamestate,
  gridSelectedTile,
  notify,
  resourceCanAfford,
  resourcePayCost,
  trapWorkshopAddJob,
  trapWorkshopCanQueue,
  trapWorkshopCompleted$,
  trapWorkshopGetCraftingCost,
  trapWorkshopGetCraftingTicks,
  trapWorkshopRemoveJob,
  updateGamestate,
} from '@helpers';
import { roomRoleFindById } from '@helpers/room-roles';
import { contentGetEntriesByType } from '@helpers/content';
import { ticksToRealSeconds } from '@helpers/game-time';
import type { ResourceType } from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type { TrapContent, TrapId } from '@interfaces/content-trap';
import type { ResourceCost } from '@interfaces/resource';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-trap-workshop',
  imports: [
    DecimalPipe,
    CurrencyCostListComponent,
    InhabitantCardComponent,
    JobProgressComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      @apply block;
    }
  `,
  template: `
    @if (workshopRoom(); as room) {
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4">
          <h3 class="card-title text-sm">
            {{ roomDef()?.name ?? 'Trap Workshop' }}
          </h3>
          <div class="mt-2">
            <div class="text-xs opacity-70">{{ roomDef()?.description }}</div>
          </div>

          <!-- Crafting Queue -->
          @if (queueState(); as qs) {
            <div class="divider my-2 text-xs opacity-60">
              Crafting Queue ({{ qs.jobs.length | number: '1.0-0' }})
            </div>
            <div class="flex flex-col gap-2">
              @for (job of qs.jobs; track job.index) {
                <div class="flex flex-col gap-2 p-1 bg-base-200 rounded">
                  <div class="flex items-center justify-between">
                    <span class="text-xs">{{ job.trapName }}</span>
                    <div class="flex items-center gap-2">
                      @if (job.isActive) {
                        <span class="badge badge-xs badge-warning">
                          Crafting
                        </span>
                      } @else {
                        <span class="badge badge-xs badge-ghost">Queued</span>
                      }
                      <button
                        class="btn btn-xs btn-ghost btn-circle"
                        (click)="cancelJob(job.index)"
                      >
                        x
                      </button>
                    </div>
                  </div>
                  @if (job.isActive) {
                    <app-job-progress
                      [percent]="job.percent"
                      colorClass="progress-warning"
                    />
                  }
                </div>
              }
            </div>
          }

          <!-- Assigned Workers -->
          @if (assignedWorkers().length > 0) {
            <div class="divider my-2 text-xs opacity-60">Workers</div>
            <div class="flex flex-col gap-2">
              @for (w of assignedWorkers(); track w.instance.instanceId) {
                <app-inhabitant-card
                  [instance]="w.instance"
                  [definition]="w.def"
                  [compact]="true"
                  [showAssignment]="false"
                />
              }
            </div>
          } @else {
            <p class="text-xs opacity-50 mt-2">No workers assigned.</p>
          }

          <!-- Available Traps -->
          @if (availableTraps().length > 0) {
            <div class="divider my-2 text-xs opacity-60">Trap Blueprints</div>
            <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
              @for (entry of availableTraps(); track entry.trap.id) {
                <div class="flex flex-col gap-2 p-2 bg-base-200 rounded">
                  <span class="text-xs font-semibold">
                    {{ entry.trap.name }}
                  </span>
                  <span class="text-xs opacity-60">
                    {{ entry.trap.description }}
                  </span>
                  <span class="text-xs opacity-50">
                    Cost:
                    <app-currency-cost-list [cost]="entry.adjustedCost" />
                  </span>
                  <span class="text-xs opacity-50">
                    Time: {{ entry.timeSeconds | number: '1.0-0' }} sec
                  </span>
                  <div class="flex items-center gap-2 text-xs opacity-50">
                    <span>
                      Charges: {{ entry.trap.charges | number: '1.0-0' }}
                    </span>
                    <span>
                      Trigger:
                      {{ entry.trap.triggerChance * 100 | number: '1.0-0' }}%
                    </span>
                  </div>
                  <button
                    class="btn btn-xs btn-primary mt-1"
                    [disabled]="!entry.canAfford"
                    (click)="
                      startCrafting(
                        entry.trap.id,
                        entry.ticks,
                        entry.adjustedCost
                      )
                    "
                  >
                    @if (entry.canAfford) {
                      Craft
                    } @else {
                      Not enough resources
                    }
                  </button>
                </div>
              }
            </div>
          }

          <!-- Trap Inventory -->
          @if (trapInventory().length > 0) {
            <div class="divider my-2 text-xs opacity-60">Trap Inventory</div>
            <div class="flex flex-col gap-2">
              @for (item of trapInventory(); track item.trapTypeId) {
                <div class="flex items-center justify-between">
                  <span class="text-xs">{{ item.name }}</span>
                  <span class="badge badge-xs badge-outline">
                    x{{ item.count | number: '1.0-0' }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class PanelTrapWorkshopComponent {
  private subscription = trapWorkshopCompleted$.subscribe((evt) => {
    notify('Traps', `Crafted: ${evt.trapName}`);
  });

  public workshopRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room) return undefined;

    const trapWorkshopTypeId = roomRoleFindById('trapWorkshop');
    if (room.roomTypeId !== trapWorkshopTypeId) return undefined;

    return room;
  });

  public roomDef = computed(() => {
    const room = this.workshopRoom();
    if (!room) return undefined;
    return contentGetEntry<RoomContent>(room.roomTypeId);
  });

  public assignedWorkers = computed(() => {
    const room = this.workshopRoom();
    if (!room) return [];

    const state = gamestate();
    const mapped = state.world.inhabitants
      .filter((i) => i.assignedRoomId === room.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(i.definitionId);
        return { instance: i, def };
      })
      .filter(
        (e): e is typeof e & { def: InhabitantContent } => e.def !== undefined,
      );
    return sortBy(mapped, [(e) => e.def.name]);
  });

  public availableTraps = computed(() => {
    const room = this.workshopRoom();
    if (!room) return [];

    const state = gamestate();
    const { canQueue } = trapWorkshopCanQueue(
      room.id,
      state.world.floors,
    );
    if (!canQueue) return [];

    const allTraps = contentGetEntriesByType<TrapContent>('trap');
    const workerCount = this.assignedWorkers().length;

    const entries = allTraps.map((trap) => {
      const adjustedCost = trapWorkshopGetCraftingCost(room, trap.craftCost);
      const ticks = trapWorkshopGetCraftingTicks(room, workerCount);
      const canAfford = resourceCanAfford(adjustedCost);

      return {
        trap,
        adjustedCost,
        ticks,
        timeSeconds: ticksToRealSeconds(ticks),
        canAfford,
      };
    });
    return sortBy(entries, [(e) => e.trap.name]);
  });

  public queueState = computed(() => {
    const room = this.workshopRoom();
    if (!room) return undefined;

    const state = gamestate();
    const queue = state.world.trapCraftingQueues.find(
      (q) => q.roomId === room.id,
    );
    if (!queue || queue.jobs.length === 0) return undefined;

    const jobs = queue.jobs.map((job, index) => {
      const trapDef = contentGetEntry<TrapContent>(job.trapTypeId);
      const percent = Math.min(
        100,
        Math.round((job.progress / job.targetTicks) * 100),
      );
      return {
        index,
        trapName: trapDef?.name ?? 'Unknown',
        percent,
        isActive: index === 0,
      };
    });

    return { jobs };
  });

  public trapInventory = computed(() => {
    const state = gamestate();
    const entries = state.world.trapInventory.map((entry) => {
      const def = contentGetEntry<TrapContent>(entry.trapTypeId);
      return {
        trapTypeId: entry.trapTypeId,
        name: def?.name ?? 'Unknown',
        count: entry.count,
      };
    });
    return sortBy(entries, [(e) => e.name]);
  });

  public async startCrafting(
    trapTypeId: TrapId,
    targetTicks: number,
    cost: ResourceCost,
  ): Promise<void> {
    const room = this.workshopRoom();
    if (!room) return;

    const paid = await resourcePayCost(cost as Partial<Record<ResourceType, number>>);
    if (!paid) return;

    await updateGamestate((state) => {
      state.world.trapCraftingQueues = trapWorkshopAddJob(
        state.world.trapCraftingQueues,
        room.id,
        trapTypeId,
        targetTicks,
      );
      return state;
    });
  }

  public async cancelJob(jobIndex: number): Promise<void> {
    const room = this.workshopRoom();
    if (!room) return;

    await updateGamestate((state) => {
      state.world.trapCraftingQueues = trapWorkshopRemoveJob(
        state.world.trapCraftingQueues,
        room.id,
        jobIndex,
      );
      return state;
    });
  }
}
