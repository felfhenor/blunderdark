import { computed } from '@angular/core';
import { adjacencyAreRoomsAdjacent, type AdjacencyMap } from '@helpers/adjacency';
import { altarRoomGetFearReductionAura, altarRoomIsAdjacent } from '@helpers/altar-room';
import { contentGetEntry } from '@helpers/content';
import { productionGetRoomDefinition } from '@helpers/production';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { gamestate } from '@helpers/state-game';
import { throneRoomGetFearLevel } from '@helpers/throne-room';
import type {
  Floor,
  InhabitantDefinition,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  TileOffset,
} from '@interfaces';

// --- Constants ---

export const FEAR_LEVEL_NONE = 0;
export const FEAR_LEVEL_LOW = 1;
export const FEAR_LEVEL_MEDIUM = 2;
export const FEAR_LEVEL_HIGH = 3;
export const FEAR_LEVEL_VERY_HIGH = 4;

export const FEAR_LEVEL_MIN = 0;
export const FEAR_LEVEL_MAX = 4;

export const FEAR_LEVEL_PROPAGATION_DEFAULT_DISTANCE = 1;

export const FEAR_LEVEL_LABELS: Record<number, string> = {
  [FEAR_LEVEL_NONE]: 'None',
  [FEAR_LEVEL_LOW]: 'Low',
  [FEAR_LEVEL_MEDIUM]: 'Medium',
  [FEAR_LEVEL_HIGH]: 'High',
  [FEAR_LEVEL_VERY_HIGH]: 'Very High',
};

// --- Types ---

export type FearPropagationSource = {
  sourceRoomId: string;
  sourceRoomName: string;
  amount: number;
};

export type FearLevelBreakdown = {
  baseFear: number;
  inhabitantModifier: number;
  upgradeAdjustment: number;
  altarAuraReduction: number;
  propagatedFear: number;
  propagationSources: FearPropagationSource[];
  effectiveFear: number;
};

// --- Pure functions ---

export function fearLevelGetLabel(level: number): string {
  return FEAR_LEVEL_LABELS[level] ?? 'Unknown';
}

export function fearLevelCalculateInhabitantModifier(
  roomId: string,
  inhabitants: InhabitantInstance[],
): number {
  let modifier = 0;

  for (const inhabitant of inhabitants) {
    if (inhabitant.assignedRoomId !== roomId) continue;

    const def = contentGetEntry<InhabitantDefinition & IsContentItem>(
      inhabitant.definitionId,
    );
    if (!def) continue;

    modifier += def.fearModifier ?? 0;
  }

  return modifier;
}

export function fearLevelCalculateUpgradeAdjustment(
  placedRoom: PlacedRoom,
): number {
  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  let adjustment = 0;

  for (const effect of effects) {
    if (effect.type === 'fearReduction') {
      adjustment -= effect.value;
    } else if (effect.type === 'fearIncrease') {
      adjustment += effect.value;
    }
  }

  return adjustment;
}

export function fearLevelCalculateEffective(
  baseFear: number,
  inhabitantModifier: number,
  upgradeAdjustment: number,
  altarAuraReduction: number,
  propagatedFear: number = 0,
): number {
  const raw = baseFear + inhabitantModifier + upgradeAdjustment - altarAuraReduction + propagatedFear;
  return Math.max(FEAR_LEVEL_MIN, Math.min(FEAR_LEVEL_MAX, raw));
}

/**
 * Returns baseFear + inhabitantModifier (unclamped).
 * Used to determine if a room is a source of fear propagation.
 */
export function fearLevelCalculateSourceFear(
  baseFear: number,
  inhabitantModifier: number,
): number {
  return baseFear + inhabitantModifier;
}

/**
 * Returns the propagation amount for a given source fear level.
 * High (3) propagates +1, Very High (4+) propagates +2.
 * Below High returns 0.
 */
export function fearLevelCalculatePropagationAmount(sourceFear: number): number {
  if (sourceFear >= FEAR_LEVEL_VERY_HIGH) return 2;
  if (sourceFear >= FEAR_LEVEL_HIGH) return 1;
  return 0;
}

