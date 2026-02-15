import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import type { VictoryCheckType } from '@interfaces';

@Component({
  selector: 'app-victory-condition-row',
  imports: [DecimalPipe, TippyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-2 py-1"
      [class.opacity-50]="!met()"
      [tp]="tooltip()"
      [tpDelay]="250"
      tpClassName="game-tooltip"
    >
      <span
        class="text-base flex-shrink-0"
        [class.text-success]="met()"
      >
        {{ met() ? '\u2714' : '\u2610' }}
      </span>

      <div class="flex-1 min-w-0">
        <div class="text-xs truncate">{{ description() }}</div>

        @if (checkType() !== 'flag') {
          <progress
            class="progress w-full h-1.5"
            [class.progress-success]="met()"
            [class.progress-primary]="!met()"
            [value]="progressPercent()"
            max="100"
          ></progress>
        }
      </div>

      <span class="text-xs font-mono opacity-60 flex-shrink-0 whitespace-nowrap">
        @if (checkType() === 'flag') {
          {{ met() ? 'Yes' : 'No' }}
        } @else {
          {{ currentValue() | number: '1.0-0' }} / {{ target() | number: '1.0-0' }}
        }
      </span>
    </div>
  `,
})
export class VictoryConditionRowComponent {
  public description = input.required<string>();
  public currentValue = input.required<number>();
  public target = input.required<number>();
  public met = input.required<boolean>();
  public checkType = input.required<VictoryCheckType>();
  public hint = input<string>('');

  public progressPercent = computed(() => {
    const t = this.target();
    if (t <= 0) return this.met() ? 100 : 0;
    return Math.min(100, (this.currentValue() / t) * 100);
  });

  public tooltip = computed(() => {
    const h = this.hint();
    if (h) return h;
    if (this.met()) return 'Condition complete!';
    return this.description();
  });
}
