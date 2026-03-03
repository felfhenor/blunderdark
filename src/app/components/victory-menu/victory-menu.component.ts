import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { ModalComponent } from '@components/modal/modal.component';
import { VictoryConditionRowComponent } from '@components/victory-condition-row/victory-condition-row.component';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import { contentGetEntry, contentGetEntriesByType } from '@helpers/content';
import { RESOURCE_LABEL_MAP } from '@helpers/resource-icons';
import { optionsGet } from '@helpers/state-options';
import {
  victoryAchievedPathId,
  victoryCalculatePathCompletionPercent,
  victoryIsAchieved,
  victoryProgressMap,
  victoryResetGame,
} from '@helpers/victory';
import type {
  VictoryCondition,
  VictoryPathContent,
  VictoryPathId,
  VictoryResetProgress,
  VictoryReward,
} from '@interfaces';
import type { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

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
  isAchieved: boolean;
  completedInPriorRun: boolean;
  rewardDescription: string;
};

function formatRewardList(rewards: VictoryReward[]): string {
  if (!rewards?.length) return '';
  return rewards
    .map((reward) => {
      const label = RESOURCE_LABEL_MAP[reward.resource] ?? reward.resource;
      return `+${reward.amount} ${label} cap`;
    })
    .join(', ');
}

@Component({
  selector: 'app-victory-menu',
  imports: [DecimalPipe, IconComponent, ModalComponent, SweetAlert2Module, VictoryConditionRowComponent],
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
        <div role="tablist" class="tabs tabs-bordered tabs-md mb-3 flex-nowrap overflow-x-auto pb-1">
          @for (path of paths(); track path.id) {
            <button
              role="tab"
              class="tab gap-2"
              [class.tab-active]="selectedPath()?.id === path.id"
              (click)="selectedPathId.set(path.id)"
            >
              <span class="truncate text-xs">{{ path.name }}</span>
              @if (path.isAchieved) {
                <span class="text-success text-xs"><app-icon name="tablerCheck" size="12px" /></span>
              } @else if (path.completedInPriorRun) {
                <span class="text-info text-xs"><app-icon name="tablerCheck" size="12px" /></span>
              } @else {
                <span
                  class="text-xs opacity-70"
                  [class.text-success]="path.isComplete"
                  [class.text-primary]="!path.isComplete"
                >
                  {{ path.completionPercent | number: '1.0-0' }}%
                </span>
              }
            </button>
          }
        </div>

        @if (selectedPath(); as path) {
          <div>
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <h4 class="font-bold text-sm">{{ path.name }}</h4>
              @if (path.isAchieved) {
                <span class="badge badge-success badge-xs">
                  Achieved!
                </span>
              } @else if (path.completedInPriorRun) {
                <span class="badge badge-info badge-xs">
                  Completed (Prior Run)
                </span>
              } @else if (path.isClosest) {
                <span class="badge badge-success badge-xs">Closest</span>
              } @else if (path.isComplete) {
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
            <p class="text-xs opacity-60 mb-1">{{ path.description }}</p>
            @if (path.rewardDescription) {
              <p class="text-xs text-accent mb-3">Reward: {{ path.rewardDescription }}</p>
            }

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

      <div actions class="flex gap-2">
        @if (hasAchievedVictory()) {
          <button class="btn btn-sm btn-success" [swal]="claimResetSwal">
            Claim Victory & Reset
          </button>
        }
        <button class="btn btn-sm btn-ghost" (click)="visible.set(false)">
          Close
        </button>
      </div>
    </app-modal>

    <swal
      #claimResetSwal
      title="Claim Victory & Start New Run?"
      [text]="claimResetText()"
      icon="question"
      confirmButtonText="Claim & Reset"
      cancelButtonText="Not Yet"
      [showCancelButton]="true"
      (confirm)="claimVictoryAndReset()"
    ></swal>
  `,
})
export class VictoryMenuComponent {
  private router = inject(Router);

  public visible = model<boolean>(false);
  public selectedPathId = signal<VictoryPathId | null>(null);
  public claimResetSwal = viewChild<SwalComponent>('claimResetSwal');

  public hasAchievedVictory = victoryIsAchieved;

  public claimResetText = computed(() => {
    const pathId = victoryAchievedPathId();
    if (!pathId) return '';
    const path = contentGetEntry<VictoryPathContent>(pathId);
    if (!path) return '';
    const reward = formatRewardList(path.victoryReward);
    return `Path: ${path.name}\nReward: ${reward}\n\nYour current game will be completely reset. Victory progress and cap boosts are permanent.`;
  });

  public paths = computed<PathViewModel[]>(() => {
    const allPaths = contentGetEntriesByType<VictoryPathContent>('victorypath');
    const progressMap = victoryProgressMap();
    const achievedId = victoryAchievedPathId();
    const resetProgress: VictoryResetProgress = optionsGet(
      'victoryResetProgress',
    ) ?? { completedPathIds: [], totalVictories: 0 };
    const completedSet = new Set(resetProgress.completedPathIds);

    // Hide Master of All when no prior victories
    const isMasterOfAll = (p: VictoryPathContent) =>
      p.conditions.some((c) => c.id.startsWith('master_path_'));
    const filteredPaths =
      completedSet.size === 0
        ? allPaths.filter((p) => !isMasterOfAll(p))
        : allPaths;

    const viewModels: PathViewModel[] = filteredPaths.map((path) => {
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

      const rewardDescription = formatRewardList(path.victoryReward);

      return {
        id: path.id,
        name: path.name,
        description: path.description,
        conditions,
        completionPercent,
        isClosest: false,
        isComplete: progress?.complete ?? false,
        isAchieved: path.id === achievedId,
        completedInPriorRun: completedSet.has(path.id),
        rewardDescription,
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
    return (
      allPaths.find((p) => p.isAchieved) ??
      allPaths.find((p) => p.isClosest) ??
      allPaths[0] ??
      null
    );
  });

  public claimVictoryAndReset(): void {
    analyticsSendDesignEvent('Victory:ClaimReset:FromMenu');
    victoryResetGame();
    this.visible.set(false);
    this.router.navigate(['/setup']);
  }

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
