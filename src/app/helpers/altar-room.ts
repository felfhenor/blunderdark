import { computed } from '@angular/core';
import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import {
  connectionAddToFloor,
  connectionValidate,
} from '@helpers/connections';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { generateRoomSuffix } from '@helpers/suffix';
import { roomPlacementPlaceOnFloor } from '@helpers/room-placement';
import {
  researchUnlockIsResearchGated,
  researchUnlockIsUnlocked,
} from '@helpers/research-unlocks';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomShapeGetAbsoluteTiles } from '@helpers/room-shapes';
import {
  roomUpgradeApply,
  roomUpgradeGetAppliedEffects,
  roomUpgradeGetPaths,
} from '@helpers/room-upgrades';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  Floor,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeContent,
  RoomUpgradeId,
} from '@interfaces';
import type { RoomUpgradeContent } from '@interfaces/content-roomupgrade';
import type { RoomContent } from '@interfaces/content-room';
import { GRID_SIZE } from '@interfaces/grid';

/**
 * Find the placed Altar Room across all floors.
 */
export function altarRoomFind(
  floors: Floor[],
): { floor: Floor; room: PlacedRoom } | undefined {
  const altarId = roomRoleFindById('altar');
  if (!altarId) return undefined;

  for (const floor of floors) {
    const room = floor.rooms.find((r) => r.roomTypeId === altarId);
    if (room) return { floor, room };
  }
  return undefined;
}

/**
 * Reactive signal: whether the Altar Room is placed.
 */
export const altarRoomHas = computed<boolean>(() => {
  return altarRoomFind(gamestate().world.floors) !== undefined;
});

/**
 * Auto-place all rooms with autoPlace: true on a floor during world generation.
 * The altar room is always placed first at the center of the grid, and subsequent
 * rooms are placed adjacent to the altar.
 */
export function altarRoomAutoPlace(floor: Floor): Floor {
  const roomDefs = contentGetEntriesByType<RoomContent>('room');
  const autoPlaceRooms = roomDefs.filter((r) => r.autoPlace);

  // Place altar room first so it's always centered
  const altarRoom = autoPlaceRooms.find((r) => r.role === 'altar');
  const otherRooms = autoPlaceRooms.filter((r) => r.role !== 'altar');
  const sortedRooms = altarRoom ? [altarRoom, ...otherRooms] : otherRooms;

  let floorCurrent = floor;
  const placedRoomIds: string[] = [];
  let altarPlacement:
    | { anchorX: number; anchorY: number; shape: RoomShapeContent }
    | undefined;

  for (const roomDef of sortedRooms) {
    const shape = contentGetEntry<RoomShapeContent>(roomDef.shapeId);
    if (!shape) continue;

    let candidates: { x: number; y: number }[];

    if (altarPlacement) {
      // Place adjacent to the altar room
      const ap = altarPlacement;
      candidates = [
        { x: ap.anchorX + ap.shape.width, y: ap.anchorY },
        { x: ap.anchorX - shape.width, y: ap.anchorY },
        { x: ap.anchorX, y: ap.anchorY + ap.shape.height },
        { x: ap.anchorX, y: ap.anchorY - shape.height },
      ];
    } else {
      // Center on grid, with fallback offsets
      const centerX = Math.floor((GRID_SIZE - shape.width) / 2);
      const centerY = Math.floor((GRID_SIZE - shape.height) / 2);
      candidates = [
        { x: centerX, y: centerY },
        { x: centerX + shape.width, y: centerY },
        { x: centerX - shape.width, y: centerY },
        { x: centerX, y: centerY + shape.height },
        { x: centerX, y: centerY - shape.height },
      ];
    }

    for (const pos of candidates) {
      const placedRoom: PlacedRoom = {
        id: rngUuid<PlacedRoomId>(),
        roomTypeId: roomDef.id as RoomId,
        shapeId: roomDef.shapeId,
        anchorX: pos.x,
        anchorY: pos.y,
        suffix: generateRoomSuffix(floorCurrent, roomDef.id as RoomId),
      };

      const updated = roomPlacementPlaceOnFloor(
        floorCurrent,
        placedRoom,
        shape,
      );
      if (updated) {
        floorCurrent = updated;
        placedRoomIds.push(placedRoom.id);
        if (roomDef.role === 'altar') {
          altarPlacement = { anchorX: pos.x, anchorY: pos.y, shape };
        }
        break;
      }
    }
  }

  // Connect all adjacent auto-placed rooms with doors
  for (let i = 0; i < placedRoomIds.length; i++) {
    for (let j = i + 1; j < placedRoomIds.length; j++) {
      const roomAId = placedRoomIds[i] as PlacedRoomId;
      const roomBId = placedRoomIds[j] as PlacedRoomId;

      const validation = connectionValidate(floorCurrent, roomAId, roomBId);
      if (!validation.valid || !validation.edgeTiles) continue;

      const result = connectionAddToFloor(
        floorCurrent,
        roomAId,
        roomBId,
        validation.edgeTiles,
      );
      if (result) {
        floorCurrent = result.floor;
      }
    }
  }

  return floorCurrent;
}

