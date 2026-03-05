import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import { CraftingQueueDisplayComponent, type CancelGroupEvent } from '@components/crafting-queue-display/crafting-queue-display.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import {
  contentGetEntry,
  craftingQueueGetMaxSize,
  floorCurrent,
  gamestate,
  gridSelectedTile,
  resourceCanAfford,
  resourcePayCost,
  trapWorkshopAddJob,
  trapWorkshopGetCraftingCost,
  trapWorkshopGetCraftingTicks,
  trapWorkshopRemoveJobGroup,
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
    CraftingQueueDisplayComponent,
    CurrencyCostListComponent,
    InhabitantCardComponent,
    SFXDirective,
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
            <app-crafting-queue-display
              [jobs]="qs.jobs"
              [maxSize]="qs.maxSize"
              activeLabel="Crafting"
              progressColor="progress-warning"
              (cancelGroup)="cancelGroup($event)"
            />
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
                    <app-currency-cost-list [cost]="entry.totalCost" />
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
                  <div class="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      class="input input-xs w-16"
                      [value]="entry.quantity"
                      [max]="entry.maxQueueable"
                      min="1"
                      (input)="setQuantity(entry.trap.id, $event)"
                    />
                    <button
                      class="btn btn-xs btn-primary flex-1"
                      appSfx="ui-click"
                      [disabled]="entry.queueFull || !entry.canAfford"
                      (click)="
                        startCraftingBulk(
                          entry.trap.id,
                          entry.ticks,
                          entry.adjustedCost,
                          entry.quantity
                        )
                      "
                    >
                      @if (entry.queueFull) {
                        Queue full
                      } @else if (entry.canAfford) {
                        Craft x{{ entry.quantity | number: '1.0-0' }}
                      } @else {
                        Not enough resources
                      }
                    </button>
                  </div>
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

  private quantities = signal<Record<string, number>>({});

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

  public queueState = computed(() => {
    const room = this.workshopRoom();
    if (!room) return undefined;

    // Touch gamestate to get reactivity
    gamestate();

    const trapJobs = room.trapJobs;
    if (!trapJobs || trapJobs.length === 0) return undefined;

    const maxSize = craftingQueueGetMaxSize(room);

    const jobs = trapJobs.map((job) => {
      const trapDef = contentGetEntry<TrapContent>(job.trapTypeId);
      return {
        recipeId: job.trapTypeId,
        name: trapDef?.name ?? 'Unknown',
        progress: job.progress,
        targetTicks: job.targetTicks,
      };
    });

    return { jobs, maxSize };
  });

  public availableTraps = computed(() => {
    const room = this.workshopRoom();
    if (!room) return [];

    const floor = floorCurrent();
    if (!floor) return [];

    // Need at least 1 worker assigned
    const workerCount = this.assignedWorkers().length;
    if (workerCount < 1) return [];

    const allTraps = contentGetEntriesByType<TrapContent>('trap');
    const maxSize = craftingQueueGetMaxSize(room);
    const currentSize = (room.trapJobs ?? []).length;
    const slotsRemaining = Math.max(0, maxSize - currentSize);
    const qtys = this.quantities();

    const queueFull = slotsRemaining === 0;

    const entries = allTraps.map((trap) => {
      const adjustedCost = trapWorkshopGetCraftingCost(room, trap.craftCost);
      const ticks = trapWorkshopGetCraftingTicks(room, workerCount, trap.timeMultiplier);
      const rawQty = qtys[trap.id] ?? 1;
      const quantity = queueFull ? 1 : Math.min(Math.max(1, rawQty), slotsRemaining);
      const totalCost: Partial<Record<ResourceType, number>> = {};
      for (const [type, amount] of Object.entries(adjustedCost)) {
        totalCost[type as ResourceType] = (amount as number) * quantity;
      }
      const canAfford = resourceCanAfford(totalCost);

      return {
        trap,
        adjustedCost,
        ticks,
        timeSeconds: ticksToRealSeconds(ticks),
        canAfford,
        queueFull,
        quantity,
        maxQueueable: slotsRemaining,
        totalCost,
      };
    });
    return sortBy(entries, [(e) => e.trap.name]);
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

  public setQuantity(trapId: string, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.quantities.update((q) => ({ ...q, [trapId]: isNaN(value) ? 1 : Math.max(1, value) }));
  }

  public async startCraftingBulk(
    trapTypeId: TrapId,
    targetTicks: number,
    cost: ResourceCost,
    quantity: number,
  ): Promise<void> {
    analyticsSendDesignEvent('Room:TrapWorkshop:Craft');
    const room = this.workshopRoom();
    if (!room) return;

    const totalCost: Partial<Record<ResourceType, number>> = {};
    for (const [type, amount] of Object.entries(cost)) {
      totalCost[type as ResourceType] = amount * quantity;
    }

    const paid = await resourcePayCost(totalCost);
    if (!paid) return;

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          for (let i = 0; i < quantity; i++) {
            trapWorkshopAddJob(target, trapTypeId, targetTicks);
          }
          break;
        }
      }
      return state;
    });
  }

  public async cancelGroup(event: CancelGroupEvent): Promise<void> {
    const room = this.workshopRoom();
    if (!room) return;

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          trapWorkshopRemoveJobGroup(target, event.startIndex, event.count);
          break;
        }
      }
      return state;
    });
  }
}
