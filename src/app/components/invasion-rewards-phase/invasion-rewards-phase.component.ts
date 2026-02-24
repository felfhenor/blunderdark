import { KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type { InvasionOrchestratorResult } from '@interfaces';

@Component({
  selector: 'app-invasion-rewards-phase',
  imports: [KeyValuePipe],
  template: `
    <div class="flex-1 overflow-y-auto p-4">
      @if (result(); as res) {
        @if (isVictory() && res.rewards) {
          <div class="text-center mb-4">
            <div class="text-xl font-bold text-success">Spoils of War</div>
          </div>
          <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
            @if (res.rewards.goldGain > 0) {
              <div class="reward-box bg-base-200 rounded-lg p-3 text-center">
                <div class="text-xs opacity-50">Gold</div>
                <div class="text-lg font-bold text-warning">
                  +{{ res.rewards.goldGain }}
                </div>
              </div>
            }
            @if (res.rewards.reputationGain > 0) {
              <div class="reward-box bg-base-200 rounded-lg p-3 text-center">
                <div class="text-xs opacity-50">Reputation</div>
                <div class="text-lg font-bold text-info">
                  +{{ res.rewards.reputationGain }}
                </div>
              </div>
            }
            @if (res.rewards.experienceGain > 0) {
              <div class="reward-box bg-base-200 rounded-lg p-3 text-center">
                <div class="text-xs opacity-50">Experience</div>
                <div class="text-lg font-bold text-accent">
                  +{{ res.rewards.experienceGain }}
                </div>
              </div>
            }
            @for (
              entry of res.rewards.resourceGains | keyvalue;
              track entry.key
            ) {
              @if (entry.value && entry.value > 0) {
                <div class="reward-box bg-base-200 rounded-lg p-3 text-center">
                  <div class="text-xs opacity-50">{{ entry.key }}</div>
                  <div class="text-lg font-bold text-success">
                    +{{ entry.value }}
                  </div>
                </div>
              }
            }
          </div>
          @if (res.capturedPrisoners.length > 0) {
            <div class="text-center mt-3 text-sm opacity-70">
              {{ res.capturedPrisoners.length }} prisoner(s) captured
            </div>
          }
        } @else if (!isVictory() && res.penalties) {
          <div class="text-center mb-4">
            <div class="text-xl font-bold text-error">Losses Suffered</div>
          </div>
          <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
            @if (res.penalties.goldLost > 0) {
              <div class="penalty-box bg-base-200 rounded-lg p-3 text-center">
                <div class="text-xs opacity-50">Gold Lost</div>
                <div class="text-lg font-bold text-error">
                  -{{ res.penalties.goldLost }}
                </div>
              </div>
            }
            @if (res.penalties.reputationLoss > 0) {
              <div class="penalty-box bg-base-200 rounded-lg p-3 text-center">
                <div class="text-xs opacity-50">Reputation Lost</div>
                <div class="text-lg font-bold text-error">
                  -{{ res.penalties.reputationLoss }}
                </div>
              </div>
            }
            @for (
              entry of res.penalties.resourceLosses | keyvalue;
              track entry.key
            ) {
              @if (entry.value && entry.value > 0) {
                <div class="penalty-box bg-base-200 rounded-lg p-3 text-center">
                  <div class="text-xs opacity-50">{{ entry.key }}</div>
                  <div class="text-lg font-bold text-error">
                    -{{ entry.value }}
                  </div>
                </div>
              }
            }
            @if (res.killedDefenderIds.length > 0) {
              <div
                class="penalty-box bg-base-200 rounded-lg p-3 text-center col-span-2"
              >
                <div class="text-xs opacity-50">Defenders Killed</div>
                <div class="text-lg font-bold text-error">
                  {{ res.killedDefenderIds.length }}
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
    <div class="flex justify-end px-4 py-3 bg-base-200 flex-shrink-0">
      <button class="btn btn-sm btn-primary" (click)="advance.emit()">
        @if (hasPrisoners()) {
          Handle Prisoners ({{ prisonerCount() }})
        } @else {
          Dismiss
        }
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvasionRewardsPhaseComponent {
  public result = input.required<InvasionOrchestratorResult>();
  public isVictory = input.required<boolean>();
  public hasPrisoners = input.required<boolean>();
  public prisonerCount = input.required<number>();
  public advance = output();
}