/**
 * Get the Altar Room's current level (1 = base, 2 = Empowered, 3 = Ascendant).
 * Uses upgradeLevel field from upgrade path definitions.
 */
export function altarRoomGetLevel(floors: Floor[]): number {
  const altar = altarRoomFind(floors);
  if (!altar) return 0;

  if (!altar.room.appliedUpgradePathId) return 1;

  const altarId = roomRoleFindById('altar');
  if (!altarId) return 1;

  const paths = roomUpgradeGetPaths(altarId);
  const appliedPath = paths.find(
    (p) => p.id === altar.room.appliedUpgradePathId,
  );
  if (appliedPath?.upgradeLevel) return appliedPath.upgradeLevel;

  // Fallback: use index position
  const appliedIndex = paths.findIndex(
    (p) => p.id === altar.room.appliedUpgradePathId,
  );
  return appliedIndex >= 0 ? appliedIndex + 2 : 1;
}

/**
 * Reactive signal for the Altar's current level.
 */
export const altarRoomLevel = computed<number>(() => {
  return altarRoomGetLevel(gamestate().world.floors);
});

/**
 * Get the raw next upgrade for the Altar Room (ignoring research).
 */
function altarRoomGetNextUpgradeRaw(
  floors: Floor[],
): RoomUpgradeContent | undefined {
  const altar = altarRoomFind(floors);
  if (!altar) return undefined;

  const altarId = roomRoleFindById('altar');
  if (!altarId) return undefined;

  const currentLevel = altarRoomGetLevel(floors);
  const paths = roomUpgradeGetPaths(altarId);

  const nextLevel = currentLevel + 1;
  // Find the path matching the next upgrade level
  const nextPath = paths.find((p) => p.upgradeLevel === nextLevel);
  if (nextPath) return nextPath;

  // Fallback: use index-based progression
  if (currentLevel === 1 && paths.length >= 1) return paths[0];
  if (currentLevel === 2 && paths.length >= 2) return paths[1];

  return undefined;
}

/**
 * Get the next available upgrade for the Altar Room.
 * Returns undefined if fully upgraded, no Altar exists, or the upgrade is locked behind research.
 */
export function altarRoomGetNextUpgrade(
  floors: Floor[],
): RoomUpgradeContent | undefined {
  const upgrade = altarRoomGetNextUpgradeRaw(floors);
  if (!upgrade) return undefined;

  const isGated = researchUnlockIsResearchGated('roomupgrade', upgrade.id);
  if (isGated && !researchUnlockIsUnlocked('roomupgrade', upgrade.id)) {
    return undefined;
  }

  return upgrade;
}

/**
 * Check if the next altar upgrade exists but is locked behind research.
 * Returns the locked upgrade for UI display, or undefined if not locked.
 */
export function altarRoomGetLockedUpgrade(
  floors: Floor[],
): RoomUpgradeContent | undefined {
  const upgrade = altarRoomGetNextUpgradeRaw(floors);
  if (!upgrade) return undefined;

  const isGated = researchUnlockIsResearchGated('roomupgrade', upgrade.id);
  if (isGated && !researchUnlockIsUnlocked('roomupgrade', upgrade.id)) {
    return upgrade;
  }

  return undefined;
}

/**
 * Apply the next upgrade to the Altar Room.
 */
