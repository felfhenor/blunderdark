import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CapturedPrisoner, PrisonerAction } from '@interfaces';

@Component({
  selector: 'app-invasion-prisoners-phase',
  template: `
    <div class="flex-1 overflow-y-auto p-4">
      <div class="text-center mb-4">
        <div class="text-xl font-bold">Prisoner Handling</div>
        <p class="text-sm opacity-70">Decide the fate of each captured invader.</p>
      </div>

      @for (prisoner of prisoners(); track prisoner.id) {
        <div class="card bg-base-200 mb-3">
          <div class="card-body p-3">
            <div class="flex items-center justify-between mb-2">
              <div>
                <span class="font-bold text-sm">{{ prisoner.name }}</span>
                <span class="badge badge-xs badge-outline ml-2">{{ prisoner.invaderClass }}</span>
              </div>
              <div class="text-xs opacity-50">
                HP {{ prisoner.stats.hp }} / ATK {{ prisoner.stats.attack }} / DEF {{ prisoner.stats.defense }}
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              @for (action of prisonerActions; track action) {
                <button
                  class="btn btn-xs"
                  [class.btn-error]="action === 'execute'"
                  [class.btn-warning]="action === 'ransom'"
                  [class.btn-info]="action === 'convert'"
                  [class.btn-accent]="action === 'sacrifice'"
                  [class.btn-secondary]="action === 'experiment'"
                  (click)="handlePrisoner.emit({ prisoner, action })"
                >
                  <span>{{ getPrisonerActionLabel(action) }}</span>
                  <span class="text-xs opacity-70 ml-1">({{ getPrisonerActionDescription(action) }})</span>
                </button>
              }
            </div>
          </div>
        </div>
      }

      @if (prisoners().length === 0) {
        <div class="text-center py-4">
          <p class="text-sm opacity-50">All prisoners have been handled.</p>
        </div>
      }
    </div>
    <div class="flex justify-end px-4 py-3 bg-base-200 flex-shrink-0">
      <button
        class="btn btn-sm btn-primary"
        [disabled]="prisoners().length > 0"
        (click)="dismiss.emit()"
      >
        Done
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvasionPrisonersPhaseComponent {
  public prisoners = input.required<CapturedPrisoner[]>();
  public handlePrisoner = output<{ prisoner: CapturedPrisoner; action: PrisonerAction }>();
  public dismiss = output();

  public readonly prisonerActions: PrisonerAction[] = [
    'execute',
    'ransom',
    'convert',
    'sacrifice',
    'experiment',
  ];

  public getPrisonerActionLabel(action: PrisonerAction): string {
    const labels: Record<PrisonerAction, string> = {
      execute: 'Execute',
      ransom: 'Ransom',
      convert: 'Convert',
      sacrifice: 'Sacrifice',
      experiment: 'Experiment',
    };
    return labels[action];
  }

  public getPrisonerActionDescription(action: PrisonerAction): string {
    const descriptions: Record<PrisonerAction, string> = {
      execute: '+2 Fear, +1 Reputation',
      ransom: 'Gold based on class',
      convert: 'Chance to join, +5 Corruption',
      sacrifice: 'Random boon, +5 Corruption',
      experiment: 'Research points, +3 Corruption',
    };
    return descriptions[action];
  }
}
