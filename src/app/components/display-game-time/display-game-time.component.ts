import { ChangeDetectionStrategy, Component } from '@angular/core';
import { gameTimeFormatted } from '@helpers';

@Component({
  selector: 'app-display-game-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="text-sm inline-block tabular-nums min-w-[16ch]">
      {{ gameTimeFormatted() }}
    </span>
  `,
})
export class DisplayGameTimeComponent {
  public gameTimeFormatted = gameTimeFormatted;
}
