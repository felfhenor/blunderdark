import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import { ModalComponent } from '@components/modal/modal.component';
import { contentGetEntry } from '@helpers/content';
import { floorAll } from '@helpers/floor';
import { RESOURCE_LABEL_MAP } from '@helpers/resource-icons';
import { gamestate, gamestateSave } from '@helpers/state-game';
import { optionsSet } from '@helpers/state-options';
import {
  victoryAchievedPathId,
  victoryDismissPanel,
  victoryGetProgress,
  victoryResetGame,
  victoryShowPanel,
} from '@helpers/victory';
import type {
  VictoryPathContent,
} from '@interfaces';
import type { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-panel-victory',
  imports: [DecimalPipe, ModalComponent, SweetAlert2Module],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [(visible)]="visible"
      [allowEscToClose]="false"
      [showCloseButton]="true"
      widthClass="max-w-2xl"
      (modalClose)="continuePlaying()"
    >
      <div title class="text-xl">Victory Achieved!</div>

      <div body>
        @if (achievedPath(); as path) {
          <div class="text-center mb-4">
            <h2 class="text-2xl font-bold text-success">{{ path.name }}</h2>
            <p class="text-sm opacity-70 mt-1">{{ path.description }}</p>
          </div>

          <div class="divider my-2">Conditions</div>

          <ul class="space-y-2">
            @for (cond of conditionDetails(); track cond.id) {
              <li class="flex items-center gap-2">
                <span
                  class="text-lg"
                  [class.text-success]="cond.met"
                  [class.opacity-30]="!cond.met"
                >
                  {{ cond.met ? '\u2714' : '\u2610' }}
                </span>
                <span class="flex-1 text-sm">{{ cond.description }}</span>
                <span class="text-xs opacity-60">
                  {{ cond.currentValue | number: '1.0-0' }} / {{ cond.target | number: '1.0-0' }}
                </span>
              </li>
            }
          </ul>

          <div class="divider my-2">Statistics</div>

          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="flex justify-between">
              <span class="opacity-70">Days Survived</span>
              <span>{{ stats().day }}</span>
            </div>
            <div class="flex justify-between">
              <span class="opacity-70">Total Floors</span>
              <span>{{ stats().floors }}</span>
            </div>
            <div class="flex justify-between">
              <span class="opacity-70">Total Inhabitants</span>
              <span>{{ stats().inhabitants }}</span>
            </div>
            <div class="flex justify-between">
              <span class="opacity-70">Total Rooms</span>
              <span>{{ stats().rooms }}</span>
            </div>
            <div class="flex justify-between">
              <span class="opacity-70">Invasions Repelled</span>
              <span>{{ stats().invasionsRepelled }}</span>
            </div>
            <div class="flex justify-between">
              <span class="opacity-70">Research Completed</span>
              <span>{{ stats().researchCompleted }}</span>
            </div>
          </div>

          @if (rewardDescription(); as reward) {
            <div class="divider my-2">Victory Reward</div>
            <p class="text-sm text-center text-accent font-semibold">{{ reward }}</p>
          }
        }
      </div>

      <div actions class="flex gap-2">
        <button class="btn btn-primary" (click)="continuePlaying()">
          Continue Playing
        </button>
        <button class="btn btn-success" [swal]="claimResetSwal">
          Claim Victory & Reset
        </button>
        <button class="btn btn-ghost" (click)="returnToMenu()">
          Return to Menu
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
export class PanelVictoryComponent {
  private router = inject(Router);

  public visible = model<boolean>(false);

  public claimResetSwal = viewChild<SwalComponent>('claimResetSwal');

  public achievedPath = computed(() => {
    const pathId = victoryAchievedPathId();
    if (!pathId) return undefined;
    return contentGetEntry<VictoryPathContent>(pathId);
  });

  public rewardDescription = computed(() => {
    const path = this.achievedPath();
    if (!path?.victoryReward?.length) return undefined;
    return path.victoryReward
      .map((reward) => {
        const label = RESOURCE_LABEL_MAP[reward.resource] ?? reward.resource;
        return `+${reward.amount} ${label} cap`;
      })
      .join(', ');
  });

  public claimResetText = computed(() => {
    const path = this.achievedPath();
    if (!path) return '';
    const reward = this.rewardDescription() ?? '';
    return `Path: ${path.name}\nReward: ${reward}\n\nYour current game will be completely reset. Victory progress and cap boosts are permanent.`;
  });

  public conditionDetails = computed(() => {
    const pathId = victoryAchievedPathId();
    if (!pathId) return [];

    const path = contentGetEntry<VictoryPathContent>(pathId);
    const progress = victoryGetProgress(pathId);
    if (!path || !progress) return [];

    return path.conditions.map((cond) => {
      const condProgress = progress.conditions.find(
        (c) => c.conditionId === cond.id,
      );
      return {
        id: cond.id,
        description: cond.description,
        target: cond.target,
        currentValue: condProgress?.currentValue ?? 0,
        met: condProgress?.met ?? false,
      };
    });
  });

  public stats = computed(() => {
    const state = gamestate();
    const floors = floorAll();
    const totalRooms = floors.reduce(
      (sum, f) => sum + f.rooms.length,
      0,
    );

    return {
      day: state.clock.day,
      floors: floors.length,
      inhabitants: state.world.inhabitants.length,
      rooms: totalRooms,
      invasionsRepelled: state.world.victoryProgress.totalInvasionDefenseWins,
      researchCompleted: state.world.research.completedNodes.length,
    };
  });

  constructor() {
    effect(() => {
      if (victoryShowPanel()) {
        untracked(() => {
          optionsSet('gameloopPaused', true);
          this.visible.set(true);
        });
      }
    });
  }

  public continuePlaying(): void {
    analyticsSendDesignEvent('Victory:Continue');
    victoryDismissPanel();
    this.visible.set(false);
    optionsSet('gameloopPaused', false);
  }

  public claimVictoryAndReset(): void {
    analyticsSendDesignEvent('Victory:ClaimReset');
    victoryResetGame();
    this.visible.set(false);
    this.router.navigate(['/setup']);
  }

  public returnToMenu(): void {
    this.visible.set(false);
    gamestateSave();
    this.router.navigate(['..']);
  }
}
