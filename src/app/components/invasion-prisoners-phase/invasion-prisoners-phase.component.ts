import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { TippyDirective } from '@ngneat/helipopper';
import type { CapturedPrisoner, Icon, PrisonerAction } from '@interfaces';

@Component({
  selector: 'app-invasion-prisoners-phase',
  imports: [IconComponent, TippyDirective],
  host: { class: 'flex flex-col flex-1 min-h-0' },
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
            <div class="flex gap-2">
              @for (action of prisonerActions; track action) {
                <button
                  class="btn btn-sm btn-square"
                  [class.btn-error]="action === 'execute'"
                  [class.btn-warning]="action === 'ransom'"
                  [class.btn-info]="action === 'convert'"
                  [class.btn-accent]="action === 'sacrifice'"
                  [class.btn-secondary]="action === 'experiment'"
                  [tp]="getActionTooltip(action)"
                  tpPlacement="top"
                  tpClassName="game-tooltip"
                  (click)="handlePrisoner.emit({ prisoner, action })"
                >
                  <app-icon [name]="getActionIcon(action)" size="1.2em" />
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

  private readonly actionIcons: Record<PrisonerAction, Icon> = {
    execute: 'gameChoppedSkull',
    ransom: 'gameTwoCoins',
    convert: 'gameMinions',
    sacrifice: 'gameStarAltar',
    experiment: 'gameFizzingFlask',
  };

  private readonly actionTooltips: Record<PrisonerAction, string> = {
    execute: 'Execute — +3 Reputation (Terror)',
    ransom: 'Ransom — Gold based on class',
    convert: 'Convert — Chance to join, +5 Corruption',
    sacrifice: 'Sacrifice — Random boon, +5 Corruption',
    experiment: 'Experiment — Research points, +3 Corruption',
  };

  public getActionIcon(action: PrisonerAction): Icon {
    return this.actionIcons[action];
  }

  public getActionTooltip(action: PrisonerAction): string {
    return this.actionTooltips[action];
  }
}
