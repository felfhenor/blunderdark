import { findRoomOnFloor } from '@helpers/floor';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { reputationAwardInPlace } from '@helpers/reputation';
import { roomRoleFindById } from '@helpers/room-roles';
import { updateGamestate } from '@helpers/state-game';
import type {
  GameState,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  TraitRune,
  TraitRuneInstanceId,
} from '@interfaces';
import { Subject } from 'rxjs';

// --- Constants ---

export const RUNEWORKING_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 5; // 5 min

// --- RxJS Subjects ---

export type RuneworkingCompleteEvent = {
  inhabitantName: string;
  runeName: string;
};

const runeworkingCompleteSubject = new Subject<RuneworkingCompleteEvent>();
export const runeworkingComplete$ = runeworkingCompleteSubject.asObservable();

// --- Pure helpers ---

/**
 * Check if a runeworking job can be started.
 */
export async function runeworkingStartJob(
  roomId: PlacedRoomId,
  runeId: TraitRuneInstanceId,
  inhabitantInstanceId: InhabitantInstanceId,
): Promise<void> {
  await updateGamestate((state) => {
    for (const flr of state.world.floors) {
      const target = findRoomOnFloor(flr, roomId);
      if (target) {
        target.runeworkingJob = {
          runeId,
          inhabitantInstanceId,
          ticksRemaining: RUNEWORKING_BASE_TICKS,
          targetTicks: RUNEWORKING_BASE_TICKS,
        };
        break;
      }
    }
    return state;
  });
}

export function runeworkingCanStart(
  room: PlacedRoom,
  inhabitants: InhabitantInstance[],
  runes: TraitRune[],
  targetInhabitant: InhabitantInstance | undefined,
): boolean {
  if (room.runeworkingJob) return false;
  const hasWorker = inhabitants.some((i) => i.assignedRoomId === room.id);
  if (!hasWorker) return false;
  if (runes.length === 0) return false;
  if (!targetInhabitant) return false;
  if (targetInhabitant.equippedRuneId) return false;
  return true;
}

/**
 * Process all Runeworking rooms each tick.
 */
export function runeworkingProcess(state: GameState, numTicks = 1): void {
  const runeworkingTypeId = roomRoleFindById('runeworking');
  if (!runeworkingTypeId) return;

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== runeworkingTypeId) continue;
      if (!room.runeworkingJob) continue;

      const hasWorker = state.world.inhabitants.some(
        (i) => i.assignedRoomId === room.id,
      );
      if (!hasWorker) continue;

      room.runeworkingJob.ticksRemaining -= numTicks;

      if (room.runeworkingJob.ticksRemaining <= 0) {
        const job = room.runeworkingJob;

        // Find the rune and inhabitant
        const runeIndex = state.world.traitRunes.findIndex(
          (r) => r.id === job.runeId,
        );
        const inhabitant = state.world.inhabitants.find(
          (i) => i.instanceId === job.inhabitantInstanceId,
        );

        if (runeIndex >= 0 && inhabitant) {
          const rune = state.world.traitRunes[runeIndex];

          // Embed rune
          inhabitant.equippedRuneId = job.runeId as TraitRuneInstanceId;

          // Remove rune from inventory
          state.world.traitRunes.splice(runeIndex, 1);

          reputationAwardInPlace(state, 'embed_rune');

          runeworkingCompleteSubject.next({
            inhabitantName: inhabitant.name,
            runeName: rune.sourceInvaderClass,
          });
        }

        room.runeworkingJob = undefined;
      }
    }
  }
}
