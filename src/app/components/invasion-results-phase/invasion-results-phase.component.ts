import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
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

        <div class="text-center mt-3">
          <span class="badge badge-sm">
            End reason: {{ endReasonLabel(res.detailedResult.endReason) }}
          </span>
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

  public endReasonLabel(reason: InvasionEndReason): string {
    return END_REASON_LABELS[reason];
  }
}
