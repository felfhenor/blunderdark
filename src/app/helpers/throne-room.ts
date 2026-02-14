import { computed } from '@angular/core';
import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntry } from '@helpers/content';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomShapeGetAbsoluteTiles, roomShapeGetBounds } from '@helpers/room-shapes';
import { gamestate } from '@helpers/state-game';
import {
  GRID_SIZE,
  type Floor,
  type InhabitantInstance,
  type IsContentItem,
  type PlacedRoom,
  type RoomShape,
  type RulerBonuses,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type { ThronePositionalBonuses } from '@interfaces/throne';

// --- Pure functions ---

/**
 * Find the placed Throne Room across all floors.
 * Returns the floor and room if found.
 */
export function throneRoomFind(
  floors: Floor[],
): { floor: Floor; room: PlacedRoom } | undefined {
  const throneId = roomRoleFindById('throne');
  if (!throneId) return undefined;

  for (const floor of floors) {
    const room = floor.rooms.find(
      (r) => r.roomTypeId === throneId,
    );
    if (room) return { floor, room };
  }
  return undefined;
}

/**
 * Get the seated ruler instance from a floor's inhabitants.
 */
export function throneRoomGetSeatedRulerInstance(
  floor: Floor,
  throneRoomId: string,
): InhabitantInstance | undefined {
  return (
    floor.inhabitants.find((i) => i.assignedRoomId === throneRoomId) ?? undefined
  );
}

/**
 * Get the ruler definition for a seated ruler instance.
 */
export function throneRoomGetRulerDefinition(
  instance: InhabitantInstance,
): InhabitantContent | undefined {
  return contentGetEntry<InhabitantContent>(instance.definitionId) ?? undefined;
}

/**
 * Get the active ruler bonuses from the current game state floors.
 * Returns an empty record if no Throne Room or no seated ruler.
 */
export function throneRoomGetActiveRulerBonuses(floors: Floor[]): RulerBonuses {
  const throne = throneRoomFind(floors);
  if (!throne) return {};

  const ruler = throneRoomGetSeatedRulerInstance(throne.floor, throne.room.id);
  if (!ruler) return {};

  const def = throneRoomGetRulerDefinition(ruler);
  if (!def) return {};

  return { ...def.rulerBonuses };
}

/**
 * Get a specific ruler bonus value. Returns 0 if not active.
 */
export function throneRoomGetRulerBonusValue(
  floors: Floor[],
  bonusType: string,
): number {
  const bonuses = throneRoomGetActiveRulerBonuses(floors);
  return bonuses[bonusType] ?? 0;
}

// --- Computed signals ---

/**
 * The currently seated ruler instance, or null if no Throne Room or empty.
 */
export const throneRoomSeatedRuler = computed<InhabitantInstance | undefined>(() => {
  const floors = gamestate().world.floors;
  const throne = throneRoomFind(floors);
  if (!throne) return undefined;
  return throneRoomGetSeatedRulerInstance(throne.floor, throne.room.id);
});

/**
 * The active ruler bonuses as a reactive signal.
 */
export const throneRoomActiveRulerBonuses = computed<RulerBonuses>(() => {
  return throneRoomGetActiveRulerBonuses(gamestate().world.floors);
});

/**
 * Get a specific bonus type's value reactively.
 */
export function throneRoomRulerBonus(bonusType: string): number {
  return throneRoomActiveRulerBonuses()[bonusType] ?? 0;
}

// --- Fear level ---

export const THRONE_ROOM_EMPTY_FEAR_LEVEL = 1;

/**
 * Get the Throne Room's effective fear level.
 * Returns THRONE_ROOM_EMPTY_FEAR_LEVEL (1) if no Throne Room or no ruler seated.
 * Returns the ruler's rulerFearLevel if a ruler is seated.
 * Returns null if the Throne Room is not placed.
 */
export function throneRoomGetFearLevel(floors: Floor[]): number | undefined {
  const throne = throneRoomFind(floors);
  if (!throne) return undefined;

  const ruler = throneRoomGetSeatedRulerInstance(throne.floor, throne.room.id);
  if (!ruler) return THRONE_ROOM_EMPTY_FEAR_LEVEL;

  const def = throneRoomGetRulerDefinition(ruler);
  if (!def || def.rulerFearLevel <= 0) return THRONE_ROOM_EMPTY_FEAR_LEVEL;

  return def.rulerFearLevel;
}

/**
 * Reactive computed signal for the Throne Room's fear level.
 * Returns null if no Throne Room is placed.
 */
export const throneRoomFearLevel = computed<number | undefined>(() => {
  return throneRoomGetFearLevel(gamestate().world.floors);
});

// --- Adjacency & centrality bonuses ---

export const THRONE_ROOM_CENTRALITY_THRESHOLD = 5;
export const THRONE_ROOM_CENTRALITY_RULER_BONUS_MULTIPLIER = 0.1;

/**
 * Check if a room's center is within a Manhattan distance threshold of the grid center.
 */
export function throneRoomIsRoomCentral(
  anchorX: number,
  anchorY: number,
  shapeWidth: number,
  shapeHeight: number,
  gridSize: number,
  threshold: number,
): boolean {
  const roomCenterX = anchorX + shapeWidth / 2;
  const roomCenterY = anchorY + shapeHeight / 2;
  const gridCenterX = gridSize / 2;
  const gridCenterY = gridSize / 2;
  const distance =
    Math.abs(roomCenterX - gridCenterX) + Math.abs(roomCenterY - gridCenterY);
  return distance <= threshold;
}

/**
 * Get positional bonuses for the Throne Room.
 * Checks adjacent rooms for throneAdjacencyEffects and central placement.
 */
export function throneRoomGetPositionalBonuses(
  floors: Floor[],
): ThronePositionalBonuses {
  const defaultBonuses: ThronePositionalBonuses = {
    vaultAdjacent: false,
    central: false,
    goldProductionBonus: 0,
    rulerBonusMultiplier: 0,
  };

  const throne = throneRoomFind(floors);
  if (!throne) return defaultBonuses;

  const throneShape = contentGetEntry<RoomShape & IsContentItem>(
    throne.room.shapeId,
  );
  if (!throneShape) return defaultBonuses;

  const throneTiles = roomShapeGetAbsoluteTiles(
    throneShape,
    throne.room.anchorX,
    throne.room.anchorY,
  );

  // Check adjacent rooms for throneAdjacencyEffects
  let goldProductionBonus = 0;
  let vaultAdjacent = false;
  for (const adjRoom of throne.floor.rooms) {
    if (adjRoom.id === throne.room.id) continue;
    const adjShape = contentGetEntry<RoomShape & IsContentItem>(adjRoom.shapeId);
    if (!adjShape) continue;
    const adjTiles = roomShapeGetAbsoluteTiles(adjShape, adjRoom.anchorX, adjRoom.anchorY);
    if (!adjacencyAreRoomsAdjacent(throneTiles, adjTiles)) continue;

    const adjDef = contentGetEntry<RoomContent>(adjRoom.roomTypeId);
    if (adjDef?.throneAdjacencyEffects?.goldProductionBonus) {
      vaultAdjacent = true;
      goldProductionBonus += adjDef.throneAdjacencyEffects.goldProductionBonus;
    }
  }

  // Check centrality
  const bounds = roomShapeGetBounds(throneShape);
  const central = throneRoomIsRoomCentral(
    throne.room.anchorX,
    throne.room.anchorY,
    bounds.width,
    bounds.height,
    GRID_SIZE,
    THRONE_ROOM_CENTRALITY_THRESHOLD,
  );

  return {
    vaultAdjacent,
    central,
    goldProductionBonus,
    rulerBonusMultiplier: central ? THRONE_ROOM_CENTRALITY_RULER_BONUS_MULTIPLIER : 0,
  };
}

/**
 * Reactive computed signal for the Throne Room's positional bonuses.
 */
export const throneRoomPositionalBonuses = computed<ThronePositionalBonuses>(
  () => {
    return throneRoomGetPositionalBonuses(gamestate().world.floors);
  },
);