/**
 * Returns the max propagation distance for a room based on its assigned inhabitants.
 * Uses the highest fearPropagationDistance value among inhabitants.
 */
export function fearLevelGetMaxPropagationDistance(
  roomId: string,
  inhabitants: InhabitantInstance[],
): number {
  let maxDistance = FEAR_LEVEL_PROPAGATION_DEFAULT_DISTANCE;

  for (const inhabitant of inhabitants) {
    if (inhabitant.assignedRoomId !== roomId) continue;

    const def = contentGetEntry<InhabitantDefinition & IsContentItem>(
      inhabitant.definitionId,
    );
    if (!def) continue;

    const distance = def.fearPropagationDistance ?? FEAR_LEVEL_PROPAGATION_DEFAULT_DISTANCE;
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  }

  return maxDistance;
}

/**
 * Builds an adjacency map for all rooms on a floor using tile-based edge sharing.
 */
export function fearLevelBuildAdjacencyMap(floor: Floor): AdjacencyMap {
  const roomTiles = new Map<string, TileOffset[]>();
  for (const room of floor.rooms) {
    const shape = roomShapeResolve(room);
    roomTiles.set(
      room.id,
      roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
    );
  }

  const map: AdjacencyMap = {};
  for (const room of floor.rooms) {
    map[room.id] = [];
  }

  for (let i = 0; i < floor.rooms.length; i++) {
    const roomA = floor.rooms[i];
    const tilesA = roomTiles.get(roomA.id) ?? [];

    for (let j = i + 1; j < floor.rooms.length; j++) {
      const roomB = floor.rooms[j];
      const tilesB = roomTiles.get(roomB.id) ?? [];

      if (adjacencyAreRoomsAdjacent(tilesA, tilesB)) {
        map[roomA.id].push(roomB.id);
        map[roomB.id].push(roomA.id);
      }
    }
  }

  return map;
}

/**
 * Calculates propagated fear for all rooms on a floor.
 * Only rooms with source fear >= High (3) propagate fear.
 * Propagation attenuates by -1 per step beyond the first.
 */
export function fearLevelCalculateAllPropagation(
  adjacencyMap: AdjacencyMap,
  roomSourceFears: Map<string, number>,
  roomPropagationDistances: Map<string, number>,
  roomNames: Map<string, string>,
): Map<string, { total: number; sources: FearPropagationSource[] }> {
  const result = new Map<string, { total: number; sources: FearPropagationSource[] }>();

  for (const [sourceRoomId, sourceFear] of roomSourceFears) {
    const basePropagation = fearLevelCalculatePropagationAmount(sourceFear);
    if (basePropagation <= 0) continue;

    const maxDistance = roomPropagationDistances.get(sourceRoomId) ?? FEAR_LEVEL_PROPAGATION_DEFAULT_DISTANCE;

    // BFS from source room
    const visited = new Set<string>();
    visited.add(sourceRoomId);
    let currentLevel: string[] = [sourceRoomId];

    for (let distance = 1; distance <= maxDistance; distance++) {
      const nextLevel: string[] = [];

      for (const roomId of currentLevel) {
        const neighbors = adjacencyMap[roomId] ?? [];
        for (const neighbor of neighbors) {
          if (visited.has(neighbor)) continue;
          visited.add(neighbor);
          nextLevel.push(neighbor);

          // Calculate attenuated propagation
          const attenuated = basePropagation - (distance - 1);
          if (attenuated <= 0) continue;

          if (!result.has(neighbor)) {
            result.set(neighbor, { total: 0, sources: [] });
          }
          const entry = result.get(neighbor)!;
          entry.total += attenuated;
          entry.sources.push({
            sourceRoomId,
            sourceRoomName: roomNames.get(sourceRoomId) ?? 'Unknown Room',
            amount: attenuated,
          });
        }
      }

      currentLevel = nextLevel;
    }
  }

  return result;
}

