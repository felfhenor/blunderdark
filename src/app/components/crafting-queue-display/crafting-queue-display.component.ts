import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';

export type QueueDisplayJob = {
  recipeId: string;
  name: string;
  progress: number;
  targetTicks: number;
};

export type CancelGroupEvent = {
  recipeId: string;
  startIndex: number;
  count: number;
};

@Component({
  selector: 'app-crafting-queue-display',
  imports: [DecimalPipe, JobProgressComponent, SFXDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="divider my-2 text-xs opacity-60">
      Queue ({{ jobs().length | number: '1.0-0' }}/{{
        maxSize() | number: '1.0-0'
      }})
    </div>
    <div class="flex flex-col gap-2">
      @for (group of groups(); track group.startIndex) {
        <div class="flex flex-col gap-2 p-1 bg-base-200 rounded">
          <div class="flex items-center justify-between">
            <span class="text-xs">
              {{ group.name }}
              @if (group.count > 1) {
                <span class="opacity-50">x{{ group.count }}</span>
              }
            </span>
            <div class="flex items-center gap-2">
              @if (group.isActive) {
                <span class="badge badge-xs badge-warning">
                  {{ activeLabel() }}
                </span>
              } @else {
                <span class="badge badge-xs badge-ghost">Queued</span>
              }
              <button
                class="btn btn-xs btn-ghost btn-circle"
                appSfx="ui-error"
                (click)="cancelGroup.emit(group)"
              >
                x
              </button>
            </div>
          </div>
          @if (group.isActive) {
            <app-job-progress
              [percent]="group.percent"
              [colorClass]="progressColor()"
            />
          }
        </div>
      }
    </div>
  `,
})
export class CraftingQueueDisplayComponent {
  jobs = input<QueueDisplayJob[]>([]);
  maxSize = input<number>(0);
  activeLabel = input<string>('Crafting');
  progressColor = input<string>('progress-warning');

  cancelGroup = output<CancelGroupEvent>();

  groups = computed(() => {
    const jobs = this.jobs();
    const groups: Array<{
      recipeId: string;
      name: string;
      count: number;
      startIndex: number;
      isActive: boolean;
      percent: number;
    }> = [];

    for (let i = 0; i < jobs.length; i++) {
      const last = groups[groups.length - 1];
      if (last && last.recipeId === jobs[i].recipeId) {
        last.count++;
      } else {
        const isActive = i === 0;
        const percent = isActive
          ? Math.min(
              100,
              Math.round((jobs[i].progress / jobs[i].targetTicks) * 100),
            )
          : 0;
        groups.push({
          recipeId: jobs[i].recipeId,
          name: jobs[i].name,
          count: 1,
          startIndex: i,
          isActive,
          percent,
        });
      }
    }

    return groups;
  });
}
