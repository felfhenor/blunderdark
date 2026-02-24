import { DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-job-progress',
  imports: [DecimalPipe, NgClass],
  template: `
    <progress class="progress w-full"
      [ngClass]="colorClass()"
      [value]="percent()"
      max="100">
    </progress>
    @if (showLabel()) {
      <span class="text-xs opacity-40">{{ percent() | number: '1.0-2' }}%</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobProgressComponent {
  percent = input.required<number>();
  colorClass = input<string>('progress-primary');
  showLabel = input(true);
}
