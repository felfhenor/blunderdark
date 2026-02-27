import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import { ModalComponent } from '@components/modal/modal.component';
import {
  contentGetEntry,
  findRoomByRole,
  gamestate,
  RUNEWORKING_BASE_TICKS,
  runeworkingComplete$,
  updateGamestate,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  InhabitantInstanceId,
  TraitRuneInstanceId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type { TraitRuneContent } from '@interfaces/content-traitrune';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-runeworking',
  imports: [DecimalPipe, InhabitantCardComponent, JobProgressComponent, ModalComponent],
  template: `
    @if (runeworkingRoom(); as room) {
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4">
          <h3 class="card-title text-sm">
            {{ roomDefName() }}
          </h3>
          <div class="mt-2">
            <div class="text-xs opacity-70">{{ roomDefDesc() }}</div>
          </div>

          <!-- Active Job -->
          @if (jobProgress(); as jp) {
            <div class="mt-2">
              <div class="flex items-center justify-between">
                <span class="text-xs">Embedding rune...</span>
                <span class="badge badge-xs badge-accent">In Progress</span>
              </div>
              <div class="mt-1">
                <app-job-progress
                  [percent]="jp.percent"
                  colorClass="progress-accent"
                />
              </div>
            </div>
          }

          <!-- Assigned Worker -->
          @if (assignedInhabitants().length > 0) {
            <div class="divider my-2 text-xs opacity-60">Runeworker</div>
            <div class="flex flex-col gap-2">
              @for (inh of assignedInhabitants(); track inh.instance.instanceId) {
                <app-inhabitant-card
                  [instance]="inh.instance"
                  [definition]="inh.def"
                  [compact]="true"
                  [showAssignment]="false"
                />
              }
            </div>
          } @else {
            <p class="text-xs opacity-50 mt-2">No runeworker assigned.</p>
          }

          <!-- Start Job UI -->
          @if (!jobProgress() && canStart()) {
            <div class="divider my-2 text-xs opacity-60">
              Runes ({{ availableRunes().length }})
            </div>

            @if (availableRunes().length > 0) {
              <div class="flex flex-col gap-2">
                <!-- Rune Selection -->
                <select
                  class="select select-bordered select-xs w-full"
                  (change)="selectedRuneId.set($any($event.target).value)"
                >
                  <option value="">Select a rune...</option>
                  @for (rune of availableRunes(); track rune.id) {
                    <option [value]="rune.id">{{ rune.name }} ({{ rune.sourceInvaderClass }})</option>
                  }
                </select>

                <!-- Inhabitant Selection -->
                <select
                  class="select select-bordered select-xs w-full"
                  (change)="selectedInhabitantId.set($any($event.target).value)"
                >
                  <option value="">Select an inhabitant...</option>
                  @for (inh of eligibleInhabitants(); track inh.instanceId) {
                    <option [value]="inh.instanceId">{{ inh.name }}</option>
                  }
                </select>

                <button
                  class="btn btn-xs btn-accent w-full"
                  [disabled]="!selectedRuneId() || !selectedInhabitantId()"
                  (click)="startJob()"
                >
                  Embed Rune ({{ getJobTime() | number: '1.0-0' }}s)
                </button>
              </div>
            } @else {
              <p class="text-xs opacity-50">No runes available. Extract runes from prisoners in the Torture Chamber.</p>
            }
          } @else if (!jobProgress()) {
            <p class="text-xs opacity-50 mt-2">
              @if (assignedInhabitants().length === 0) {
                Assign a worker to begin runeworking.
              } @else {
                No runes or eligible inhabitants available.
              }
            </p>
          }
        </div>
      </div>
    }

    <!-- Result Modal -->
    <app-modal [(visible)]="showResult">
      <span title>Runeworking Complete</span>
      <div body>
        @if (lastResult(); as result) {
          <div class="text-center">
            <p class="text-accent mt-2">
              Rune successfully embedded into {{ result.inhabitantName }}!
            </p>
          </div>
        }
      </div>
      <div actions>
        <button class="btn btn-sm" (click)="showResult.set(false)">Close</button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRuneworkingComponent {
  public showResult = signal(false);
  public lastResult = signal<{ inhabitantName: string } | undefined>(undefined);
  public selectedRuneId = signal('');
  public selectedInhabitantId = signal('');

  private subscriptions = [
    runeworkingComplete$.subscribe((evt) => {
      this.lastResult.set({ inhabitantName: evt.inhabitantName });
      this.showResult.set(true);
    }),
  ];

  public runeworkingRoom = computed(() => {
    return findRoomByRole('runeworking')?.room;
  });

  public roomDefName = computed(() => {
    const room = this.runeworkingRoom();
    if (!room) return 'Runeworking Chamber';
    return contentGetEntry<RoomContent>(room.roomTypeId)?.name ?? 'Runeworking Chamber';
  });

  public roomDefDesc = computed(() => {
    const room = this.runeworkingRoom();
    if (!room) return '';
    return contentGetEntry<RoomContent>(room.roomTypeId)?.description ?? '';
  });

  public assignedInhabitants = computed(() => {
    const room = this.runeworkingRoom();
    if (!room) return [];
    const state = gamestate();
    const mapped = state.world.inhabitants
      .filter((i) => i.assignedRoomId === room.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(i.definitionId);
        return { instance: i, def };
      })
      .filter((e): e is typeof e & { def: InhabitantContent } => e.def !== undefined);
    return sortBy(mapped, [(e) => e.def.name]);
  });

  public availableRunes = computed(() => {
    const state = gamestate();
    return state.world.traitRunes.map((r) => {
      const def = contentGetEntry<TraitRuneContent>(r.runeTypeId);
      return {
        id: r.id,
        name: def?.name ?? 'Unknown Rune',
        sourceInvaderClass: r.sourceInvaderClass,
      };
    });
  });

  public eligibleInhabitants = computed(() => {
    const state = gamestate();
    return sortBy(
      state.world.inhabitants.filter((i) => !i.equippedRuneId),
      [(i) => i.name],
    );
  });

  public jobProgress = computed(() => {
    const room = this.runeworkingRoom();
    if (!room?.runeworkingJob) return undefined;
    const job = room.runeworkingJob;
    const elapsed = job.targetTicks - job.ticksRemaining;
    const percent = Math.min(100, Math.round((elapsed / job.targetTicks) * 100));
    return { percent };
  });

  public canStart = computed(() => {
    const room = this.runeworkingRoom();
    if (!room || room.runeworkingJob) return false;
    const hasWorker = this.assignedInhabitants().length > 0;
    const hasRunes = gamestate().world.traitRunes.length > 0;
    const hasEligible = this.eligibleInhabitants().length > 0;
    return hasWorker && hasRunes && hasEligible;
  });

  public getJobTime(): number {
    return ticksToRealSeconds(RUNEWORKING_BASE_TICKS);
  }

  public async startJob(): Promise<void> {
    const room = this.runeworkingRoom();
    const runeId = this.selectedRuneId();
    const inhabitantId = this.selectedInhabitantId();
    if (!room || !runeId || !inhabitantId) return;

    await updateGamestate((state) => {
      for (const flr of state.world.floors) {
        const target = flr.rooms.find((r) => r.id === room.id);
        if (target) {
          target.runeworkingJob = {
            runeId: runeId as TraitRuneInstanceId,
            inhabitantInstanceId: inhabitantId as InhabitantInstanceId,
            ticksRemaining: RUNEWORKING_BASE_TICKS,
            targetTicks: RUNEWORKING_BASE_TICKS,
          };
          break;
        }
      }
      return state;
    });

    this.selectedRuneId.set('');
    this.selectedInhabitantId.set('');
  }
}
