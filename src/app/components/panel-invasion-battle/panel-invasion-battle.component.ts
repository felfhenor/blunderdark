import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { KeyValuePipe } from '@angular/common';
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
  CapturedPrisoner,
  InvasionOrchestratorResult,
  PrisonerAction,
  PrisonerHandlingResult,
} from '@interfaces';

type BattlePhase = 'results' | 'rewards' | 'prisoners';

@Component({
  selector: 'app-panel-invasion-battle',
  imports: [KeyValuePipe, ModalComponent],
  templateUrl: './panel-invasion-battle.component.html',
  styleUrl: './panel-invasion-battle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelInvasionBattleComponent {
  public visible = signal(false);
  public phase = signal<BattlePhase>('results');
  public result = signal<InvasionOrchestratorResult | undefined>(undefined);
  public prisonersRemaining = signal<CapturedPrisoner[]>([]);
  public prisonerResults = signal<Map<string, PrisonerHandlingResult>>(new Map());
  public rewardsApplied = signal(false);

  private currentInvasion: ActiveInvasion | undefined;

  public isVictory = computed(() => this.result()?.detailedResult.outcome === 'victory');

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

  public async handlePrisoner(prisoner: CapturedPrisoner, action: PrisonerAction): Promise<void> {
    const handlingResult = await invasionRewardApplyPrisonerAction(prisoner, action);

    this.prisonerResults.update((map) => {
      const next = new Map(map);
      next.set(prisoner.id, handlingResult);
      return next;
    });

    this.prisonersRemaining.update((list) => list.filter((p) => p.id !== prisoner.id));
  }

  public dismiss(): void {
    const invasion = this.currentInvasion;
    if (invasion) {
      updateGamestate((state) => {
        invasionTriggerRecordAndReschedule(state, {
          day: invasion.day,
          type: invasion.invasionType,
        });
        state.world.activeInvasion = undefined;
        return state;
      });
    }

    this.visible.set(false);
    this.currentInvasion = undefined;
  }

  public getPrisonerActionLabel(action: PrisonerAction): string {
    const labels: Record<PrisonerAction, string> = {
      execute: 'Execute',
      ransom: 'Ransom',
      convert: 'Convert',
      sacrifice: 'Sacrifice',
      experiment: 'Experiment',
    };
    return labels[action];
  }

  public getPrisonerActionDescription(action: PrisonerAction): string {
    const descriptions: Record<PrisonerAction, string> = {
      execute: '+2 Fear, +1 Reputation',
      ransom: 'Gold based on class',
      convert: 'Chance to join, +5 Corruption',
      sacrifice: 'Random boon, +5 Corruption',
      experiment: 'Research points, +3 Corruption',
    };
    return descriptions[action];
  }

  public readonly prisonerActions: PrisonerAction[] = [
    'execute',
    'ransom',
    'convert',
    'sacrifice',
    'experiment',
  ];
}
