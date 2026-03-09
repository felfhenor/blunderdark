import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { AssignedWorkersListComponent } from '@components/assigned-workers-list/assigned-workers-list.component';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import { StatRowComponent } from '@components/stat-row/stat-row.component';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import {
  findRoomByRole,
  gamestate,
  getAssignedInhabitantsWithDefs,
  notify,
  PRISONER_ESCAPE_DAYS,
  roomDefFromRoom,
  TORTURE_BREAK_BASE_TICKS,
  TORTURE_EXTRACT_BASE_TICKS,
  TORTURE_INTERROGATE_BASE_TICKS,
  tortureBreakComplete$,
  tortureExtractComplete$,
  tortureInterrogateComplete$,
  tortureSetBreakAction,
  tortureSetExtractAction,
  tortureStartProcessing,
} from '@helpers';
import { researchUnlockIsFeatureUnlocked } from '@helpers/research-unlocks';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  PrisonerId,
  TortureBreakAction,
  TortureExtractAction,
} from '@interfaces';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-torture-chamber',
  imports: [AssignedWorkersListComponent, DecimalPipe, JobProgressComponent, SFXDirective, StatRowComponent],
  templateUrl: './panel-torture-chamber.component.html',
  styleUrl: './panel-torture-chamber.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelTortureChamberComponent {
  private subscriptions = [
    tortureInterrogateComplete$.subscribe((evt) => {
      notify('Torture', `${evt.prisonerName}: Interrogation complete! +${evt.attackBonusPercent.toFixed(2)}% ATK, +${evt.defenseBonusPercent.toFixed(2)}% DEF buff`);
    }),
    tortureExtractComplete$.subscribe((evt) => {
      if (evt.action === 'research') {
        notify('Torture', `${evt.prisonerName}: Extracted ${evt.researchGained?.toFixed(2) ?? 0} research points`);
      } else {
        notify('Torture', `${evt.prisonerName}: Trait rune extracted`);
      }
    }),
    tortureBreakComplete$.subscribe((evt) => {
      if (evt.action === 'convert') {
        if (evt.success) {
          notify('Torture', `${evt.prisonerName}: Conversion successful! ${evt.inhabitantName} has joined your dungeon`);
        } else {
          notify('Torture', `${evt.prisonerName}: Conversion failed`);
        }
      } else if (evt.action === 'execute') {
        notify('Torture', `${evt.prisonerName}: Executed. +${evt.fearGained} Fear, +1 Terror reputation`);
      } else if (evt.action === 'sacrifice' && evt.resourceGained) {
        notify('Torture', `${evt.prisonerName}: Sacrificed. Gained ${evt.resourceGained.amount} ${evt.resourceGained.type}`);
      }
    }),
  ];

  public tortureRoom = computed(() => {
    return findRoomByRole('tortureChamber')?.room;
  });

  public roomDef = roomDefFromRoom(this.tortureRoom);

  public assignedInhabitants = computed(() =>
    getAssignedInhabitantsWithDefs(this.tortureRoom()?.id),
  );

  public availablePrisoners = computed(() => {
    const room = this.tortureRoom();
    if (!room || room.tortureJob) return [];

    const state = gamestate();
    const currentDay = state.clock.day;

    return sortBy(
      state.world.prisoners.map((p) => ({
        ...p,
        daysRemaining: Math.max(0, PRISONER_ESCAPE_DAYS - (currentDay - p.captureDay)),
      })),
      [(p) => p.daysRemaining, (p) => p.name],
    );
  });

  public tortureJob = computed(() => {
    const room = this.tortureRoom();
    if (!room?.tortureJob) return undefined;
    const job = room.tortureJob;
    const elapsed = job.targetTicks - job.ticksRemaining;
    const percent = job.targetTicks > 0
      ? Math.min(100, Math.round((elapsed / job.targetTicks) * 100))
      : 100;
    const prisoner = gamestate().world.prisoners.find((p) => p.id === job.prisonerId);
    const isWaitingForChoice = job.ticksRemaining <= 0 && job.currentStage !== 'interrogate' && !job.stageAction;
    return {
      ...job,
      percent,
      prisonerName: prisoner?.name ?? 'Unknown',
      prisonerClass: prisoner?.invaderClass ?? 'warrior',
      isWaitingForChoice,
      isProcessing: !isWaitingForChoice && job.ticksRemaining > 0,
    };
  });

  public canStartJob = computed(() => {
    const room = this.tortureRoom();
    if (!room || room.tortureJob) return false;
    const hasWorker = this.assignedInhabitants().length > 0;
    const hasPrisoners = gamestate().world.prisoners.length > 0;
    return hasWorker && hasPrisoners;
  });

  public runeExtractionUnlocked = computed(() => {
    return researchUnlockIsFeatureUnlocked('rune_extraction');
  });

  public getInterrogateTime(): number {
    return ticksToRealSeconds(TORTURE_INTERROGATE_BASE_TICKS);
  }

  public getExtractTime(): number {
    return ticksToRealSeconds(TORTURE_EXTRACT_BASE_TICKS);
  }

  public getBreakTime(): number {
    return ticksToRealSeconds(TORTURE_BREAK_BASE_TICKS);
  }

  public async startProcessing(prisonerId: PrisonerId): Promise<void> {
    analyticsSendDesignEvent('Room:Torture:Process:Start');
    const room = this.tortureRoom();
    if (!room) return;

    await tortureStartProcessing(room.id, prisonerId);
  }

  public async setExtractAction(action: TortureExtractAction): Promise<void> {
    analyticsSendDesignEvent('Room:Torture:Extract:' + (action === 'research' ? 'Research' : 'Rune'));
    const room = this.tortureRoom();
    if (!room?.tortureJob) return;

    await tortureSetExtractAction(room.id, action);
  }

  public async setBreakAction(action: TortureBreakAction): Promise<void> {
    analyticsSendDesignEvent('Room:Torture:Break:' + action.charAt(0).toUpperCase() + action.slice(1));
    const room = this.tortureRoom();
    if (!room?.tortureJob) return;

    await tortureSetBreakAction(room.id, action);
  }
}
