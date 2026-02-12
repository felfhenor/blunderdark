import { computed } from '@angular/core';
import { areRoomsAdjacent } from '@helpers/adjacency';
import { getEntry } from '@helpers/content';
import { TICKS_PER_MINUTE } from '@helpers/game-time';
import { findRoomIdByRole } from '@helpers/room-roles';
import { getAbsoluteTiles, resolveRoomShape } from '@helpers/room-shapes';
import { getAppliedUpgradeEffects } from '@helpers/room-upgrades';
import { gamestate } from '@helpers/state-game';
import type {
  Floor,
  GameState,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  TileOffset,
  TrainingBonuses,
} from '@interfaces';
import { Subject } from 'rxjs';

/** Base training time: 5 game-minutes = 25 ticks (TICKS_PER_MINUTE * 5) */
export const BASE_TRAINING_TICKS = TICKS_PER_MINUTE * 5;

// --- Training completion events ---

const trainingCompletedSubject = new Subject<{
  instanceId: string;
  name: string;
}>();

export const trainingCompleted$ = trainingCompletedSubject.asObservable();

// --- Pure helper functions ---

/**
 * Check if a room type is a Training Grounds.
 */
export function isTrainingGroundsRoom(roomTypeId: string): boolean {
  return roomTypeId === findRoomIdByRole('trainingGrounds');
}

/**
 * Get the set of room type IDs adjacent to a given room on a floor.
 */
export function getAdjacentRoomTypeIds(
  room: PlacedRoom,
  floor: Floor,
  roomTilesMap?: Map<string, TileOffset[]>,
): Set<string> {
  const tileMap =
    roomTilesMap ?? buildRoomTilesMap(floor);

  const thisTiles = tileMap.get(room.id) ?? [];
  const adjacentTypes = new Set<string>();

  for (const other of floor.rooms) {
    if (other.id === room.id) continue;
    const otherTiles = tileMap.get(other.id) ?? [];
    if (areRoomsAdjacent(thisTiles, otherTiles)) {
      adjacentTypes.add(other.roomTypeId);
    }
  }

  return adjacentTypes;
}

/**
 * Build a map of room ID → absolute tiles for a floor.
 */
function buildRoomTilesMap(floor: Floor): Map<string, TileOffset[]> {
  const tileMap = new Map<string, TileOffset[]>();
  for (const room of floor.rooms) {
    const shape = resolveRoomShape(room);
    tileMap.set(
      room.id,
      getAbsoluteTiles(shape, room.anchorX, room.anchorY),
    );
  }
  return tileMap;
}

/**
 * Calculate the effective training ticks for a Training Grounds room,
 * accounting for upgrade effects and adjacency bonuses.
 */
export function getTrainingTicksForRoom(
  placedRoom: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
): number {
  let ticks = BASE_TRAINING_TICKS;

  // Apply upgrade time multiplier
  const effects = getAppliedUpgradeEffects(placedRoom);
  for (const effect of effects) {
    if (effect.type === 'trainingTimeMultiplier') {
      ticks = Math.round(ticks * effect.value);
    }
  }

  // Check adjacent rooms for trainingAdjacencyEffects.timeReduction
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = getEntry<RoomDefinition & IsContentItem>(adjTypeId);
    if (adjDef?.trainingAdjacencyEffects?.timeReduction) {
      ticks = Math.round(ticks * (1 - adjDef.trainingAdjacencyEffects.timeReduction));
    }
  }

  return Math.max(1, ticks);
}

/**
 * Calculate the training bonuses an inhabitant will receive upon completing
 * training in a specific Training Grounds room.
 */
