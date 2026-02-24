import { ChangeDetectionStrategy, Component } from '@angular/core';
import { gameTimeFormatted } from '@helpers';

@Component({
  selector: 'app-display-game-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="text-sm">
      {{ gameTimeFormatted() }}
    </span>
  `,
})
export class DisplayGameTimeComponent {
  public gameTimeFormatted = gameTimeFormatted;
}