export async function altarRoomApplyUpgrade(
  upgradePathId: RoomUpgradeId,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const altar = altarRoomFind(state.world.floors);
  if (!altar) return { success: false, error: 'No Altar found' };

  const altarId = roomRoleFindById('altar');
  if (!altarId) return { success: false, error: 'No Altar type found' };

  const paths = roomUpgradeGetPaths(altarId);
  const path = paths.find((p) => p.id === upgradePathId);
  if (!path) return { success: false, error: 'Invalid upgrade path' };

  // Validate research unlock
  const isGated = researchUnlockIsResearchGated('roomupgrade', path.id);
  if (isGated && !researchUnlockIsUnlocked('roomupgrade', path.id)) {
    return { success: false, error: 'Requires research to unlock' };
  }

  // Validate level ordering
  const currentLevel = altarRoomGetLevel(state.world.floors);
  const targetLevel = path.upgradeLevel ?? paths.indexOf(path) + 2;
  if (targetLevel !== currentLevel + 1) {
    return {
      success: false,
      error: `Altar must be Level ${targetLevel - 1} to apply this upgrade`,
    };
  }

  if (!resourceCanAfford(path.cost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await resourcePayCost(path.cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  await updateGamestate((s) => {
    const newFloors = s.world.floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) =>
        room.id === altar.room.id
          ? roomUpgradeApply(room, upgradePathId)
          : room,
      ),
    }));
    return {
      ...s,
      world: { ...s.world, floors: newFloors },
    };
  });

  return { success: true };
}

/**
 * Get the fear reduction aura value for the Altar Room.
 * Returns the base fearReductionAura, increased by upgrade effects.
 */
export function altarRoomGetFearReductionAura(floors: Floor[]): number {
  const altar = altarRoomFind(floors);
  if (!altar) return 0;

  const roomDef = contentGetEntry<RoomContent>(altar.room.roomTypeId);
  if (!roomDef) return 0;

  // Check if upgrade overrides the fear reduction aura
  const effects = roomUpgradeGetAppliedEffects(altar.room);
  for (const effect of effects) {
    if (effect.type === 'fearReductionAura') {
      return effect.value;
    }
  }

  return roomDef.fearReductionAura;
}

/**
 * Check if a room is adjacent to the Altar Room on the same floor.
 */
export function altarRoomIsAdjacent(floor: Floor, room: PlacedRoom): boolean {
  const altarId = roomRoleFindById('altar');
  if (!altarId) return false;

  const altarPlaced = floor.rooms.find((r) => r.roomTypeId === altarId);
  if (!altarPlaced) return false;

  const roomShape = contentGetEntry<RoomShapeContent>(room.shapeId);
  const altarShape = contentGetEntry<RoomShapeContent>(altarPlaced.shapeId);
  if (!roomShape || !altarShape) return false;

  const roomTiles = roomShapeGetAbsoluteTiles(
    roomShape,
    room.anchorX,
    room.anchorY,
  );
  const altarTiles = roomShapeGetAbsoluteTiles(
    altarShape,
    altarPlaced.anchorX,
    altarPlaced.anchorY,
  );

  return adjacencyAreRoomsAdjacent(roomTiles, altarTiles);
}

/**
 * Reactive computed signal for the Altar Room's fear reduction aura value.
 */
export const altarRoomFearReductionAura = computed<number>(() => {
  return altarRoomGetFearReductionAura(gamestate().world.floors);
});

/**
 * Calculate the effective fear level for a room, accounting for the Altar's fear reduction aura.
 * Returns the room's base fear level minus the Altar's aura if adjacent, clamped to 0.
 * For rooms with 'variable' fear level, returns the original value unchanged.
 */
export function altarRoomGetEffectiveFearLevel(
  floor: Floor,
  room: PlacedRoom,
  baseFearLevel: number | 'variable',
): number | 'variable' {
  if (baseFearLevel === 'variable') return 'variable';

  const aura = altarRoomGetFearReductionAura([floor]);
  if (aura <= 0) return baseFearLevel;

  if (!altarRoomIsAdjacent(floor, room)) return baseFearLevel;

  return Math.max(0, baseFearLevel - aura);
}

/**
 * Reactive signal: whether recruitment is available (requires Altar at Level 1+).
 * The Altar's presence enables basic recruitment; upgrades may expand it later.
 */
export const altarRoomCanRecruit = computed<boolean>(() => {
  return altarRoomFind(gamestate().world.floors) !== undefined;
});
