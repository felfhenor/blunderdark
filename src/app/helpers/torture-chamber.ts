import { contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { rngRandom, rngUuid } from '@helpers/rng';
import { roomRoleFindById } from '@helpers/room-roles';
import type {
  CapturedPrisoner,
  GameState,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  ResourceType,
  TraitRune,
  TraitRuneInstanceId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { TraitRuneContent } from '@interfaces/content-traitrune';
import type {
  InterrogationBuff,
  TortureBreakAction,
  TortureBreakCompleteEvent,
  TortureExtractAction,
  TortureExtractCompleteEvent,
  TortureInterrogateCompleteEvent,
} from '@interfaces/torture';
import { Subject } from 'rxjs';

// --- Constants ---

export const TORTURE_INTERROGATE_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 3; // 3 min
export const TORTURE_EXTRACT_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 4; // 4 min
export const TORTURE_BREAK_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 4; // 4 min
export const TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING = 0.12;
export const TORTURE_BREAK_CONVERT_SUCCESS_RATE = 0.8;
export const PRISONER_ESCAPE_DAYS = 3;

const BROKEN_PRISONER_NAME = 'Broken Prisoner';

// --- RxJS Subjects ---

const tortureInterrogateCompleteSubject =
  new Subject<TortureInterrogateCompleteEvent>();
export const tortureInterrogateComplete$ =
  tortureInterrogateCompleteSubject.asObservable();

const tortureExtractCompleteSubject =
  new Subject<TortureExtractCompleteEvent>();
export const tortureExtractComplete$ =
  tortureExtractCompleteSubject.asObservable();

const tortureBreakCompleteSubject =
  new Subject<TortureBreakCompleteEvent>();
export const tortureBreakComplete$ =
  tortureBreakCompleteSubject.asObservable();

// --- Pure helpers ---

/**
 * Check if a torture job can be started in this room.
 */
export function tortureCanStart(
  room: PlacedRoom,
  inhabitants: InhabitantInstance[],
  prisoners: CapturedPrisoner[],
): boolean {
  if (room.tortureJob) return false;
  const hasWorker = inhabitants.some((i) => i.assignedRoomId === room.id);
  if (!hasWorker) return false;
  return prisoners.length > 0;
}

/**
 * Calculate research gained from extracting a prisoner.
 */
export function tortureCalculateExtractionReward(
  prisoner: CapturedPrisoner,
): number {
  const { hp, attack, defense, speed } = prisoner.stats;
  return Math.round((hp + attack + defense + speed) / 3);
}

/**
 * Calculate interrogation buff values from a prisoner's stats.
 * Formula: (HP + ATK + DEF + SPD) / 10 as both attackBonusPercent and defenseBonusPercent.
 */
export function tortureCalculateInterrogationBuff(
  prisoner: CapturedPrisoner,
): InterrogationBuff {
  const total =
    prisoner.stats.hp +
    prisoner.stats.attack +
    prisoner.stats.defense +
    prisoner.stats.speed;
  const bonusPercent = total / 10;
  return {
    attackBonusPercent: bonusPercent,
    defenseBonusPercent: bonusPercent,
    sourceInvaderClass: prisoner.invaderClass,
  };
}

/**
 * Sum all stacked interrogation buffs into a single total.
 */
export function interrogationBuffGetTotals(
  buffs: InterrogationBuff[],
): { attackBonusPercent: number; defenseBonusPercent: number } {
  let attackBonusPercent = 0;
  let defenseBonusPercent = 0;
  for (const buff of buffs) {
    attackBonusPercent += buff.attackBonusPercent;
    defenseBonusPercent += buff.defenseBonusPercent;
  }
  return { attackBonusPercent, defenseBonusPercent };
}

/**
 * Create a Broken Prisoner inhabitant from a prisoner (Break → Convert path).
 * Tier-2 with 33% of prisoner's original stats as instanceStatBonuses (floored).
 */
export function tortureCreateBrokenInhabitant(
  prisoner: CapturedPrisoner,
): InhabitantInstance | undefined {
  const def = contentGetEntry<InhabitantContent>(BROKEN_PRISONER_NAME);
  if (!def) return undefined;

  return {
    instanceId: rngUuid<InhabitantInstanceId>(),
    definitionId: def.id,
    name: `${prisoner.name} (Broken)`,
    state: 'normal',
    assignedRoomId: undefined,
    instanceStatBonuses: {
      attack: Math.floor(prisoner.stats.attack * 0.33),
      defense: Math.floor(prisoner.stats.defense * 0.33),
      speed: Math.floor(prisoner.stats.speed * 0.33),
    },
  };
}

/**
 * Create a TraitRune from a prisoner's invader class.
 */
export function tortureCreateTraitRune(
  prisoner: CapturedPrisoner,
): TraitRune | undefined {
  const allRunes =
    contentGetEntry<TraitRuneContent>('traitrune') !== undefined;

  // Look up the rune definition by iterating content for the matching invader class
  // We use the naming convention: "{Class}'s Rune"
  const className =
    prisoner.invaderClass.charAt(0).toUpperCase() +
    prisoner.invaderClass.slice(1);
  const runeName = `${className}'s Rune`;
  const runeDef = contentGetEntry<TraitRuneContent>(runeName);
  if (!runeDef && !allRunes) return undefined;
  if (!runeDef) return undefined;

  return {
    id: rngUuid<TraitRuneInstanceId>(),
    runeTypeId: runeDef.id,
    sourceInvaderClass: prisoner.invaderClass,
  };
}

/**
 * Process prisoner escapes. Prisoners escape after PRISONER_ESCAPE_DAYS days
 * unless they are currently being processed in a Torture Chamber.
 * Returns names of escaped prisoners for notifications.
 */
export function prisonerEscapeProcess(state: GameState): string[] {
  const currentDay = state.clock.day;

  // Collect prisoner IDs currently being processed
  const processingPrisonerIds = new Set<string>();
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.tortureJob) {
        processingPrisonerIds.add(room.tortureJob.prisonerId);
      }
    }
  }

  const escaped: string[] = [];
  state.world.prisoners = state.world.prisoners.filter((prisoner) => {
    if (processingPrisonerIds.has(prisoner.id)) return true;
    if (currentDay - prisoner.captureDay >= PRISONER_ESCAPE_DAYS) {
      escaped.push(prisoner.name);
      return false;
    }
    return true;
  });

  return escaped;
}

