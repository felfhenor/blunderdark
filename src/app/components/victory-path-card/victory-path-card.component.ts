import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { VictoryConditionRowComponent } from '@components/victory-condition-row/victory-condition-row.component';
import type { VictoryCondition } from '@interfaces';

export type PathCardCondition = VictoryCondition & {
  currentValue: number;
  met: boolean;
};

@Component({
  selector: 'app-victory-path-card',
  imports: [DecimalPipe, VictoryConditionRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="card bg-base-200 shadow-sm"
      [class.ring-2]="isClosest()"
      [class.ring-success]="isClosest()"
    >
      <div
        class="card-body p-3 cursor-pointer"
        (click)="expanded.set(!expanded())"
      >
        <div class="flex items-center gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-sm truncate">{{ name() }}</h4>
              @if (isClosest()) {
                <span class="badge badge-success badge-xs">Closest</span>
              }
              @if (isComplete()) {
                <span class="badge badge-accent badge-xs">Victory Available</span>
              }
            </div>
            <p class="text-xs opacity-60 truncate">{{ description() }}</p>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="radial-progress text-xs" [style.--value]="completionPercent()" [style.--size]="'2rem'" [style.--thickness]="'3px'"
              [class.text-success]="isComplete()"
              [class.text-primary]="!isComplete()"
              role="progressbar"
            >
              <span class="text-[0.6rem]">{{ completionPercent() | number: '1.0-0' }}%</span>
            </div>
            <span class="text-xs opacity-40">{{ expanded() ? '\u25B2' : '\u25BC' }}</span>
          </div>
        </div>

        @if (expanded()) {
          <div class="mt-2 border-t border-base-300 pt-2">
            @for (cond of conditions(); track cond.id) {
              <app-victory-condition-row
                [description]="cond.description"
                [currentValue]="cond.currentValue"
                [target]="cond.target"
                [met]="cond.met"
                [checkType]="cond.checkType"
                [hint]="conditionHint(cond)"
              />
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class VictoryPathCardComponent {
  public name = input.required<string>();
  public description = input.required<string>();
  public conditions = input.required<PathCardCondition[]>();
  public completionPercent = input.required<number>();
  public isClosest = input<boolean>(false);
  public isComplete = input<boolean>(false);

  public expanded = signal(false);

  public conditionHint(cond: PathCardCondition): string {
    if (cond.met) return 'Condition complete!';

    switch (cond.checkType) {
      case 'resource_threshold':
        return `Accumulate resources to reach ${cond.target}. Current: ${cond.currentValue}.`;
      case 'count':
        return `Reach a count of ${cond.target}. Current: ${cond.currentValue}.`;
      case 'duration':
        return `Maintain for ${cond.target} consecutive days. Current streak: ${cond.currentValue}.`;
      case 'flag':
        return 'Complete this objective to check it off.';
    }
  }
}
