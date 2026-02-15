import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
} from '@angular/core';
import { ModalComponent } from '@components/modal/modal.component';
import {
  VictoryPathCardComponent,
  type PathCardCondition,
} from '@components/victory-path-card/victory-path-card.component';
import { contentGetEntriesByType } from '@helpers/content';
import {
  victoryCalculatePathCompletionPercent,
  victoryProgressMap,
} from '@helpers/victory';
import type {
  IsContentItem,
  VictoryPathContent,
  VictoryPathId,
} from '@interfaces';

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
  imports: [ModalComponent, VictoryPathCardComponent],
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
        <p class="text-xs opacity-60 mb-3">
          Pursue any of these paths to achieve victory. Expand a path to see detailed conditions.
        </p>

        <div class="space-y-2">
          @for (path of paths(); track path.id) {
            <app-victory-path-card
              [name]="path.name"
              [description]="path.description"
              [conditions]="path.conditions"
              [completionPercent]="path.completionPercent"
              [isClosest]="path.isClosest"
              [isComplete]="path.isComplete"
            />
          }
        </div>
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

  public paths = computed<PathViewModel[]>(() => {
    const allPaths =
      contentGetEntriesByType<VictoryPathContent & IsContentItem>(
        'victorypath',
      );
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

    // Find the max completion percent and mark closest paths
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
}
