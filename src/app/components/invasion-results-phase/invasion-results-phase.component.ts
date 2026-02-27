import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { InvasionEndReason, InvasionOrchestratorResult } from '@interfaces';

const END_REASON_LABELS: Record<InvasionEndReason, string> = {
  all_invaders_eliminated: 'All invaders eliminated',
  turn_limit_reached: 'Turn limit reached',
  altar_destroyed: 'Altar destroyed',
  objectives_completed: 'Objectives completed',
  morale_broken: 'Invader morale broken',
};

@Component({
  selector: 'app-invasion-results-phase',
  imports: [DecimalPipe],
  host: { class: 'flex flex-col flex-1 min-h-0' },
  template: `
    <div class="flex-1 overflow-y-auto p-4">
      @if (result(); as res) {
        <!-- Win/Loss Banner -->
        <div class="text-center mb-4">
          @if (isVictory()) {
            <div class="text-2xl font-bold text-success mb-1">Victory!</div>
            <p class="text-sm opacity-70">The invaders have been repelled.</p>
          } @else {
            <div class="text-2xl font-bold text-error mb-1">Defeat</div>
            <p class="text-sm opacity-70">The dungeon has fallen.</p>
          }
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div class="stat-box bg-base-200 rounded-lg p-3 text-center">
            <div class="text-xs opacity-50">Invaders</div>
            <div class="text-lg font-bold">
              {{ res.detailedResult.invadersKilled }} /
              {{ res.detailedResult.invaderCount }}
            </div>
            <div class="text-xs opacity-50">killed</div>
          </div>
          <div class="stat-box bg-base-200 rounded-lg p-3 text-center">
            <div class="text-xs opacity-50">Defenders</div>
            <div class="text-lg font-bold">
              {{ res.detailedResult.defendersLost }} /
              {{ res.detailedResult.defenderCount }}
            </div>
            <div class="text-xs opacity-50">lost</div>
          </div>
          <div class="stat-box bg-base-200 rounded-lg p-3 text-center">
            <div class="text-xs opacity-50">Turns</div>
            <div class="text-lg font-bold">
              {{ res.detailedResult.turnsTaken }}
            </div>
          </div>
          <div class="stat-box bg-base-200 rounded-lg p-3 text-center">
            <div class="text-xs opacity-50">Objectives</div>
            <div class="text-lg font-bold">
              {{ res.detailedResult.objectivesCompleted }} /
              {{ res.detailedResult.objectivesTotal }}
            </div>
            <div class="text-xs opacity-50">completed by invaders</div>
          </div>
        </div>

        <!-- Altar Status -->
        @if (altarDebuffPercent() > 0) {
          <div class="stat-box bg-base-200 rounded-lg p-3 text-center max-w-md mx-auto mt-4">
            <div class="text-xs opacity-50">Altar Status</div>
            <div class="text-lg font-bold text-warning">
              -{{ altarDebuffPercent() | number: '1.0-0' }}% Max HP
            </div>
            <div class="text-xs opacity-50">from completed objectives</div>
          </div>
        }

        <!-- Reward Multiplier -->
        @if (isVictory()) {
          <div class="stat-box bg-base-200 rounded-lg p-3 text-center max-w-md mx-auto mt-4">
            <div class="text-xs opacity-50">Reward Multiplier</div>
            <div class="text-lg font-bold"
              [class.text-success]="res.detailedResult.rewardMultiplier >= 1.0"
              [class.text-warning]="res.detailedResult.rewardMultiplier < 1.0"
            >
              {{ res.detailedResult.rewardMultiplier | number: '1.2-2' }}x
            </div>
          </div>
        }

        <div class="alert mt-4 max-w-md mx-auto" [class.alert-success]="isVictory()" [class.alert-error]="!isVictory()">
          <span>{{ endReasonLabel(res.detailedResult.endReason) }}</span>
        </div>
      }
    </div>
    <div class="flex justify-end px-4 py-3 bg-base-200 flex-shrink-0">
      <button class="btn btn-sm btn-primary" (click)="advance.emit()">
        @if (isVictory()) {
          View Rewards
        } @else {
          View Penalties
        }
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvasionResultsPhaseComponent {
  public result = input.required<InvasionOrchestratorResult>();
  public isVictory = input.required<boolean>();
  public advance = output();

  public altarDebuffPercent = computed(() => {
    const res = this.result();
    if (!res?.detailedResult) return 0;
    const multiplier = res.detailedResult.altarMaxHpMultiplier ?? 1.0;
    return multiplier < 1.0 ? Math.round((1.0 - multiplier) * 100) : 0;
  });

  public endReasonLabel(reason: InvasionEndReason): string {
    return END_REASON_LABELS[reason];
  }
}
