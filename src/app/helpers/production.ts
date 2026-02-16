import { computed } from '@angular/core';
import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntry } from '@helpers/content';
import { dayNightCalculateCreatureProductionModifier, dayNightGetResourceModifier } from '@helpers/day-night-modifiers';
import { featureApplyResourceConversion, featureCalculateAdjacentProductionBonus, featureCalculateFlatProduction, featureCalculateProductionBonus } from '@helpers/features';
import { floorModifierGetMultiplier } from '@helpers/floor-modifiers';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { productionModifierCalculate } from '@helpers/production-modifiers';
import { resourceEffectiveMax } from '@helpers/resources';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
import { seasonBonusGetResourceModifier } from '@helpers/season-bonuses';
import { seasonalEventGetProductionModifier } from '@helpers/seasonal-event';
import { stateModifierCalculatePerCreatureProduction } from '@helpers/state-modifiers';
import { gamestate } from '@helpers/state-game';
import type {
  ActiveSeasonalEffect,
  Floor,
  GameState,
  InhabitantInstance,
  PlacedRoom,
  PlacedRoomId,
  ResourceType,
  RoomId,
  RoomProduction,
  Season,
  TileOffset,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type { InhabitantBonusResult, ActiveAdjacencyBonus, ResourceProductionBreakdown } from '@interfaces/production';

export function productionGetBase(roomTypeId: RoomId): RoomProduction {
  const room = contentGetEntry<RoomContent>(roomTypeId);
  if (!room) return {};
  return room.production ?? {};
}

export function productionGetRoomDefinition(
  roomTypeId: RoomId,
): RoomContent | undefined {
  return contentGetEntry<RoomContent>(roomTypeId);
}

export function productionGetInhabitantDefinition(
  definitionId: string,
): InhabitantContent | undefined {
  return contentGetEntry<InhabitantContent>(definitionId);
}

export function productionCalculateInhabitantBonus(
  placedRoom: PlacedRoom,
  inhabitants: InhabitantInstance[],
): InhabitantBonusResult {
  const assignedInhabitants = inhabitants.filter(
    (i) => i.assignedRoomId === placedRoom.id &&
      !(i.travelTicksRemaining !== undefined && i.travelTicksRemaining > 0),
  );

  if (assignedInhabitants.length === 0) {
    return { bonus: 0, hasWorkers: false };
  }

  const roomDef = productionGetRoomDefinition(placedRoom.roomTypeId);
  const roomProduction = roomDef?.production ?? {};

  let totalBonus = 0;

  for (const inhabitant of assignedInhabitants) {
    const def = contentGetEntry<InhabitantContent>(
      inhabitant.definitionId,
    );
    if (!def) continue;

    totalBonus += def.stats.workerEfficiency - 1.0;

    for (const trait of def.traits) {
      if (trait.effectType === 'production_bonus') {
        // Skip trait if it targets a specific room and this room doesn't match
        if (trait.targetRoomName && roomDef?.name !== trait.targetRoomName) continue;

        // Only apply trait if it targets this room's production or has no target
        if (
          !trait.targetResourceType ||
          trait.targetResourceType === 'all' ||
          (roomProduction[trait.targetResourceType] !== undefined &&
            roomProduction[trait.targetResourceType]! > 0)
        ) {
          totalBonus += trait.effectValue;
        }
      }
    }
  }

  return { bonus: totalBonus, hasWorkers: true };
}

export function productionCalculateAdjacencyBonus(
  placedRoom: PlacedRoom,
  adjacentRoomIds: string[],
  allPlacedRooms: PlacedRoom[],
): number {
  const roomDef = productionGetRoomDefinition(placedRoom.roomTypeId);
  if (!roomDef) return 0;

  const bonusRules = roomDef.adjacencyBonuses;
  if (bonusRules.length === 0) return 0;

  const adjacentRoomTypeIds = new Map<string, number>();
  for (const adjId of adjacentRoomIds) {
    const adjRoom = allPlacedRooms.find((r) => r.id === adjId);
    if (!adjRoom) continue;
    const count = adjacentRoomTypeIds.get(adjRoom.roomTypeId) ?? 0;
    adjacentRoomTypeIds.set(adjRoom.roomTypeId, count + 1);
  }

  let totalBonus = 0;
  for (const rule of bonusRules) {
    const matchCount = adjacentRoomTypeIds.get(rule.adjacentRoomId) ?? 0;
    totalBonus += rule.bonus * matchCount;
  }

  return totalBonus;
}

export function productionGetActiveAdjacencyBonuses(
  placedRoom: PlacedRoom,
  floor: Floor,
): ActiveAdjacencyBonus[] {
  const roomDef = productionGetRoomDefinition(placedRoom.roomTypeId);
  if (!roomDef) return [];

  const bonusRules = roomDef.adjacencyBonuses;
  if (bonusRules.length === 0) return [];

  const roomTiles = new Map<string, TileOffset[]>();
  for (const room of floor.rooms) {
    const shape = roomShapeResolve(room);
    roomTiles.set(
      room.id,
      roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
    );
  }

  const thisTiles = roomTiles.get(placedRoom.id) ?? [];
  const activeBonuses: ActiveAdjacencyBonus[] = [];

  for (const other of floor.rooms) {
    if (other.id === placedRoom.id) continue;
    const otherTiles = roomTiles.get(other.id) ?? [];
    if (!adjacencyAreRoomsAdjacent(thisTiles, otherTiles)) continue;

    for (const rule of bonusRules) {
      if (rule.adjacentRoomId === other.roomTypeId) {
        const otherDef = productionGetRoomDefinition(other.roomTypeId);
        activeBonuses.push({
          sourceRoomId: other.id,
          sourceRoomName: otherDef?.name ?? 'Unknown Room',
          bonus: rule.bonus,
          description: rule.description,
        });
      }
    }
  }

  return activeBonuses;
}

export function productionCalculateConditionalModifiers(
  placedRoom: PlacedRoom,
  inhabitants: InhabitantInstance[],
): number {
  const assigned = inhabitants.filter(
    (i) => i.assignedRoomId === placedRoom.id,
  );

  if (assigned.length === 0) return 1.0;

  return stateModifierCalculatePerCreatureProduction(assigned);
}

export function productionCalculateTotal(floors: Floor[], hour?: number, season?: Season, activeSeasonalEffects?: ActiveSeasonalEffect[]): RoomProduction {
  const totalProduction: RoomProduction = {};

  for (const floor of floors) {
    const roomTiles = new Map<string, TileOffset[]>();
    for (const room of floor.rooms) {
      const shape = roomShapeResolve(room);
      roomTiles.set(
        room.id,
        roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
      );
    }

    for (const room of floor.rooms) {
      const roomDef = productionGetRoomDefinition(room.roomTypeId);
      if (!roomDef) continue;

      const base = roomDef.production;
      if (!base || Object.keys(base).length === 0) continue;

      const { bonus: inhabitantBonus, hasWorkers } = productionCalculateInhabitantBonus(
        room,
        floor.inhabitants,
      );

      if (roomDef.requiresWorkers && !hasWorkers) continue;

      const thisTiles = roomTiles.get(room.id) ?? [];
      const adjacentRoomIds: string[] = [];
      for (const other of floor.rooms) {
        if (other.id === room.id) continue;
        const otherTiles = roomTiles.get(other.id) ?? [];
        if (adjacencyAreRoomsAdjacent(thisTiles, otherTiles)) {
          adjacentRoomIds.push(other.id);
        }
      }

      const adjacencyBonus = productionCalculateAdjacencyBonus(
        room,
        adjacentRoomIds,
        floor.rooms,
      );
      const adjacentPlacedRooms = adjacentRoomIds
        .map((id) => floor.rooms.find((r) => r.id === id))
        .filter((r): r is PlacedRoom => r !== undefined);
      const featureAdjacentBonus = featureCalculateAdjacentProductionBonus(adjacentPlacedRooms);
      const stateModifier = productionCalculateConditionalModifiers(room, floor.inhabitants);
      const envModifier = hour !== undefined
        ? productionModifierCalculate({
            roomTypeId: room.roomTypeId,
            floorDepth: floor.depth,
            floorBiome: floor.biome,
            hour,
          })
        : 1.0;
      const creatureModifier = hour !== undefined
        ? dayNightCalculateCreatureProductionModifier(hour, floor.inhabitants, room.id)
        : 1.0;

      let roomProduction: RoomProduction = {};
      for (const [resourceType, baseAmount] of Object.entries(base)) {
        if (!baseAmount) continue;
        const depthModifier = floorModifierGetMultiplier(floor.depth, resourceType);
        const dayNightResourceMod = hour !== undefined
          ? dayNightGetResourceModifier(hour, resourceType)
          : 1.0;
        const seasonMod = season
          ? seasonBonusGetResourceModifier(season, resourceType)
          : 1.0;
        const seasonalEventMod = activeSeasonalEffects
          ? seasonalEventGetProductionModifier(activeSeasonalEffects, resourceType as ResourceType)
          : 1.0;
        const featureProductionBonus = featureCalculateProductionBonus(room, resourceType);
        const final =
          baseAmount * (1 + inhabitantBonus + adjacencyBonus + featureAdjacentBonus + featureProductionBonus) * stateModifier * envModifier * depthModifier * dayNightResourceMod * seasonMod * seasonalEventMod * creatureModifier;
        roomProduction[resourceType] =
          (roomProduction[resourceType] ?? 0) + final;
      }

      // Add flat production from features (e.g. Arcane Crystals +1 Flux/min)
      const flatProduction = featureCalculateFlatProduction(room, GAME_TIME_TICKS_PER_MINUTE);
      for (const [resourceType, amount] of Object.entries(flatProduction)) {
        if (!amount) continue;
        roomProduction[resourceType] = (roomProduction[resourceType] ?? 0) + amount;
      }

      // Apply resource conversion if active
      roomProduction = featureApplyResourceConversion(roomProduction, room);

      for (const [resourceType, amount] of Object.entries(roomProduction)) {
        if (!amount) continue;
        totalProduction[resourceType] =
          (totalProduction[resourceType] ?? 0) + amount;
      }
    }
  }

  return totalProduction;
}

export function productionCalculateSingleRoom(
  room: PlacedRoom,
  floor: Floor,
  hour?: number,
  season?: Season,
  activeSeasonalEffects?: ActiveSeasonalEffect[],
): RoomProduction {
  const roomDef = productionGetRoomDefinition(room.roomTypeId);
  if (!roomDef) return {};

  const base = roomDef.production;
  if (!base || Object.keys(base).length === 0) return {};

  const { bonus: inhabitantBonus, hasWorkers } = productionCalculateInhabitantBonus(
    room,
    floor.inhabitants,
  );

  if (roomDef.requiresWorkers && !hasWorkers) return {};

  const roomTiles = new Map<string, TileOffset[]>();
  for (const r of floor.rooms) {
    const shape = roomShapeResolve(r);
    roomTiles.set(r.id, roomShapeGetAbsoluteTiles(shape, r.anchorX, r.anchorY));
  }

  const thisTiles = roomTiles.get(room.id) ?? [];
  const adjacentRoomIds: string[] = [];
  for (const other of floor.rooms) {
    if (other.id === room.id) continue;
    const otherTiles = roomTiles.get(other.id) ?? [];
    if (adjacencyAreRoomsAdjacent(thisTiles, otherTiles)) {
      adjacentRoomIds.push(other.id);
    }
  }

  const adjacencyBonus = productionCalculateAdjacencyBonus(
    room,
    adjacentRoomIds,
    floor.rooms,
  );
  const adjacentPlacedRooms = adjacentRoomIds
    .map((id) => floor.rooms.find((r) => r.id === id))
    .filter((r): r is PlacedRoom => r !== undefined);
  const featureAdjacentBonus = featureCalculateAdjacentProductionBonus(adjacentPlacedRooms);
  const stateModifier = productionCalculateConditionalModifiers(room, floor.inhabitants);
  const envModifier = hour !== undefined
    ? productionModifierCalculate({
        roomTypeId: room.roomTypeId,
        floorDepth: floor.depth,
        floorBiome: floor.biome,
        hour,
      })
    : 1.0;
  const creatureModifier = hour !== undefined
    ? dayNightCalculateCreatureProductionModifier(hour, floor.inhabitants, room.id)
    : 1.0;

  let production: RoomProduction = {};
  for (const [resourceType, baseAmount] of Object.entries(base)) {
    if (!baseAmount) continue;
    const depthModifier = floorModifierGetMultiplier(floor.depth, resourceType);
    const dayNightResourceMod = hour !== undefined
      ? dayNightGetResourceModifier(hour, resourceType)
      : 1.0;
    const seasonMod = season
      ? seasonBonusGetResourceModifier(season, resourceType)
      : 1.0;
    const seasonalEventMod = activeSeasonalEffects
      ? seasonalEventGetProductionModifier(activeSeasonalEffects, resourceType as ResourceType)
      : 1.0;
    const featureProductionBonus = featureCalculateProductionBonus(room, resourceType);
    production[resourceType] =
      baseAmount * (1 + inhabitantBonus + adjacencyBonus + featureAdjacentBonus + featureProductionBonus) * stateModifier * envModifier * depthModifier * dayNightResourceMod * seasonMod * seasonalEventMod * creatureModifier;
  }

  // Add flat production from features
  const flatProduction = featureCalculateFlatProduction(room, GAME_TIME_TICKS_PER_MINUTE);
  for (const [resourceType, amount] of Object.entries(flatProduction)) {
    if (!amount) continue;
    production[resourceType] = (production[resourceType] ?? 0) + amount;
  }

  // Apply resource conversion if active
  production = featureApplyResourceConversion(production, room);

  return production;
}

export const productionRates = computed<RoomProduction>(() => {
  const state = gamestate();
  return productionCalculateTotal(state.world.floors, state.clock.hour, state.world.season.currentSeason, state.world.seasonalEvent.activeEffects);
});

export function productionPerMinute(perTickRate: number): number {
  return perTickRate * GAME_TIME_TICKS_PER_MINUTE;
}

export function productionGetRoomRates(roomId: PlacedRoomId): RoomProduction {
  const state = gamestate();
  for (const floor of state.world.floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (room) {
      return productionCalculateSingleRoom(room, floor, state.clock.hour, state.world.season.currentSeason, state.world.seasonalEvent.activeEffects);
    }
  }
  return {};
}

export function productionCalculateBreakdowns(
  floors: Floor[],
  hour?: number,
  season?: Season,
  activeSeasonalEffects?: ActiveSeasonalEffect[],
): Record<string, ResourceProductionBreakdown> {
  const breakdowns: Record<string, ResourceProductionBreakdown> = {};

  for (const floor of floors) {
    const roomTiles = new Map<string, TileOffset[]>();
    for (const room of floor.rooms) {
      const shape = roomShapeResolve(room);
      roomTiles.set(
        room.id,
        roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
      );
    }

    for (const room of floor.rooms) {
      const roomDef = productionGetRoomDefinition(room.roomTypeId);
      if (!roomDef) continue;

      const base = roomDef.production;
      if (!base || Object.keys(base).length === 0) continue;

      const { bonus: inhabitantBonus, hasWorkers } = productionCalculateInhabitantBonus(
        room,
        floor.inhabitants,
      );

      if (roomDef.requiresWorkers && !hasWorkers) continue;

      const thisTiles = roomTiles.get(room.id) ?? [];
      const adjacentRoomIds: string[] = [];
      for (const other of floor.rooms) {
        if (other.id === room.id) continue;
        const otherTiles = roomTiles.get(other.id) ?? [];
        if (adjacencyAreRoomsAdjacent(thisTiles, otherTiles)) {
          adjacentRoomIds.push(other.id);
        }
      }

      const adjacencyBonusVal = productionCalculateAdjacencyBonus(
        room,
        adjacentRoomIds,
        floor.rooms,
      );
      const adjacentPlacedRooms = adjacentRoomIds
        .map((id) => floor.rooms.find((r) => r.id === id))
        .filter((r): r is PlacedRoom => r !== undefined);
      const featureAdjacentBonus = featureCalculateAdjacentProductionBonus(adjacentPlacedRooms);
      const stateModifier = productionCalculateConditionalModifiers(room, floor.inhabitants);
      const envModifier = hour !== undefined
        ? productionModifierCalculate({
            roomTypeId: room.roomTypeId,
            floorDepth: floor.depth,
            floorBiome: floor.biome,
            hour,
          })
        : 1.0;
      const creatureModifier = hour !== undefined
        ? dayNightCalculateCreatureProductionModifier(hour, floor.inhabitants, room.id)
        : 1.0;
      for (const [resourceType, baseAmount] of Object.entries(base)) {
        if (!baseAmount) continue;

        const depthModifier = floorModifierGetMultiplier(floor.depth, resourceType);
        const dayNightResourceMod = hour !== undefined
          ? dayNightGetResourceModifier(hour, resourceType)
          : 1.0;
        const seasonMod = season
          ? seasonBonusGetResourceModifier(season, resourceType)
          : 1.0;
        const seasonalEventMod = activeSeasonalEffects
          ? seasonalEventGetProductionModifier(activeSeasonalEffects, resourceType as ResourceType)
          : 1.0;
        const featureProductionBonus = featureCalculateProductionBonus(room, resourceType);
        const modifier = stateModifier * envModifier * depthModifier * dayNightResourceMod * seasonMod * seasonalEventMod * creatureModifier;
        const withBonuses = baseAmount * (1 + inhabitantBonus + adjacencyBonusVal + featureAdjacentBonus + featureProductionBonus);
        const finalAmount = withBonuses * modifier;

        if (!breakdowns[resourceType]) {
          breakdowns[resourceType] = {
            base: 0,
            inhabitantBonus: 0,
            adjacencyBonus: 0,
            modifierEffect: 0,
            final: 0,
          };
        }

        breakdowns[resourceType].base += baseAmount;
        breakdowns[resourceType].inhabitantBonus +=
          baseAmount * inhabitantBonus;
        breakdowns[resourceType].adjacencyBonus +=
          baseAmount * adjacencyBonusVal;
        breakdowns[resourceType].modifierEffect += finalAmount - withBonuses;
        breakdowns[resourceType].final += finalAmount;
      }
    }
  }

  return breakdowns;
}

export const productionBreakdowns = computed(() => {
  const state = gamestate();
  return productionCalculateBreakdowns(state.world.floors, state.clock.hour, state.world.season.currentSeason, state.world.seasonalEvent.activeEffects);
});

export function productionProcess(state: GameState): void {
  const production = productionCalculateTotal(state.world.floors, state.clock.hour, state.world.season.currentSeason, state.world.seasonalEvent.activeEffects);

  for (const [type, amount] of Object.entries(production)) {
    if (!amount || amount <= 0) continue;
    const resourceType = type as ResourceType;
    const resource = state.world.resources[resourceType];
    if (!resource) continue;
    const effectiveMax = resourceEffectiveMax(resource.max, resourceType, state.world.floors);
    const available = effectiveMax - resource.current;
    resource.current += Math.min(amount as number, available);
  }
}