// --- Tick processor ---

/**
 * Process all Torture Chamber rooms each tick.
 * Called inside updateGamestate — mutates state in-place.
 *
 * The 3-stage pipeline works as follows:
 * 1. Interrogate: always runs, no choice. On completion → advance to 'extract' stage with ticksRemaining = 0 (paused, waiting for player choice)
 * 2. Extract: player sets stageAction ('research' or 'rune'), which starts the timer
 * 3. Break: player sets stageAction ('convert', 'execute', or 'sacrifice'), which starts the timer
 *
 * When ticksRemaining reaches 0 and stageAction is set, the stage completes.
 * When ticksRemaining reaches 0 and stageAction is NOT set, the job is paused waiting for player input.
 */
export function tortureChamberProcess(state: GameState, numTicks = 1): void {
  const tortureChamberTypeId = roomRoleFindById('tortureChamber');
  if (!tortureChamberTypeId) return;

  let inhabitantsChanged = false;

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== tortureChamberTypeId) continue;
      if (!room.tortureJob) continue;

      // Skip rooms without assigned workers
      const hasWorker = state.world.inhabitants.some(
        (i) => i.assignedRoomId === room.id,
      );
      if (!hasWorker) continue;

      const job = room.tortureJob;

      // If we're in a stage waiting for player choice, don't process
      if (job.ticksRemaining <= 0 && job.currentStage !== 'interrogate' && !job.stageAction) {
        continue;
      }

      // Only decrement if ticks remain
      if (job.ticksRemaining > 0) {
        job.ticksRemaining -= numTicks;

        // Add corruption while actively processing
        state.world.resources.corruption.current +=
          TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING * numTicks;
      }

      // Check for stage completion
      if (job.ticksRemaining <= 0) {
        const prisoner = state.world.prisoners.find(
          (p) => p.id === job.prisonerId,
        );
        if (!prisoner) {
          room.tortureJob = undefined;
          continue;
        }

        if (job.currentStage === 'interrogate') {
          // Stage 1 complete: always produces buff
          const buff = tortureCalculateInterrogationBuff(prisoner);
          state.world.interrogationBuffs.push(buff);

          tortureInterrogateCompleteSubject.next({
            roomId: room.id,
            prisonerName: prisoner.name,
            attackBonusPercent: buff.attackBonusPercent,
            defenseBonusPercent: buff.defenseBonusPercent,
          });

          // Advance to extract stage, paused (no stageAction yet)
          job.currentStage = 'extract';
          job.stageAction = undefined;
          job.ticksRemaining = 0;
          job.targetTicks = TORTURE_EXTRACT_BASE_TICKS;
        } else if (job.currentStage === 'extract' && job.stageAction) {
          // Stage 2 complete
          const action = job.stageAction as TortureExtractAction;

          if (action === 'research') {
            const researchGained = tortureCalculateExtractionReward(prisoner);
            state.world.resources.research.current += researchGained;

            tortureExtractCompleteSubject.next({
              roomId: room.id,
              prisonerName: prisoner.name,
              action: 'research',
              researchGained,
            });
          } else {
            // rune
            const rune = tortureCreateTraitRune(prisoner);
            if (rune) {
              state.world.traitRunes.push(rune);
            }

            tortureExtractCompleteSubject.next({
              roomId: room.id,
              prisonerName: prisoner.name,
              action: 'rune',
              runeTypeId: rune?.runeTypeId,
            });
          }

          // Advance to break stage, paused
          job.currentStage = 'break';
          job.stageAction = undefined;
          job.ticksRemaining = 0;
          job.targetTicks = TORTURE_BREAK_BASE_TICKS;
        } else if (job.currentStage === 'break' && job.stageAction) {
          // Stage 3 complete — prisoner's final fate
          const action = job.stageAction as TortureBreakAction;

          if (action === 'convert') {
            const rng = rngRandom();
            const success = rng() < TORTURE_BREAK_CONVERT_SUCCESS_RATE;

            if (success) {
              const newInhabitant = tortureCreateBrokenInhabitant(prisoner);
              if (newInhabitant) {
                state.world.inhabitants = [
                  ...state.world.inhabitants,
                  newInhabitant,
                ];
                inhabitantsChanged = true;

                tortureBreakCompleteSubject.next({
                  roomId: room.id,
                  prisonerName: prisoner.name,
                  action: 'convert',
                  success: true,
                  inhabitantName: newInhabitant.name,
                });
              }
            } else {
              tortureBreakCompleteSubject.next({
                roomId: room.id,
                prisonerName: prisoner.name,
                action: 'convert',
                success: false,
              });
            }
          } else if (action === 'execute') {
            // +2 fear, +1 terror reputation
            state.world.reputation.terror += 1;

            tortureBreakCompleteSubject.next({
              roomId: room.id,
              prisonerName: prisoner.name,
              action: 'execute',
              fearGained: 2,
            });
          } else {
            // sacrifice — random boon
            const rng = rngRandom();
            const boonTypes: ResourceType[] = ['flux', 'essence', 'research'];
            const boonIndex = Math.floor(rng() * boonTypes.length);
            const boonResource = boonTypes[boonIndex];
            const boonAmount = Math.round(10 + rng() * 15);

            state.world.resources[boonResource].current += boonAmount;

            tortureBreakCompleteSubject.next({
              roomId: room.id,
              prisonerName: prisoner.name,
              action: 'sacrifice',
              resourceGained: { type: boonResource, amount: boonAmount },
            });
          }

          // Remove prisoner and clear job
          state.world.prisoners = state.world.prisoners.filter(
            (p) => p.id !== job.prisonerId,
          );
          room.tortureJob = undefined;
        }
      }
    }
  }

  // Sync floor inhabitants if any changed
  if (inhabitantsChanged) {
    for (const flr of state.world.floors) {
      flr.inhabitants = state.world.inhabitants;
    }
  }
}
