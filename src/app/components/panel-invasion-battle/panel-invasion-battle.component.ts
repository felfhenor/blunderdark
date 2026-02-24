import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { InvasionPrisonersPhaseComponent } from '@components/invasion-prisoners-phase/invasion-prisoners-phase.component';
import { InvasionResultsPhaseComponent } from '@components/invasion-results-phase/invasion-results-phase.component';
import { InvasionRewardsPhaseComponent } from '@components/invasion-rewards-phase/invasion-rewards-phase.component';
import { InvasionPhaseTitleComponent } from '@components/invasion-phase-title/invasion-phase-title.component';
import { ModalComponent } from '@components/modal/modal.component';
import {
  invasionRewardApplyDefeat,
  invasionRewardApplyPrisonerAction,
  invasionRewardApplyVictory,
} from '@helpers/invasion-reward-apply';
import { invasionTriggerRecordAndReschedule } from '@helpers/invasion-triggers';
import { updateGamestate } from '@helpers/state-game';
import type {
  ActiveInvasion,
  BattlePhase,
  CapturedPrisoner,
  InvasionOrchestratorResult,
  PrisonerAction,
  PrisonerHandlingResult,
} from '@interfaces';

@Component({
  selector: 'app-panel-invasion-battle',
  imports: [
    ModalComponent,
    InvasionResultsPhaseComponent,
    InvasionRewardsPhaseComponent,
    InvasionPrisonersPhaseComponent,
    InvasionPhaseTitleComponent,
  ],
  templateUrl: './panel-invasion-battle.component.html',
  styleUrl: './panel-invasion-battle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelInvasionBattleComponent {
  public visible = signal(false);
  public phase = signal<BattlePhase>('results');
  public result = signal<InvasionOrchestratorResult | undefined>(undefined);
  public prisonersRemaining = signal<CapturedPrisoner[]>([]);
  public prisonerResults = signal<Map<string, PrisonerHandlingResult>>(
    new Map(),
  );
  public rewardsApplied = signal(false);

  private currentInvasion: ActiveInvasion | undefined;

  public isVictory = computed(
    () => this.result()?.detailedResult.outcome === 'victory',
  );

  public showResults(invasion: ActiveInvasion): void {
    if (!invasion.result) return;

    this.currentInvasion = invasion;
    this.phase.set('results');
    this.result.set(invasion.result);
    this.prisonersRemaining.set([...invasion.result.capturedPrisoners]);
    this.prisonerResults.set(new Map());
    this.rewardsApplied.set(false);
    this.visible.set(true);
  }

  public async advancePhase(): Promise<void> {
    const current = this.phase();

    if (current === 'results') {
      // Apply rewards/penalties
      const res = this.result();
      if (res && !this.rewardsApplied()) {
        if (res.detailedResult.outcome === 'victory') {
          await invasionRewardApplyVictory(res);
        } else {
          await invasionRewardApplyDefeat(res);
        }
        this.rewardsApplied.set(true);
      }

      this.phase.set('rewards');
      return;
    }

    if (current === 'rewards') {
      if (this.prisonersRemaining().length > 0) {
        this.phase.set('prisoners');
      } else {
        this.dismiss();
      }
      return;
    }

    if (current === 'prisoners') {
      this.dismiss();
    }
  }

  public async handlePrisoner(
    prisoner: CapturedPrisoner,
    action: PrisonerAction,
  ): Promise<void> {
    const handlingResult = await invasionRewardApplyPrisonerAction(
      prisoner,
      action,
    );

    this.prisonerResults.update((map) => {
      const next = new Map(map);
      next.set(prisoner.id, handlingResult);
      return next;
    });

    this.prisonersRemaining.update((list) =>
      list.filter((p) => p.id !== prisoner.id),
    );
  }

  public dismiss(): void {
    const invasion = this.currentInvasion;
    if (invasion) {
      updateGamestate((state) => {
        invasionTriggerRecordAndReschedule(state, {
          day: invasion.day,
          type: invasion.invasionType,
          unreachableObjectiveCount: invasion.unreachableObjectiveCount ?? 0,
        });
        state.world.activeInvasion = undefined;
        return state;
      });
    }

    this.visible.set(false);
    this.currentInvasion = undefined;
  }
}
