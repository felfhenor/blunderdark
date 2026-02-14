import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { rngRandom, rngUuid } from '@helpers/rng';
import { roomRoleFindById } from '@helpers/room-roles';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import type {
  CapturedPrisoner,
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  InvaderClassType,
  PlacedRoom,
} from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';
import type {
  TortureConversionCompleteEvent,
  TortureExtractionCompleteEvent,
} from '@interfaces/torture';
import { Subject } from 'rxjs';

// --- Constants ---

export const TORTURE_EXTRACTION_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 4; // 20 ticks
export const TORTURE_CONVERSION_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 8; // 40 ticks
export const TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING = 0.12;

export const TORTURE_CONVERT_SUCCESS_RATES: Record<InvaderClassType, number> = {
  warrior: 0.3,
  rogue: 0.5,
  mage: 0.2,
  cleric: 0.1,
  paladin: 0.05,
  ranger: 0.35,
};

export const CONVERTED_PRISONER_DEF_ID = '1df0572f-4dc5-4ba8-9c4d-d1df84f58979';

const tortureExtractionCompleteSubject =
  new Subject<TortureExtractionCompleteEvent>();
export const tortureExtractionComplete$ =
  tortureExtractionCompleteSubject.asObservable();

const tortureConversionCompleteSubject =
  new Subject<TortureConversionCompleteEvent>();
export const tortureConversionComplete$ =
  tortureConversionCompleteSubject.asObservable();

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
 * Calculate extraction ticks (base * upgrade multiplier * adjacency speed bonus).
 */
export function tortureGetExtractionTicks(
  placedRoom: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
): number {
  let ticks = TORTURE_EXTRACTION_BASE_TICKS;

  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  for (const effect of effects) {
    if (effect.type === 'tortureSpeedMultiplier') {
      ticks = Math.round(ticks * effect.value);
    }
  }

  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.tortureAdjacencyEffects?.tortureSpeedBonus) {
      ticks = Math.round(
        ticks * (1 - adjDef.tortureAdjacencyEffects.tortureSpeedBonus),
      );
    }
  }

  return Math.max(1, ticks);
}

/**
 * Calculate conversion ticks (base * upgrade multiplier * adjacency speed bonus).
 */
export function tortureGetConversionTicks(
  placedRoom: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
): number {
  let ticks = TORTURE_CONVERSION_BASE_TICKS;

  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  for (const effect of effects) {
    if (effect.type === 'tortureSpeedMultiplier') {
      ticks = Math.round(ticks * effect.value);
    }
  }

  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.tortureAdjacencyEffects?.tortureSpeedBonus) {
      ticks = Math.round(
        ticks * (1 - adjDef.tortureAdjacencyEffects.tortureSpeedBonus),
      );
    }
  }

  return Math.max(1, ticks);
}

/**
 * Get conversion success rate for a given invader class,
 * accounting for upgrade bonus and adjacency bonus, capped at 95%.
 */
export function tortureGetConversionRate(
  placedRoom: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
  invaderClass: InvaderClassType,
): number {
  let rate = TORTURE_CONVERT_SUCCESS_RATES[invaderClass];

  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  for (const effect of effects) {
    if (effect.type === 'tortureConversionBonus') {
      rate += effect.value;
    }
  }

  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.tortureAdjacencyEffects?.tortureConversionBonus) {
      rate += adjDef.tortureAdjacencyEffects.tortureConversionBonus;
    }
  }

  return Math.min(0.95, rate);
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
 * Create a converted inhabitant from a prisoner.
 */
export function tortureCreateConvertedInhabitant(
  prisoner: CapturedPrisoner,
): InhabitantInstance {
  return {
    instanceId: rngUuid<InhabitantInstanceId>(),
    definitionId: CONVERTED_PRISONER_DEF_ID as InhabitantId,
    name: `${prisoner.name} (Converted)`,
    state: 'normal',
    assignedRoomId: undefined,
  };
}

/**
 * Get adjacent room type IDs for a torture chamber room.
 */
export function tortureGetAdjacentRoomTypeIds(
  room: PlacedRoom,
  floor: { rooms: PlacedRoom[] },
): Set<string> {
  const tileMap = new Map<string, Array<{ x: number; y: number }>>();
  for (const r of floor.rooms) {
    const shape = roomShapeResolve(r);
    tileMap.set(r.id, roomShapeGetAbsoluteTiles(shape, r.anchorX, r.anchorY));
  }

  const thisTiles = tileMap.get(room.id) ?? [];
  const adjacentTypes = new Set<string>();

  for (const other of floor.rooms) {
    if (other.id === room.id) continue;
    const otherTiles = tileMap.get(other.id) ?? [];
    if (adjacencyAreRoomsAdjacent(thisTiles, otherTiles)) {
      adjacentTypes.add(other.roomTypeId);
    }
  }

  return adjacentTypes;
}

// --- Tick processor ---

/**
 * Process all Torture Chamber rooms each tick.
 * Called inside updateGamestate — mutates state in-place.
 */
export function tortureChamberProcess(state: GameState): void {
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

      room.tortureJob.ticksRemaining -= 1;

      // Add extra corruption while processing
      const corruptionRes = state.world.resources['corruption'];
      if (corruptionRes) {
        corruptionRes.current = Math.min(
          corruptionRes.max,
          corruptionRes.current + TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING,
        );
      }

      if (room.tortureJob.ticksRemaining <= 0) {
        const job = room.tortureJob;
        const prisoner = state.world.prisoners.find(
          (p) => p.id === job.prisonerId,
        );

        if (prisoner) {
          // Remove prisoner
          state.world.prisoners = state.world.prisoners.filter(
            (p) => p.id !== job.prisonerId,
          );

          if (job.action === 'extract') {
            const researchGained = tortureCalculateExtractionReward(prisoner);
            const researchRes = state.world.resources['research'];
            if (researchRes) {
              researchRes.current = Math.min(
                researchRes.max,
                researchRes.current + researchGained,
              );
            }

            tortureExtractionCompleteSubject.next({
              roomId: room.id,
              prisonerName: prisoner.name,
              researchGained,
            });
          } else {
            // convert
            const adjacentTypes = tortureGetAdjacentRoomTypeIds(room, floor);
            const rate = tortureGetConversionRate(
              room,
              adjacentTypes,
              prisoner.invaderClass,
            );
            const rng = rngRandom();
            const success = rng() < rate;

            if (success) {
              const newInhabitant = tortureCreateConvertedInhabitant(prisoner);
              state.world.inhabitants = [
                ...state.world.inhabitants,
                newInhabitant,
              ];
              inhabitantsChanged = true;

              tortureConversionCompleteSubject.next({
                roomId: room.id,
                prisonerName: prisoner.name,
                success: true,
                inhabitantName: newInhabitant.name,
              });
            } else {
              tortureConversionCompleteSubject.next({
                roomId: room.id,
                prisonerName: prisoner.name,
                success: false,
              });
            }
          }
        }

        room.tortureJob = undefined;
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
