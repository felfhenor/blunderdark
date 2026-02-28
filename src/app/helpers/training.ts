import { computed } from '@angular/core';
import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { gridSelectedTile } from '@helpers/grid';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { gamestate } from '@helpers/state-game';
import type {
  Floor,
  GameState,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  TileOffset,
} from '@interfaces';
import type { InhabitantTraitContent } from '@interfaces/content-inhabitanttrait';
import type { RoomContent } from '@interfaces/content-room';
import { Subject } from 'rxjs';
import type { TrainingRoomInfo } from '@interfaces/training';

/** Base training time: 5 game-minutes */
export const TRAINING_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 5;

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
export function trainingIsGroundsRoom(roomTypeId: RoomId): boolean {
  return roomTypeId === roomRoleFindById('trainingGrounds');
}

/**
 * Get the set of room type IDs adjacent to a given room on a floor.
 */
export function trainingGetAdjacentRoomTypeIds(
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
    if (adjacencyAreRoomsAdjacent(thisTiles, otherTiles)) {
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
    const shape = roomShapeResolve(room);
    tileMap.set(
      room.id,
      roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
    );
  }
  return tileMap;
}

/**
 * Calculate the effective training ticks for a Training Grounds room,
 * accounting for adjacency bonuses.
 */
export function trainingGetTicksForRoom(
  _placedRoom: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
): number {
  let ticks = TRAINING_BASE_TICKS;

  // Check adjacent rooms for trainingAdjacencyEffects.timeReduction
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.trainingAdjacencyEffects?.timeReduction) {
      ticks = Math.round(ticks * (1 - adjDef.trainingAdjacencyEffects.timeReduction));
    }
  }

  return Math.max(1, ticks);
}

/**
 * Get the training trait IDs that a room will grant upon training completion.
 * If the room has an upgrade with trainingTrait effects, those replace the base traits.
 * Otherwise, uses the room definition's trainingTraitNames.
 */
export function trainingGetTraitIdsForRoom(
  placedRoom: PlacedRoom,
): string[] {
  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  const traitEffects = effects.filter((e) => e.type === 'trainingTrait');

  if (traitEffects.length > 0) {
    return traitEffects
      .map((e) => contentGetEntry<InhabitantTraitContent>(e.resource!)?.id as string | undefined)
      .filter((id): id is string => id !== undefined);
  }

  const roomDef = contentGetEntry<RoomContent>(placedRoom.roomTypeId);
  if (!roomDef?.trainingTraitNames?.length) return [];

  return roomDef.trainingTraitNames
    .map((name) => contentGetEntry<InhabitantTraitContent>(name)?.id as string | undefined)
    .filter((id): id is string => id !== undefined);
}

/**
 * Get the current training trait IDs on an inhabitant.
 */
export function trainingGetCurrentTraitIds(
  instanceTraitIds: string[] | undefined,
): string[] {
  if (!instanceTraitIds?.length) return [];
  return instanceTraitIds.filter((id) => {
    const trait = contentGetEntry<InhabitantTraitContent>(id);
    return trait?.isFromTraining;
  });
}

/**
 * Check if two trait ID arrays contain the same set of IDs.
 */
function trainingTraitSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/**
 * Get training progress as a percentage (0-100) for an inhabitant
 * in a specific Training Grounds room.
 */
export function trainingGetProgressPercent(
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
export function trainingProcess(state: GameState, numTicks = 1): void {
  const trainingGroundsId = roomRoleFindById('trainingGrounds');

  for (const floor of state.world.floors) {
    const tileMap = buildRoomTilesMap(floor);

    for (const room of floor.rooms) {
      if (room.roomTypeId !== trainingGroundsId) continue;

      const adjacentTypes = trainingGetAdjacentRoomTypeIds(room, floor, tileMap);
      const targetTicks = trainingGetTicksForRoom(room, adjacentTypes);
      const expectedTraitIds = trainingGetTraitIdsForRoom(room);

      if (expectedTraitIds.length === 0) continue;

      for (const inhabitant of state.world.inhabitants) {
        if (inhabitant.assignedRoomId !== room.id) continue;

        const currentTrainingIds = trainingGetCurrentTraitIds(inhabitant.instanceTraitIds);

        // Already has the correct training traits — skip
        if (currentTrainingIds.length > 0 && trainingTraitSetsEqual(currentTrainingIds, expectedTraitIds)) {
          continue;
        }

        // Has different training traits — remove them and reset progress (retraining)
        if (currentTrainingIds.length > 0) {
          const removeSet = new Set(currentTrainingIds);
          inhabitant.instanceTraitIds = (inhabitant.instanceTraitIds ?? [])
            .filter((id) => !removeSet.has(id));
          inhabitant.trainingProgress = 0;
        }

        const progress = (inhabitant.trainingProgress ?? 0) + numTicks;
        inhabitant.trainingProgress = progress;

        if (progress >= targetTicks) {
          inhabitant.instanceTraitIds = [
            ...(inhabitant.instanceTraitIds ?? []),
            ...expectedTraitIds,
          ];
          inhabitant.trainingProgress = 0;
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


export function trainingGetRoomInfo(
  roomId: PlacedRoomId,
): TrainingRoomInfo | undefined {
  const trainingGroundsId = roomRoleFindById('trainingGrounds');
  const state = gamestate();
  for (const floor of state.world.floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (!room || room.roomTypeId !== trainingGroundsId) continue;

    const adjacentTypes = trainingGetAdjacentRoomTypeIds(room, floor);
    return {
      placedRoom: room,
      floor,
      targetTicks: trainingGetTicksForRoom(room, adjacentTypes),
      trainingTraitIds: trainingGetTraitIdsForRoom(room),
    };
  }
  return undefined;
}

/**
 * Reactive signal: selected tile's Training Grounds info (undefined if selection is not a Training Grounds).
 */
export const trainingSelectedRoom = computed<TrainingRoomInfo | undefined>(() => {
  const trainingGroundsId = roomRoleFindById('trainingGrounds');
  const state = gamestate();
  const tile = gridSelectedTile();
  const floors = state.world.floors;
  const floorIndex = state.world.currentFloorIndex;
  const floor = floors[floorIndex];
  if (!floor || !tile) return undefined;

  const gridCell = floor.grid[tile.y]?.[tile.x];
  if (!gridCell?.roomId) return undefined;

  const room = floor.rooms.find((r) => r.id === gridCell.roomId);
  if (!room || room.roomTypeId !== trainingGroundsId) return undefined;

  const adjacentTypes = trainingGetAdjacentRoomTypeIds(room, floor);
  return {
    placedRoom: room,
    floor,
    targetTicks: trainingGetTicksForRoom(room, adjacentTypes),
    trainingTraitIds: trainingGetTraitIdsForRoom(room),
  };
});