export function getTrainingBonusesForRoom(
  placedRoom: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
): TrainingBonuses {
  const bonuses: TrainingBonuses = { defense: 1, attack: 0 };

  const effects = getAppliedUpgradeEffects(placedRoom);
  for (const effect of effects) {
    if (effect.type === 'trainingAttackBonus') {
      bonuses.attack += effect.value;
    }
    if (effect.type === 'trainingDefenseBonus') {
      bonuses.defense += effect.value;
    }
  }

  // Check adjacent rooms for trainingAdjacencyEffects.statBonus
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = getEntry<RoomDefinition & IsContentItem>(adjTypeId);
    if (adjDef?.trainingAdjacencyEffects?.statBonus) {
      bonuses.defense += adjDef.trainingAdjacencyEffects.statBonus;
      bonuses.attack += adjDef.trainingAdjacencyEffects.statBonus;
    }
  }

  return bonuses;
}

/**
 * Get training progress as a percentage (0-100) for an inhabitant
 * in a specific Training Grounds room.
 */
export function getTrainingProgressPercent(
  trainingProgress: number,
  targetTicks: number,
): number {
  if (targetTicks <= 0) return 100;
  return Math.min(100, Math.round((trainingProgress / targetTicks) * 100));
}

/**
 * Process training for all Training Grounds rooms.
 * Called each tick inside updateGamestate — mutates state in-place.
 */
export function processTraining(state: GameState): void {
  const trainingGroundsId = findRoomIdByRole('trainingGrounds');

  for (const floor of state.world.floors) {
    const tileMap = buildRoomTilesMap(floor);

    for (const room of floor.rooms) {
      if (room.roomTypeId !== trainingGroundsId) continue;

      const adjacentTypes = getAdjacentRoomTypeIds(room, floor, tileMap);
      const targetTicks = getTrainingTicksForRoom(room, adjacentTypes);
      const bonuses = getTrainingBonusesForRoom(room, adjacentTypes);

      for (const inhabitant of state.world.inhabitants) {
        if (inhabitant.assignedRoomId !== room.id) continue;
        if (inhabitant.trained) continue;

        const progress = (inhabitant.trainingProgress ?? 0) + 1;
        inhabitant.trainingProgress = progress;

        if (progress >= targetTicks) {
          inhabitant.trained = true;
          inhabitant.trainingBonuses = { ...bonuses };
          trainingCompletedSubject.next({
            instanceId: inhabitant.instanceId,
            name: inhabitant.name,
          });
        }
      }
    }
  }
}

// --- Computed signals ---

/**
 * Get all Training Grounds rooms across all floors with their training info.
 */
export type TrainingRoomInfo = {
  placedRoom: PlacedRoom;
  floor: Floor;
  targetTicks: number;
  bonuses: TrainingBonuses;
};

export function getTrainingRoomInfo(
  roomId: string,
): TrainingRoomInfo | null {
  const trainingGroundsId = findRoomIdByRole('trainingGrounds');
  const state = gamestate();
  for (const floor of state.world.floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (!room || room.roomTypeId !== trainingGroundsId) continue;

    const adjacentTypes = getAdjacentRoomTypeIds(room, floor);
    return {
      placedRoom: room,
      floor,
      targetTicks: getTrainingTicksForRoom(room, adjacentTypes),
      bonuses: getTrainingBonusesForRoom(room, adjacentTypes),
    };
  }
  return null;
}

/**
 * Reactive signal: selected tile's Training Grounds info (null if not a Training Grounds).
 */
export const selectedTrainingRoom = computed<TrainingRoomInfo | null>(() => {
  const trainingGroundsId = findRoomIdByRole('trainingGrounds');
  const state = gamestate();
  const floors = state.world.floors;
  const floorIndex = state.world.currentFloorIndex;
  const floor = floors[floorIndex];
  if (!floor) return null;

  // Find the training grounds room from the floor's rooms list
  // We check all rooms to find if any is selected (via UI)
  for (const room of floor.rooms) {
    if (room.roomTypeId === trainingGroundsId) {
      const adjacentTypes = getAdjacentRoomTypeIds(room, floor);
      return {
        placedRoom: room,
        floor,
        targetTicks: getTrainingTicksForRoom(room, adjacentTypes),
        bonuses: getTrainingBonusesForRoom(room, adjacentTypes),
      };
    }
  }
  return null;
});
