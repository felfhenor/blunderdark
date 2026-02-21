import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  signal,
} from '@angular/core';
import { ModalComponent } from '@components/modal/modal.component';
import { VictoryConditionRowComponent } from '@components/victory-condition-row/victory-condition-row.component';
import { contentGetEntriesByType } from '@helpers/content';
import {
  victoryCalculatePathCompletionPercent,
  victoryProgressMap,
} from '@helpers/victory';
import type {
  VictoryCondition,
  VictoryPathContent,
  VictoryPathId,
} from '@interfaces';

type PathCardCondition = VictoryCondition & {
  currentValue: number;
  met: boolean;
};

type PathViewModel = {
  id: VictoryPathId;
  name: string;
  description: string;
  conditions: PathCardCondition[];
  completionPercent: number;
  isClosest: boolean;
  isComplete: boolean;
};

@Component({
  selector: 'app-victory-menu',
  imports: [DecimalPipe, ModalComponent, VictoryConditionRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [(visible)]="visible"
      [allowEscToClose]="true"
      [showCloseButton]="true"
      widthClass="max-w-3xl"
    >
      <div title class="text-lg">Victory Paths</div>

      <div body>
        <div role="tablist" class="tabs tabs-bordered tabs-sm mb-3">
          @for (path of paths(); track path.id) {
            <button
              role="tab"
              class="tab gap-1.5"
              [class.tab-active]="selectedPath()?.id === path.id"
              (click)="selectedPathId.set(path.id)"
            >
              <span class="truncate text-xs">{{ path.name }}</span>
              <span
                class="text-xs opacity-70"
                [class.text-success]="path.isComplete"
                [class.text-primary]="!path.isComplete"
              >
                {{ path.completionPercent | number: '1.0-0' }}%
              </span>
            </button>
          }
        </div>

        @if (selectedPath(); as path) {
          <div>
            <div class="flex items-center gap-2 mb-2">
              <h4 class="font-bold text-sm">{{ path.name }}</h4>
              @if (path.isClosest) {
                <span class="badge badge-success badge-xs">Closest</span>
              }
              @if (path.isComplete) {
                <span class="badge badge-accent badge-xs">
                  Victory Available
                </span>
              }
              <div
                class="radial-progress text-xs ml-auto"
                [style.--value]="path.completionPercent"
                [style.--size]="'2.5rem'"
                [style.--thickness]="'3px'"
                [class.text-success]="path.isComplete"
                [class.text-primary]="!path.isComplete"
                role="progressbar"
              >
                <span class="text-[0.6rem]">
                  {{ path.completionPercent | number: '1.0-0' }}%
                </span>
              </div>
            </div>
            <p class="text-xs opacity-60 mb-3">{{ path.description }}</p>

            @for (cond of path.conditions; track cond.id) {
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

      <div actions>
        <button class="btn btn-sm btn-ghost" (click)="visible.set(false)">
          Close
        </button>
      </div>
    </app-modal>
  `,
})
export class VictoryMenuComponent {
  public visible = model<boolean>(false);
  public selectedPathId = signal<VictoryPathId | null>(null);

  public paths = computed<PathViewModel[]>(() => {
    const allPaths = contentGetEntriesByType<VictoryPathContent>('victorypath');
    const progressMap = victoryProgressMap();

    const viewModels: PathViewModel[] = allPaths.map((path) => {
      const progress = progressMap.get(path.id);
      const completionPercent = victoryCalculatePathCompletionPercent(
        path,
        progress,
      );

      const conditions: PathCardCondition[] = path.conditions.map((cond) => {
        const condProgress = progress?.conditions.find(
          (c) => c.conditionId === cond.id,
        );
        return {
          ...cond,
          currentValue: condProgress?.currentValue ?? 0,
          met: condProgress?.met ?? false,
        };
      });

      return {
        id: path.id,
        name: path.name,
        description: path.description,
        conditions,
        completionPercent,
        isClosest: false,
        isComplete: progress?.complete ?? false,
      };
    });

    const maxPercent = Math.max(
      0,
      ...viewModels.map((p) => p.completionPercent),
    );
    if (maxPercent > 0) {
      for (const vm of viewModels) {
        if (vm.completionPercent === maxPercent && !vm.isComplete) {
          vm.isClosest = true;
        }
      }
    }

    return viewModels;
  });

  public selectedPath = computed(() => {
    const id = this.selectedPathId();
    const allPaths = this.paths();
    if (id !== null) {
      return allPaths.find((p) => p.id === id) ?? null;
    }
    return allPaths.find((p) => p.isClosest) ?? allPaths[0] ?? null;
  });

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
