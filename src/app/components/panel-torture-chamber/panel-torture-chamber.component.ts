import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import { StatRowComponent } from '@components/stat-row/stat-row.component';
import {
  contentGetEntry,
  findRoomByRole,
  gamestate,
  notify,
  PRISONER_ESCAPE_DAYS,
  TORTURE_BREAK_BASE_TICKS,
  TORTURE_EXTRACT_BASE_TICKS,
  TORTURE_INTERROGATE_BASE_TICKS,
  tortureBreakComplete$,
  tortureExtractComplete$,
  tortureInterrogateComplete$,
  updateGamestate,
} from '@helpers';
import { researchUnlockIsFeatureUnlocked } from '@helpers/research-unlocks';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  PrisonerId,
  TortureBreakAction,
  TortureExtractAction,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-torture-chamber',
  imports: [DecimalPipe, InhabitantCardComponent, JobProgressComponent, StatRowComponent],
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

  public roomDef = computed(() => {
    const room = this.tortureRoom();
    if (!room) return undefined;
    return contentGetEntry<RoomContent>(room.roomTypeId);
  });

  public assignedInhabitants = computed(() => {
    const room = this.tortureRoom();
    if (!room) return [];

    const state = gamestate();
    const mapped = state.world.inhabitants
      .filter((i) => i.assignedRoomId === room.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(i.definitionId);
        return { instance: i, def };
      })
      .filter((e): e is typeof e & { def: InhabitantContent } => e.def !== undefined);
    return sortBy(mapped, [(e) => e.def.name]);
  });

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
    const room = this.tortureRoom();
    if (!room) return;

    await updateGamestate((state) => {
      for (const flr of state.world.floors) {
        const target = flr.rooms.find((r) => r.id === room.id);
        if (target) {
          target.tortureJob = {
            prisonerId,
            currentStage: 'interrogate',
            ticksRemaining: TORTURE_INTERROGATE_BASE_TICKS,
            targetTicks: TORTURE_INTERROGATE_BASE_TICKS,
          };
          break;
        }
      }
      return state;
    });
  }

  public async setExtractAction(action: TortureExtractAction): Promise<void> {
    const room = this.tortureRoom();
    if (!room?.tortureJob) return;

    await updateGamestate((state) => {
      for (const flr of state.world.floors) {
        const target = flr.rooms.find((r) => r.id === room.id);
        if (target?.tortureJob && target.tortureJob.currentStage === 'extract') {
          target.tortureJob.stageAction = action;
          target.tortureJob.ticksRemaining = TORTURE_EXTRACT_BASE_TICKS;
          target.tortureJob.targetTicks = TORTURE_EXTRACT_BASE_TICKS;
          break;
        }
      }
      return state;
    });
  }

  public async setBreakAction(action: TortureBreakAction): Promise<void> {
    const room = this.tortureRoom();
    if (!room?.tortureJob) return;

    await updateGamestate((state) => {
      for (const flr of state.world.floors) {
        const target = flr.rooms.find((r) => r.id === room.id);
        if (target?.tortureJob && target.tortureJob.currentStage === 'break') {
          target.tortureJob.stageAction = action;
          target.tortureJob.ticksRemaining = TORTURE_BREAK_BASE_TICKS;
          target.tortureJob.targetTicks = TORTURE_BREAK_BASE_TICKS;
          break;
        }
      }
      return state;
    });
  }
}
