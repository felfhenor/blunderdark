import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { BattlePhase } from '@interfaces';

@Component({
  selector: 'app-invasion-phase-title',
  template: `
    @switch (phase()) {
      @case ('results') {
        Invasion - Results
      }
      @case ('rewards') {
        @if (isVictory()) {
          Victory - Rewards
        } @else {
          Defeat - Penalties
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvasionPhaseTitleComponent {
  public phase = input.required<BattlePhase>();
  public isVictory = input.required<boolean>();
}
