import { ChangeDetectionStrategy, Component } from '@angular/core';
import { formattedGameTime, gameSpeed, isGameloopPaused } from '@helpers';

@Component({
  selector: 'app-display-game-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="font-mono text-sm">
      {{ formattedGameTime() }}
      @if (isPaused()) {
        <span class="text-warning ml-1">[Paused]</span>
      } @else if (speed() > 1) {
        <span class="text-info ml-1">[{{ speed() }}x]</span>
      }
    </span>
  `,
})
export class DisplayGameTimeComponent {
  public formattedGameTime = formattedGameTime;
  public isPaused = isGameloopPaused;
  public speed = gameSpeed;
}
