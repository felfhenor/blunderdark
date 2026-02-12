import { computed } from '@angular/core';
import { areRoomsAdjacent } from '@helpers/adjacency';
import { getEntry } from '@helpers/content';
import { findRoomIdByRole } from '@helpers/room-roles';
import { getAbsoluteTiles, getShapeBounds } from '@helpers/room-shapes';
import { gamestate } from '@helpers/state-game';
import {
  GRID_SIZE,
  type Floor,
  type InhabitantDefinition,
  type InhabitantInstance,
  type IsContentItem,
  type PlacedRoom,
  type RoomDefinition,
  type RoomShape,
  type RulerBonuses,
} from '@interfaces';

// --- Pure functions ---

/**
 * Find the placed Throne Room across all floors.
 * Returns the floor and room if found.
 */
export function findThroneRoom(
  floors: Floor[],
): { floor: Floor; room: PlacedRoom } | null {
  const throneId = findRoomIdByRole('throne');
  if (!throneId) return null;

  for (const floor of floors) {
    const room = floor.rooms.find(
      (r) => r.roomTypeId === throneId,
    );
    if (room) return { floor, room };
  }
  return null;
}

/**
 * Get the seated ruler instance from a floor's inhabitants.
 */
export function getSeatedRulerInstance(
  floor: Floor,
  throneRoomId: string,
): InhabitantInstance | null {
  return (
    floor.inhabitants.find((i) => i.assignedRoomId === throneRoomId) ?? null
  );
}

/**
 * Get the ruler definition for a seated ruler instance.
 */
export function getRulerDefinition(
  instance: InhabitantInstance,
): (InhabitantDefinition & IsContentItem) | null {
  return getEntry<InhabitantDefinition & IsContentItem>(instance.definitionId) ?? null;
}

/**
 * Get the active ruler bonuses from the current game state floors.
 * Returns an empty record if no Throne Room or no seated ruler.
 */
export function getActiveRulerBonuses(floors: Floor[]): RulerBonuses {
  const throne = findThroneRoom(floors);
  if (!throne) return {};

  const ruler = getSeatedRulerInstance(throne.floor, throne.room.id);
  if (!ruler) return {};

  const def = getRulerDefinition(ruler);
  if (!def) return {};

  return { ...def.rulerBonuses };
}

/**
 * Get a specific ruler bonus value. Returns 0 if not active.
 */
export function getRulerBonusValue(
  floors: Floor[],
  bonusType: string,
): number {
  const bonuses = getActiveRulerBonuses(floors);
  return bonuses[bonusType] ?? 0;
}

// --- Computed signals ---

/**
 * The currently seated ruler instance, or null if no Throne Room or empty.
 */
export const seatedRuler = computed<InhabitantInstance | null>(() => {
  const floors = gamestate().world.floors;
  const throne = findThroneRoom(floors);
  if (!throne) return null;
  return getSeatedRulerInstance(throne.floor, throne.room.id);
});

/**
 * The active ruler bonuses as a reactive signal.
 */
export const activeRulerBonuses = computed<RulerBonuses>(() => {
  return getActiveRulerBonuses(gamestate().world.floors);
});

/**
 * Get a specific bonus type's value reactively.
 */
export function rulerBonus(bonusType: string): number {
  return activeRulerBonuses()[bonusType] ?? 0;
}

// --- Fear level ---

export const EMPTY_THRONE_FEAR_LEVEL = 1;

/**
 * Get the Throne Room's effective fear level.
 * Returns EMPTY_THRONE_FEAR_LEVEL (1) if no Throne Room or no ruler seated.
 * Returns the ruler's rulerFearLevel if a ruler is seated.
 * Returns null if the Throne Room is not placed.
 */
export function getThroneRoomFearLevel(floors: Floor[]): number | null {
  const throne = findThroneRoom(floors);
  if (!throne) return null;

  const ruler = getSeatedRulerInstance(throne.floor, throne.room.id);
  if (!ruler) return EMPTY_THRONE_FEAR_LEVEL;

  const def = getRulerDefinition(ruler);
  if (!def || def.rulerFearLevel <= 0) return EMPTY_THRONE_FEAR_LEVEL;

  return def.rulerFearLevel;
}

/**
 * Reactive computed signal for the Throne Room's fear level.
 * Returns null if no Throne Room is placed.
 */
export const throneRoomFearLevel = computed<number | null>(() => {
  return getThroneRoomFearLevel(gamestate().world.floors);
});

// --- Adjacency & centrality bonuses ---

export const CENTRALITY_THRESHOLD = 5;
export const CENTRALITY_RULER_BONUS_MULTIPLIER = 0.1;

export type ThronePositionalBonuses = {
  vaultAdjacent: boolean;
  central: boolean;
  goldProductionBonus: number;
  rulerBonusMultiplier: number;
};

/**
 * Check if a room's center is within a Manhattan distance threshold of the grid center.
 */
export function isRoomCentral(
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
export function getThroneRoomPositionalBonuses(
  floors: Floor[],
): ThronePositionalBonuses {
  const defaultBonuses: ThronePositionalBonuses = {
    vaultAdjacent: false,
    central: false,
    goldProductionBonus: 0,
    rulerBonusMultiplier: 0,
  };

  const throne = findThroneRoom(floors);
  if (!throne) return defaultBonuses;

  const throneShape = getEntry<RoomShape & IsContentItem>(
    throne.room.shapeId,
  );
  if (!throneShape) return defaultBonuses;

  const throneTiles = getAbsoluteTiles(
    throneShape,
    throne.room.anchorX,
    throne.room.anchorY,
  );

  // Check adjacent rooms for throneAdjacencyEffects
  let goldProductionBonus = 0;
  let vaultAdjacent = false;
  for (const adjRoom of throne.floor.rooms) {
    if (adjRoom.id === throne.room.id) continue;
    const adjShape = getEntry<RoomShape & IsContentItem>(adjRoom.shapeId);
    if (!adjShape) continue;
    const adjTiles = getAbsoluteTiles(adjShape, adjRoom.anchorX, adjRoom.anchorY);
    if (!areRoomsAdjacent(throneTiles, adjTiles)) continue;

    const adjDef = getEntry<RoomDefinition & IsContentItem>(adjRoom.roomTypeId);
    if (adjDef?.throneAdjacencyEffects?.goldProductionBonus) {
      vaultAdjacent = true;
      goldProductionBonus += adjDef.throneAdjacencyEffects.goldProductionBonus;
    }
  }

  // Check centrality
  const bounds = getShapeBounds(throneShape);
  const central = isRoomCentral(
    throne.room.anchorX,
    throne.room.anchorY,
    bounds.width,
    bounds.height,
    GRID_SIZE,
    CENTRALITY_THRESHOLD,
  );

  return {
    vaultAdjacent,
    central,
    goldProductionBonus,
    rulerBonusMultiplier: central ? CENTRALITY_RULER_BONUS_MULTIPLIER : 0,
  };
}

/**
 * Reactive computed signal for the Throne Room's positional bonuses.
 */
export const thronePositionalBonuses = computed<ThronePositionalBonuses>(
  () => {
    return getThroneRoomPositionalBonuses(gamestate().world.floors);
  },
);