export function fearLevelGetForRoom(
  floor: Floor,
  placedRoom: PlacedRoom,
  roomDef: RoomDefinition,
  throneRoomFear?: number,
): FearLevelBreakdown {
  const baseFear =
    roomDef.fearLevel === 'variable'
      ? (throneRoomFear ?? 0)
      : roomDef.fearLevel;

  const inhabitantModifier = fearLevelCalculateInhabitantModifier(
    placedRoom.id,
    floor.inhabitants,
  );

  const upgradeAdjustment = fearLevelCalculateUpgradeAdjustment(placedRoom);

  const altarAuraReduction = altarRoomIsAdjacent(floor, placedRoom)
    ? altarRoomGetFearReductionAura([floor])
    : 0;

  const effectiveFear = fearLevelCalculateEffective(
    baseFear,
    inhabitantModifier,
    upgradeAdjustment,
    altarAuraReduction,
  );

  return {
    baseFear,
    inhabitantModifier,
    upgradeAdjustment,
    altarAuraReduction,
    propagatedFear: 0,
    propagationSources: [],
    effectiveFear,
  };
}

export function fearLevelCalculateAllForFloor(
  floor: Floor,
  throneRoomFear?: number,
): Map<string, FearLevelBreakdown> {
  const result = new Map<string, FearLevelBreakdown>();
  const roomSourceFears = new Map<string, number>();
  const roomPropagationDistances = new Map<string, number>();
  const roomNames = new Map<string, string>();

  // First pass: compute individual breakdowns without propagation
  for (const placedRoom of floor.rooms) {
    const roomDef = productionGetRoomDefinition(placedRoom.roomTypeId);
    if (!roomDef) continue;

    const breakdown = fearLevelGetForRoom(
      floor,
      placedRoom,
      roomDef,
      throneRoomFear,
    );
    result.set(placedRoom.id, breakdown);

    // Source fear = baseFear + inhabitantModifier (unclamped, pre-upgrades/altar)
    const sourceFear = fearLevelCalculateSourceFear(
      breakdown.baseFear,
      breakdown.inhabitantModifier,
    );
    roomSourceFears.set(placedRoom.id, sourceFear);

    const maxDist = fearLevelGetMaxPropagationDistance(
      placedRoom.id,
      floor.inhabitants,
    );
    roomPropagationDistances.set(placedRoom.id, maxDist);

    roomNames.set(placedRoom.id, roomDef.name);
  }

  // Build adjacency map
  const adjacencyMap = fearLevelBuildAdjacencyMap(floor);

  // Second pass: calculate propagation
  const propagation = fearLevelCalculateAllPropagation(
    adjacencyMap,
    roomSourceFears,
    roomPropagationDistances,
    roomNames,
  );

  // Third pass: update breakdowns with propagation and recalculate effective fear
  for (const [roomId, breakdown] of result) {
    const prop = propagation.get(roomId);
    if (prop) {
      breakdown.propagatedFear = prop.total;
      breakdown.propagationSources = prop.sources;
      breakdown.effectiveFear = fearLevelCalculateEffective(
        breakdown.baseFear,
        breakdown.inhabitantModifier,
        breakdown.upgradeAdjustment,
        breakdown.altarAuraReduction,
        breakdown.propagatedFear,
      );
    }
  }

  return result;
}

// --- Computed signals ---

export const fearLevelBreakdownMap = computed<Map<string, FearLevelBreakdown>>(
  () => {
    const state = gamestate();
    const floors = state.world.floors;
    const throneRoomFear = throneRoomGetFearLevel(floors) ?? undefined;
    const combined = new Map<string, FearLevelBreakdown>();

    for (const floor of floors) {
      const floorMap = fearLevelCalculateAllForFloor(floor, throneRoomFear);
      for (const [roomId, breakdown] of floorMap) {
        combined.set(roomId, breakdown);
      }
    }

    return combined;
  },
);

export const fearLevelRoomMap = computed<Map<string, number>>(() => {
  const breakdowns = fearLevelBreakdownMap();
  const result = new Map<string, number>();

  for (const [roomId, breakdown] of breakdowns) {
    result.set(roomId, breakdown.effectiveFear);
  }

  return result;
});
