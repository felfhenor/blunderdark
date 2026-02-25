import { computed } from '@angular/core';
import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import {
  connectivityGetConnectedRoomIds,
  connectivityGetDisconnectedRoomIds,
} from '@helpers/connectivity';
import { contentGetEntry } from '@helpers/content';
import {
  dayNightCalculateCreatureProductionModifier,
  dayNightGetResourceModifier,
} from '@helpers/day-night-modifiers';
import {
  featureApplyResourceConversion,
  featureCalculateAdjacentProductionBonus,
  featureCalculateFlatProduction,
  featureCalculateProductionBonus,
  featureGetResourceConverterEfficiency,
} from '@helpers/features';
import { floorModifierGetMultiplier } from '@helpers/floor-modifiers';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import {
  productionModifierCalculate,
  productionModifierEvaluate,
} from '@helpers/production-modifiers';
import { resourceAdd } from '@helpers/resources';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import {
  roomGetDisplayName,
  roomUpgradeGetProductionMultiplier,
  roomUpgradeGetSecondaryProduction,
} from '@helpers/room-upgrades';
import { seasonBonusGetResourceModifier } from '@helpers/season-bonuses';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { gamestate } from '@helpers/state-game';
import { throneRoomGetRulerBonusValue } from '@helpers/throne-room';
import { stateModifierCalculatePerCreatureProduction } from '@helpers/state-modifiers';
import type {
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
import type {
  ActiveAdjacencyBonus,
  InhabitantBonusResult,
  ModifierDetail,
  ResourceProductionBreakdown,
  RoomProductionDetail,
} from '@interfaces/production';

function productionGetResearchMultiplier(resourceType: string): number {
  const resourceBonus = researchUnlockGetPassiveBonusWithMastery(`${resourceType}Production`);
  const allBonus = researchUnlockGetPassiveBonusWithMastery('allProduction');

  // Throne room ruler production bonuses
  const floors = gamestate()?.world?.floors;
  let rulerBonus = 0;
  if (floors) {
    if (resourceType === 'flux') {
      rulerBonus = throneRoomGetRulerBonusValue(floors, 'fluxProduction');
    } else if (resourceType === 'food') {
      rulerBonus = throneRoomGetRulerBonusValue(floors, 'foodProduction');
    }
  }

  return 1 + resourceBonus + allBonus + rulerBonus;
}

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
    (i) =>
      i.assignedRoomId === placedRoom.id &&
      !(i.travelTicksRemaining !== undefined && i.travelTicksRemaining > 0),
  );

  if (assignedInhabitants.length === 0) {
    return { bonus: 0, hasWorkers: false };
  }

  const roomDef = productionGetRoomDefinition(placedRoom.roomTypeId);
  const roomProduction = roomDef?.production ?? {};

  let totalBonus = 0;

  for (const inhabitant of assignedInhabitants) {
    const def = contentGetEntry<InhabitantContent>(inhabitant.definitionId);
    if (!def) continue;

    totalBonus += def.stats.workerEfficiency - 1.0;

    for (const trait of def.traits) {
      if (trait.effectType === 'production_bonus') {
        // Skip trait if it targets a specific room and this room doesn't match
        if (trait.targetRoomId && roomDef?.id !== trait.targetRoomId) continue;

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
  floors?: Floor[],
): ActiveAdjacencyBonus[] {
  const roomDef = productionGetRoomDefinition(placedRoom.roomTypeId);
  if (!roomDef) return [];

  const bonusRules = roomDef.adjacencyBonuses;
  if (bonusRules.length === 0) return [];

  const connectedIds = floors
    ? connectivityGetConnectedRoomIds(floor, floors)
    : undefined;

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
    if (connectedIds && !connectedIds.has(other.id)) continue;
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

export function productionCalculateTotal(
  floors: Floor[],
  hour?: number,
  season?: Season,
): RoomProduction {
  const totalProduction: RoomProduction = {};

  for (const floor of floors) {
    const connectedIds = connectivityGetConnectedRoomIds(floor, floors);

    const roomTiles = new Map<string, TileOffset[]>();
    for (const room of floor.rooms) {
      const shape = roomShapeResolve(room);
      roomTiles.set(
        room.id,
        roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
      );
    }

    for (const room of floor.rooms) {
      if (!connectedIds.has(room.id)) continue;

      const roomDef = productionGetRoomDefinition(room.roomTypeId);
      if (!roomDef) continue;

      const base = roomDef.production;
      if (!base || Object.keys(base).length === 0) continue;

      const { bonus: inhabitantBonus, hasWorkers } =
        productionCalculateInhabitantBonus(room, floor.inhabitants);

      if (roomDef.requiresWorkers && !hasWorkers) continue;

      const thisTiles = roomTiles.get(room.id) ?? [];
      const adjacentRoomIds: string[] = [];
      for (const other of floor.rooms) {
        if (other.id === room.id) continue;
        if (!connectedIds.has(other.id)) continue;
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
      const featureAdjacentBonus =
        featureCalculateAdjacentProductionBonus(adjacentPlacedRooms);
      const stateModifier = productionCalculateConditionalModifiers(
        room,
        floor.inhabitants,
      );
      const envModifier =
        hour !== undefined
          ? productionModifierCalculate({
              roomTypeId: room.roomTypeId,
              floorDepth: floor.depth,
              floorBiome: floor.biome,
              hour,
            })
          : 1.0;
      const creatureModifier =
        hour !== undefined
          ? dayNightCalculateCreatureProductionModifier(
              hour,
              floor.inhabitants,
              room.id,
            )
          : 1.0;

      let roomProduction: RoomProduction = {};
      for (const [resourceType, baseAmount] of Object.entries(base)) {
        if (!baseAmount) continue;
        const depthModifier = floorModifierGetMultiplier(
          floor.depth,
          resourceType,
        );
        const dayNightResourceMod =
          hour !== undefined
            ? dayNightGetResourceModifier(hour, resourceType)
            : 1.0;
        const seasonMod = season
          ? seasonBonusGetResourceModifier(season, resourceType)
          : 1.0;
        const featureProductionBonus = featureCalculateProductionBonus(
          room,
          resourceType,
        );
        const researchMultiplier = productionGetResearchMultiplier(resourceType);
        const final =
          baseAmount *
          (1 +
            inhabitantBonus +
            adjacencyBonus +
            featureAdjacentBonus +
            featureProductionBonus) *
          stateModifier *
          envModifier *
          depthModifier *
          dayNightResourceMod *
          seasonMod *
          creatureModifier *
          researchMultiplier;
        roomProduction[resourceType] =
          (roomProduction[resourceType] ?? 0) + final;
      }

      // Add flat production from features (e.g. Arcane Crystals +1 Flux/min)
      const flatProduction = featureCalculateFlatProduction(
        room,
        GAME_TIME_TICKS_PER_MINUTE,
      );
      for (const [resourceType, amount] of Object.entries(flatProduction)) {
        if (!amount) continue;
        roomProduction[resourceType] =
          (roomProduction[resourceType] ?? 0) + amount;
      }

      // Apply resource conversion if active
      roomProduction = featureApplyResourceConversion(roomProduction, room);

      // Apply production multiplier from upgrades
      const upgradeMultiplier = roomUpgradeGetProductionMultiplier(room);
      if (upgradeMultiplier !== 1.0) {
        for (const key of Object.keys(roomProduction)) {
          roomProduction[key] = (roomProduction[key] ?? 0) * upgradeMultiplier;
        }
      }

      // Add secondary production from upgrades (flat bonus, not affected by modifiers)
      const secondaryProduction = roomUpgradeGetSecondaryProduction(room);
      for (const [resourceType, amount] of Object.entries(secondaryProduction)) {
        if (!amount) continue;
        roomProduction[resourceType] =
          (roomProduction[resourceType] ?? 0) + amount;
      }

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
  floors?: Floor[],
): RoomProduction {
  // If floors provided, check connectivity
  if (floors) {
    const disconnected = connectivityGetDisconnectedRoomIds(floor, floors);
    if (disconnected.has(room.id)) return {};
  }

  const roomDef = productionGetRoomDefinition(room.roomTypeId);
  if (!roomDef) return {};

  const base = roomDef.production;
  if (!base || Object.keys(base).length === 0) return {};

  const { bonus: inhabitantBonus, hasWorkers } =
    productionCalculateInhabitantBonus(room, floor.inhabitants);

  if (roomDef.requiresWorkers && !hasWorkers) return {};

  const roomTiles = new Map<string, TileOffset[]>();
  for (const r of floor.rooms) {
    const shape = roomShapeResolve(r);
    roomTiles.set(r.id, roomShapeGetAbsoluteTiles(shape, r.anchorX, r.anchorY));
  }

  const connectedIds = floors
    ? connectivityGetConnectedRoomIds(floor, floors)
    : undefined;

  const thisTiles = roomTiles.get(room.id) ?? [];
  const adjacentRoomIds: string[] = [];
  for (const other of floor.rooms) {
    if (other.id === room.id) continue;
    if (connectedIds && !connectedIds.has(other.id)) continue;
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
  const featureAdjacentBonus =
    featureCalculateAdjacentProductionBonus(adjacentPlacedRooms);
  const stateModifier = productionCalculateConditionalModifiers(
    room,
    floor.inhabitants,
  );
  const envModifier =
    hour !== undefined
      ? productionModifierCalculate({
          roomTypeId: room.roomTypeId,
          floorDepth: floor.depth,
          floorBiome: floor.biome,
          hour,
        })
      : 1.0;
  const creatureModifier =
    hour !== undefined
      ? dayNightCalculateCreatureProductionModifier(
          hour,
          floor.inhabitants,
          room.id,
        )
      : 1.0;

  let production: RoomProduction = {};
  for (const [resourceType, baseAmount] of Object.entries(base)) {
    if (!baseAmount) continue;
    const depthModifier = floorModifierGetMultiplier(floor.depth, resourceType);
    const dayNightResourceMod =
      hour !== undefined
        ? dayNightGetResourceModifier(hour, resourceType)
        : 1.0;
    const seasonMod = season
      ? seasonBonusGetResourceModifier(season, resourceType)
      : 1.0;
    const featureProductionBonus = featureCalculateProductionBonus(
      room,
      resourceType,
    );
    const researchMultiplier = productionGetResearchMultiplier(resourceType);
    production[resourceType] =
      baseAmount *
      (1 +
        inhabitantBonus +
        adjacencyBonus +
        featureAdjacentBonus +
        featureProductionBonus) *
      stateModifier *
      envModifier *
      depthModifier *
      dayNightResourceMod *
      seasonMod *
      creatureModifier *
      researchMultiplier;
  }

  // Add flat production from features
  const flatProduction = featureCalculateFlatProduction(
    room,
    GAME_TIME_TICKS_PER_MINUTE,
  );
  for (const [resourceType, amount] of Object.entries(flatProduction)) {
    if (!amount) continue;
    production[resourceType] = (production[resourceType] ?? 0) + amount;
  }

  // Apply resource conversion if active
  production = featureApplyResourceConversion(production, room);

  // Apply production multiplier from upgrades
  const upgradeMultiplier = roomUpgradeGetProductionMultiplier(room);
  if (upgradeMultiplier !== 1.0) {
    for (const key of Object.keys(production)) {
      production[key] = (production[key] ?? 0) * upgradeMultiplier;
    }
  }

  // Add secondary production from upgrades (flat bonus, not affected by modifiers)
  const secondaryProduction = roomUpgradeGetSecondaryProduction(room);
  for (const [resourceType, amount] of Object.entries(secondaryProduction)) {
    if (!amount) continue;
    production[resourceType] = (production[resourceType] ?? 0) + amount;
  }

  return production;
}

export const productionRates = computed<RoomProduction>(() => {
  const state = gamestate();
  return productionCalculateTotal(
    state.world.floors,
    state.clock.hour,
    state.world.season.currentSeason,
  );
});

export function productionPerMinute(perTickRate: number): number {
  return perTickRate * GAME_TIME_TICKS_PER_MINUTE;
}

export function productionGetRoomRates(roomId: PlacedRoomId): RoomProduction {
  const state = gamestate();
  for (const floor of state.world.floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (room) {
      return productionCalculateSingleRoom(
        room,
        floor,
        state.clock.hour,
        state.world.season.currentSeason,
        state.world.floors,
      );
    }
  }
  return {};
}

export function productionCalculateBreakdowns(
  floors: Floor[],
  hour?: number,
  season?: Season,
): Record<string, ResourceProductionBreakdown> {
  const breakdowns: Record<string, ResourceProductionBreakdown> = {};

  for (const floor of floors) {
    const connectedIds = connectivityGetConnectedRoomIds(floor, floors);

    const roomTiles = new Map<string, TileOffset[]>();
    for (const room of floor.rooms) {
      const shape = roomShapeResolve(room);
      roomTiles.set(
        room.id,
        roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
      );
    }

    for (const room of floor.rooms) {
      if (!connectedIds.has(room.id)) continue;

      const roomDef = productionGetRoomDefinition(room.roomTypeId);
      if (!roomDef) continue;

      const base = roomDef.production;
      if (!base || Object.keys(base).length === 0) continue;

      const { bonus: inhabitantBonus, hasWorkers } =
        productionCalculateInhabitantBonus(room, floor.inhabitants);

      if (roomDef.requiresWorkers && !hasWorkers) continue;

      const thisTiles = roomTiles.get(room.id) ?? [];
      const adjacentRoomIds: string[] = [];
      for (const other of floor.rooms) {
        if (other.id === room.id) continue;
        if (!connectedIds.has(other.id)) continue;
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
      const featureAdjacentBonus =
        featureCalculateAdjacentProductionBonus(adjacentPlacedRooms);
      const stateModifier = productionCalculateConditionalModifiers(
        room,
        floor.inhabitants,
      );
      const envModifier =
        hour !== undefined
          ? productionModifierCalculate({
              roomTypeId: room.roomTypeId,
              floorDepth: floor.depth,
              floorBiome: floor.biome,
              hour,
            })
          : 1.0;
      const creatureModifier =
        hour !== undefined
          ? dayNightCalculateCreatureProductionModifier(
              hour,
              floor.inhabitants,
              room.id,
            )
          : 1.0;
      for (const [resourceType, baseAmount] of Object.entries(base)) {
        if (!baseAmount) continue;

        const depthModifier = floorModifierGetMultiplier(
          floor.depth,
          resourceType,
        );
        const dayNightResourceMod =
          hour !== undefined
            ? dayNightGetResourceModifier(hour, resourceType)
            : 1.0;
        const seasonMod = season
          ? seasonBonusGetResourceModifier(season, resourceType)
          : 1.0;
        const featureProductionBonus = featureCalculateProductionBonus(
          room,
          resourceType,
        );
        const researchMultiplier = productionGetResearchMultiplier(resourceType);
        const modifier =
          stateModifier *
          envModifier *
          depthModifier *
          dayNightResourceMod *
          seasonMod *
          creatureModifier;
        const withBonuses =
          baseAmount *
          (1 +
            inhabitantBonus +
            adjacencyBonusVal +
            featureAdjacentBonus +
            featureProductionBonus);
        const afterModifiers = withBonuses * modifier;
        const finalAmount = afterModifiers * researchMultiplier;

        if (!breakdowns[resourceType]) {
          breakdowns[resourceType] = {
            base: 0,
            inhabitantBonus: 0,
            adjacencyBonus: 0,
            modifierEffect: 0,
            researchBonus: 0,
            final: 0,
          };
        }

        breakdowns[resourceType].base += baseAmount;
        breakdowns[resourceType].inhabitantBonus +=
          baseAmount * inhabitantBonus;
        breakdowns[resourceType].adjacencyBonus +=
          baseAmount * adjacencyBonusVal;
        breakdowns[resourceType].modifierEffect += afterModifiers - withBonuses;
        breakdowns[resourceType].researchBonus += finalAmount - afterModifiers;
        breakdowns[resourceType].final += finalAmount;
      }

      // Apply production multiplier from upgrades to breakdown finals
      const upgradeMultiplier = roomUpgradeGetProductionMultiplier(room);
      if (upgradeMultiplier !== 1.0) {
        for (const [resourceType, baseAmount] of Object.entries(base)) {
          if (!baseAmount || !breakdowns[resourceType]) continue;
          const prevFinal = breakdowns[resourceType].final;
          breakdowns[resourceType].final =
            prevFinal * upgradeMultiplier;
          breakdowns[resourceType].modifierEffect +=
            prevFinal * (upgradeMultiplier - 1);
        }
      }

      // Add secondary production from upgrades to breakdowns
      const secondaryProduction = roomUpgradeGetSecondaryProduction(room);
      for (const [resourceType, amount] of Object.entries(
        secondaryProduction,
      )) {
        if (!amount) continue;
        if (!breakdowns[resourceType]) {
          breakdowns[resourceType] = {
            base: 0,
            inhabitantBonus: 0,
            adjacencyBonus: 0,
            modifierEffect: 0,
            researchBonus: 0,
            final: 0,
          };
        }
        breakdowns[resourceType].base += amount;
        breakdowns[resourceType].final += amount;
      }
    }
  }

  return breakdowns;
}

export function productionCalculateDetailedBreakdown(
  floors: Floor[],
  resourceType: string,
  hour?: number,
  season?: Season,
): RoomProductionDetail[] {
  const details: RoomProductionDetail[] = [];

  for (const floor of floors) {
    const connectedIds = connectivityGetConnectedRoomIds(floor, floors);

    const roomTiles = new Map<string, TileOffset[]>();
    for (const room of floor.rooms) {
      const shape = roomShapeResolve(room);
      roomTiles.set(
        room.id,
        roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
      );
    }

    for (const room of floor.rooms) {
      if (!connectedIds.has(room.id)) continue;

      const roomDef = productionGetRoomDefinition(room.roomTypeId);
      if (!roomDef) continue;

      const base = roomDef.production;
      if (!base || Object.keys(base).length === 0) continue;

      const { bonus: inhabitantBonusVal, hasWorkers } =
        productionCalculateInhabitantBonus(room, floor.inhabitants);

      if (roomDef.requiresWorkers && !hasWorkers) continue;

      const assignedWorkers = floor.inhabitants.filter(
        (i) =>
          i.assignedRoomId === room.id &&
          !(
            i.travelTicksRemaining !== undefined &&
            i.travelTicksRemaining > 0
          ),
      );

      const thisTiles = roomTiles.get(room.id) ?? [];
      const adjacentRoomIds: string[] = [];
      for (const other of floor.rooms) {
        if (other.id === room.id) continue;
        if (!connectedIds.has(other.id)) continue;
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
      const featureAdjacentBonus =
        featureCalculateAdjacentProductionBonus(adjacentPlacedRooms);
      const featureProductionBonus = featureCalculateProductionBonus(
        room,
        resourceType,
      );
      const stateModifier = productionCalculateConditionalModifiers(
        room,
        floor.inhabitants,
      );

      const baseAmount = base[resourceType] ?? 0;

      // Check if this room has resource conversion
      const hasConversion =
        room.convertedOutputResource !== undefined &&
        room.convertedOutputResource !== null;

      // If room converts to a different resource, skip unless it converts TO this type
      if (hasConversion && room.convertedOutputResource !== resourceType) {
        // Check if flat production or secondary production contributes
        const flatProd = featureCalculateFlatProduction(
          room,
          GAME_TIME_TICKS_PER_MINUTE,
        );
        const secondaryProd = roomUpgradeGetSecondaryProduction(room);
        const hasFlatForType = (flatProd[resourceType] ?? 0) > 0;
        const hasSecondaryForType = (secondaryProd[resourceType] ?? 0) > 0;
        if (!hasFlatForType && !hasSecondaryForType) continue;
      }

      // If room converts and the target IS this resource, we need to compute the converted amount
      let effectiveBase = baseAmount;
      if (hasConversion && room.convertedOutputResource === resourceType) {
        // Sum all base production values (they get converted)
        let totalBase = 0;
        for (const amount of Object.values(base)) {
          if (amount && amount > 0) totalBase += amount;
        }
        effectiveBase = totalBase;
      }

      // Skip rooms with no relevant production
      if (
        effectiveBase <= 0 &&
        !hasConversion
      ) {
        const flatProd = featureCalculateFlatProduction(
          room,
          GAME_TIME_TICKS_PER_MINUTE,
        );
        const secondaryProd = roomUpgradeGetSecondaryProduction(room);
        if (
          (flatProd[resourceType] ?? 0) <= 0 &&
          (secondaryProd[resourceType] ?? 0) <= 0
        )
          continue;
      }

      // Build modifier details
      const modifierDetails: ModifierDetail[] = [];

      const depthModifier = floorModifierGetMultiplier(
        floor.depth,
        resourceType,
      );
      if (depthModifier !== 1.0) {
        modifierDetails.push({
          name: `Floor ${floor.depth} Depth`,
          multiplier: depthModifier,
        });
      }

      if (hour !== undefined) {
        const envResults = productionModifierEvaluate({
          roomTypeId: room.roomTypeId,
          floorDepth: floor.depth,
          floorBiome: floor.biome,
          hour,
        });
        for (const result of envResults) {
          modifierDetails.push({
            name: result.description,
            multiplier: result.multiplier,
          });
        }

        const dayNightResourceMod = dayNightGetResourceModifier(
          hour,
          resourceType,
        );
        if (dayNightResourceMod !== 1.0) {
          modifierDetails.push({
            name: 'Time of Day (Resource)',
            multiplier: dayNightResourceMod,
          });
        }

        const creatureModifier =
          dayNightCalculateCreatureProductionModifier(
            hour,
            floor.inhabitants,
            room.id,
          );
        if (creatureModifier !== 1.0) {
          modifierDetails.push({
            name: 'Creature Day/Night',
            multiplier: creatureModifier,
          });
        }
      }

      if (season) {
        const seasonMod = seasonBonusGetResourceModifier(
          season,
          resourceType,
        );
        if (seasonMod !== 1.0) {
          modifierDetails.push({
            name: `Season (${season})`,
            multiplier: seasonMod,
          });
        }
      }

      if (stateModifier !== 1.0) {
        modifierDetails.push({
          name: 'Creature State',
          multiplier: stateModifier,
        });
      }

      // Calculate combined modifier
      const dayNightResourceMod =
        hour !== undefined
          ? dayNightGetResourceModifier(hour, resourceType)
          : 1.0;
      const seasonMod = season
        ? seasonBonusGetResourceModifier(season, resourceType)
        : 1.0;
      const envModifier =
        hour !== undefined
          ? productionModifierCalculate({
              roomTypeId: room.roomTypeId,
              floorDepth: floor.depth,
              floorBiome: floor.biome,
              hour,
            })
          : 1.0;
      const creatureModifier =
        hour !== undefined
          ? dayNightCalculateCreatureProductionModifier(
              hour,
              floor.inhabitants,
              room.id,
            )
          : 1.0;

      const combinedModifier =
        stateModifier *
        envModifier *
        depthModifier *
        dayNightResourceMod *
        seasonMod *
        creatureModifier;

      const totalBonus =
        inhabitantBonusVal +
        adjacencyBonusVal +
        featureAdjacentBonus +
        featureProductionBonus;
      const withBonuses = effectiveBase * (1 + totalBonus);
      const afterModifiers = withBonuses * combinedModifier;
      const researchMultiplier = productionGetResearchMultiplier(resourceType);
      const afterResearch = afterModifiers * researchMultiplier;

      // Handle resource conversion efficiency
      let conversionAdjusted = afterResearch;
      if (hasConversion && room.convertedOutputResource === resourceType) {
        const efficiency = featureGetResourceConverterEfficiency(room);
        if (efficiency !== undefined) {
          conversionAdjusted = afterResearch * efficiency;
        }
      }

      // Flat production from features
      const flatProduction = featureCalculateFlatProduction(
        room,
        GAME_TIME_TICKS_PER_MINUTE,
      );
      const flatForType = flatProduction[resourceType] ?? 0;

      // Upgrade multiplier
      const upgradeMultiplier = roomUpgradeGetProductionMultiplier(room);
      let finalAmount =
        (hasConversion && room.convertedOutputResource === resourceType
          ? conversionAdjusted
          : afterResearch) + flatForType;
      finalAmount *= upgradeMultiplier;

      // Secondary production from upgrades
      const secondaryProduction = roomUpgradeGetSecondaryProduction(room);
      const secondaryForType = secondaryProduction[resourceType] ?? 0;
      finalAmount += secondaryForType;

      if (finalAmount === 0 && effectiveBase === 0 && flatForType === 0 && secondaryForType === 0) continue;

      details.push({
        roomId: room.id,
        roomName: roomGetDisplayName(room),
        floorDepth: floor.depth,
        base: effectiveBase,
        inhabitantBonus: effectiveBase * inhabitantBonusVal,
        workerCount: assignedWorkers.length,
        adjacencyBonus:
          effectiveBase * (adjacencyBonusVal + featureAdjacentBonus),
        featureBonus: effectiveBase * featureProductionBonus,
        researchBonus: afterResearch - afterModifiers,
        modifierEffect: afterModifiers - withBonuses,
        modifierDetails,
        flatFeatureProduction: flatForType,
        upgradeSecondaryProduction: secondaryForType,
        upgradeMultiplier,
        final: finalAmount,
      });
    }
  }

  return details;
}

export const productionBreakdowns = computed(() => {
  const state = gamestate();
  return productionCalculateBreakdowns(
    state.world.floors,
    state.clock.hour,
    state.world.season.currentSeason,
  );
});

export function productionProcess(state: GameState, numTicks = 1): void {
  const production = productionCalculateTotal(
    state.world.floors,
    state.clock.hour,
    state.world.season.currentSeason,
  );

  for (const [type, amount] of Object.entries(production)) {
    if (!amount || amount <= 0) continue;
    const resourceType = type as ResourceType;

    resourceAdd(resourceType, amount * numTicks);
  }
}
