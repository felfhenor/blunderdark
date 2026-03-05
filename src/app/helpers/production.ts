import { computed } from '@angular/core';
import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import {
  connectivityGetConnectedRoomIds,
  connectivityGetDisconnectedRoomIds,
} from '@helpers/connectivity';
import { consumptionCalculateNonFoodTotals } from '@helpers/consumption';
import { contentGetEntry } from '@helpers/content';
import {
  dayNightCalculateCreatureProductionModifier,
  dayNightGetResourceModifier,
} from '@helpers/day-night-modifiers';
import {
  corruptionGenerationCalculateInhabitantRate,
  corruptionCalculateDeepObjectiveRate,
} from '@helpers/corruption';
import {
  featureApplyResourceConversion,
  featureCalculateAdjacentProductionBonus,
  featureCalculateCorruptionGenerationPerTick,
  featureCalculateFlatProduction,
  featureCalculateProductionBonus,
  featureCalculateSpeedMultiplier,
  featureGetCorruptionSealedRoomIds,
  featureGetResourceConverterEfficiency,
} from '@helpers/features';
import { floorModifierGetMultiplier } from '@helpers/floor-modifiers';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { legendaryAuraGetBonus } from '@helpers/legendary-inhabitant';
import {
  productionModifierCalculate,
  productionModifierEvaluate,
} from '@helpers/production-modifiers';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import {
  roomGetDisplayName,
  roomUpgradeGetProductionMultiplier,
  roomUpgradeGetSecondaryProduction,
} from '@helpers/room-upgrades';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { gamestate } from '@helpers/state-game';
import {
  synergyCalculateProductionBonus,
  synergyEvaluateAll,
} from '@helpers/synergy';
import { reputationEffectGetProductionMultiplier } from '@helpers/reputation-effects';
import { seasonGetProductionMultiplier } from '@helpers/season';
import { throneRoomGetPositionalBonuses, throneRoomGetRulerBonusValue } from '@helpers/throne-room';
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
    } else if (resourceType === 'gold') {
      rulerBonus = throneRoomGetPositionalBonuses(floors).goldProductionBonus;
    }
  }

  return 1 + resourceBonus + allBonus + rulerBonus;
}

function productionGetLegendaryAuraMultiplier(
  resourceType: string,
  allInhabitants: InhabitantInstance[],
): number {
  const foodAura = legendaryAuraGetBonus(allInhabitants, 'aura_food_bonus');
  const gatheringAura = legendaryAuraGetBonus(allInhabitants, 'aura_gathering_bonus');
  return 1 + gatheringAura + (resourceType === 'food' ? foodAura : 0);
}

function productionGetReputationMultiplier(resourceType: string): number {
  const reputation = gamestate()?.world?.reputation;
  if (!reputation) return 1.0;
  return reputationEffectGetProductionMultiplier(resourceType, reputation);
}

type NonRoomCorruptionResult = {
  /** Per-tick corruption from stationed inhabitants */
  inhabitantPerTick: number;
  /** Per-tick corruption from features */
  featurePerTick: number;
  /** Per-tick corruption from deep objective rooms */
  deepObjectivePerTick: number;
  /** Day/night multiplier for corruption */
  dayNightMultiplier: number;
  /** Combined research + throne multiplier (1 + bonuses) */
  researchThroneMultiplier: number;
  /** Total non-room corruption per tick after all modifiers */
  final: number;
};

/**
 * Collect inhabitants from all floors, deduplicating by instanceId.
 * Multiple floors can share the same inhabitants array reference
 * (e.g. after spawning/breeding syncs floor.inhabitants = state.world.inhabitants),
 * which causes flatMap to count the same inhabitants multiple times.
 */
function collectUniqueInhabitants(floors: Floor[]): InhabitantInstance[] {
  const seen = new Set<string>();
  const result: InhabitantInstance[] = [];
  for (const floor of floors) {
    for (const inst of floor.inhabitants) {
      if (!seen.has(inst.instanceId)) {
        seen.add(inst.instanceId);
        result.push(inst);
      }
    }
  }
  return result;
}

/**
 * Calculate non-room corruption sources: stationed inhabitants, corruption features,
 * and deep objective rooms. Returns separated components with modifiers.
 */
function productionCalculateNonRoomCorruption(
  floors: Floor[],
  hour?: number,
): NonRoomCorruptionResult {
  const allInhabitants = collectUniqueInhabitants(floors);
  const inhabitantPerTick = corruptionGenerationCalculateInhabitantRate(allInhabitants);

  const sealedRoomIds = featureGetCorruptionSealedRoomIds(floors);
  let featurePerTick = 0;
  for (const floor of floors) {
    const unsealedRooms = sealedRoomIds.size > 0
      ? floor.rooms.filter((r) => !sealedRoomIds.has(r.id))
      : floor.rooms;
    featurePerTick += featureCalculateCorruptionGenerationPerTick(
      unsealedRooms,
      GAME_TIME_TICKS_PER_MINUTE,
    );
  }

  const deepObjectivePerTick = corruptionCalculateDeepObjectiveRate(floors);

  const total = inhabitantPerTick + featurePerTick + deepObjectivePerTick;
  if (total === 0) {
    return { inhabitantPerTick: 0, featurePerTick: 0, deepObjectivePerTick: 0, dayNightMultiplier: 1, researchThroneMultiplier: 1, final: 0 };
  }

  const dayNightMultiplier = hour !== undefined
    ? dayNightGetResourceModifier(hour, 'corruption')
    : 1.0;
  const researchCorruptionBonus = researchUnlockGetPassiveBonusWithMastery('corruptionGeneration');
  const throneCorruptionBonus = throneRoomGetRulerBonusValue(floors, 'corruptionGeneration');
  const researchThroneMultiplier = 1 + researchCorruptionBonus + throneCorruptionBonus;

  const final = total * dayNightMultiplier * researchThroneMultiplier;

  return { inhabitantPerTick, featurePerTick, deepObjectivePerTick, dayNightMultiplier, researchThroneMultiplier, final };
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

    totalBonus += def.stats.workerEfficiency;

    for (const trait of def.traits) {
      for (const effect of trait.effects) {
        if (effect.effectType === 'production_multiplier') {
          // Skip effect if it targets a specific room and this room doesn't match
          if (effect.targetRoomId && roomDef?.id !== effect.targetRoomId) continue;

          // Only apply effect if it targets this room's production or has no target
          if (
            !effect.targetResourceType ||
            effect.targetResourceType === 'all' ||
            (roomProduction[effect.targetResourceType] !== undefined &&
              roomProduction[effect.targetResourceType]! > 0)
          ) {
            totalBonus += effect.effectValue;
          }
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
  const activeSynergies = synergyEvaluateAll(floors);
  const allInhabitants = collectUniqueInhabitants(floors);

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
        const featureProductionBonus = featureCalculateProductionBonus(
          room,
          resourceType,
        );
        const synergyBonus = synergyCalculateProductionBonus(
          room.id,
          resourceType,
          activeSynergies,
        );
        const researchMultiplier = productionGetResearchMultiplier(resourceType);
        const reputationMultiplier = productionGetReputationMultiplier(resourceType);
        const legendaryAuraMultiplier = productionGetLegendaryAuraMultiplier(resourceType, allInhabitants);
        const final =
          baseAmount *
          (1 +
            inhabitantBonus +
            adjacencyBonus +
            featureAdjacentBonus +
            featureProductionBonus +
            synergyBonus) *
          stateModifier *
          envModifier *
          depthModifier *
          dayNightResourceMod *
          creatureModifier *
          researchMultiplier *
          reputationMultiplier *
          legendaryAuraMultiplier;
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

      // Apply production multiplier from upgrades (per-resource to respect resource targeting)
      for (const key of Object.keys(roomProduction)) {
        const upgradeMultiplier = roomUpgradeGetProductionMultiplier(room, key);
        if (upgradeMultiplier !== 1.0) {
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

      // Apply speed multiplier (Time Dilation Field) — only when maintenance is active
      if (room.maintenanceActive !== false) {
        const speedMultiplier = featureCalculateSpeedMultiplier(room);
        if (speedMultiplier !== 1.0) {
          for (const key of Object.keys(roomProduction)) {
            roomProduction[key] = (roomProduction[key] ?? 0) * speedMultiplier;
          }
        }
      }

      // Apply season production multiplier
      if (season) {
        for (const key of Object.keys(roomProduction)) {
          const seasonMul = seasonGetProductionMultiplier(season, key);
          if (seasonMul !== 1.0) {
            roomProduction[key] = (roomProduction[key] ?? 0) * seasonMul;
          }
        }
      }

      for (const [resourceType, amount] of Object.entries(roomProduction)) {
        if (!amount) continue;
        totalProduction[resourceType] =
          (totalProduction[resourceType] ?? 0) + amount;
      }
    }
  }

  // Add non-room corruption sources (inhabitants, features, deep objectives)
  const nonRoomCorruption = productionCalculateNonRoomCorruption(floors, hour);
  if (nonRoomCorruption.final !== 0) {
    let corruptionAmount = nonRoomCorruption.final;
    if (season) {
      corruptionAmount *= seasonGetProductionMultiplier(season, 'corruption');
    }
    totalProduction['corruption'] =
      (totalProduction['corruption'] ?? 0) + corruptionAmount;
  }

  return totalProduction;
}

export function productionCalculateSingleRoom(
  room: PlacedRoom,
  floor: Floor,
  hour?: number,
  floors?: Floor[],
  season?: Season,
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

  const allInhabitants = collectUniqueInhabitants(floors ?? [floor]);

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
  const activeSynergies = synergyEvaluateAll(floors ?? [floor]);
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
    const featureProductionBonus = featureCalculateProductionBonus(
      room,
      resourceType,
    );
    const synergyBonus = synergyCalculateProductionBonus(
      room.id,
      resourceType,
      activeSynergies,
    );
    const researchMultiplier = productionGetResearchMultiplier(resourceType);
    const reputationMultiplier = productionGetReputationMultiplier(resourceType);
    const legendaryAuraMultiplier = productionGetLegendaryAuraMultiplier(resourceType, allInhabitants);
    production[resourceType] =
      baseAmount *
      (1 +
        inhabitantBonus +
        adjacencyBonus +
        featureAdjacentBonus +
        featureProductionBonus +
        synergyBonus) *
      stateModifier *
      envModifier *
      depthModifier *
      dayNightResourceMod *
      creatureModifier *
      researchMultiplier *
      reputationMultiplier *
      legendaryAuraMultiplier;
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

  // Apply production multiplier from upgrades (per-resource to respect resource targeting)
  for (const key of Object.keys(production)) {
    const upgradeMultiplier = roomUpgradeGetProductionMultiplier(room, key);
    if (upgradeMultiplier !== 1.0) {
      production[key] = (production[key] ?? 0) * upgradeMultiplier;
    }
  }

  // Add secondary production from upgrades (flat bonus, not affected by modifiers)
  const secondaryProduction = roomUpgradeGetSecondaryProduction(room);
  for (const [resourceType, amount] of Object.entries(secondaryProduction)) {
    if (!amount) continue;
    production[resourceType] = (production[resourceType] ?? 0) + amount;
  }

  // Apply speed multiplier (Time Dilation Field) — only when maintenance is active
  if (room.maintenanceActive !== false) {
    const speedMultiplier = featureCalculateSpeedMultiplier(room);
    if (speedMultiplier !== 1.0) {
      for (const key of Object.keys(production)) {
        production[key] = (production[key] ?? 0) * speedMultiplier;
      }
    }
  }

  // Apply season production multiplier
  if (season) {
    for (const key of Object.keys(production)) {
      const seasonMul = seasonGetProductionMultiplier(season, key);
      if (seasonMul !== 1.0) {
        production[key] = (production[key] ?? 0) * seasonMul;
      }
    }
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
        state.world.floors,
        state.world.season.currentSeason,
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
  const activeSynergies = synergyEvaluateAll(floors);
  const allInhabitantsForAura = collectUniqueInhabitants(floors);

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
      // Track each room's final contribution per resource for upgrade multiplier
      let roomFinals: Record<string, number> = {};

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
        const featureProductionBonus = featureCalculateProductionBonus(
          room,
          resourceType,
        );
        const synergyBonusVal = synergyCalculateProductionBonus(
          room.id,
          resourceType,
          activeSynergies,
        );
        const researchMultiplier = productionGetResearchMultiplier(resourceType);
        const reputationMultiplier = productionGetReputationMultiplier(resourceType);
        const legendaryAuraMultiplier = productionGetLegendaryAuraMultiplier(resourceType, allInhabitantsForAura);
        const modifier =
          stateModifier *
          envModifier *
          depthModifier *
          dayNightResourceMod *
          creatureModifier;
        const withBonuses =
          baseAmount *
          (1 +
            inhabitantBonus +
            adjacencyBonusVal +
            featureAdjacentBonus +
            featureProductionBonus +
            synergyBonusVal);
        const afterModifiers = withBonuses * modifier;
        const afterResearch = afterModifiers * researchMultiplier;
        const afterReputation = afterResearch * reputationMultiplier;
        const finalAmount = afterReputation * legendaryAuraMultiplier;

        roomFinals[resourceType] = finalAmount;

        if (!breakdowns[resourceType]) {
          breakdowns[resourceType] = {
            base: 0,
            inhabitantBonus: 0,
            adjacencyBonus: 0,
            modifierEffect: 0,
            researchBonus: 0,
            reputationBonus: 0,
            seasonBonus: 0,
            final: 0,
          };
        }

        breakdowns[resourceType].base += baseAmount;
        breakdowns[resourceType].inhabitantBonus +=
          baseAmount * inhabitantBonus;
        breakdowns[resourceType].adjacencyBonus +=
          baseAmount * adjacencyBonusVal;
        breakdowns[resourceType].modifierEffect += afterModifiers - withBonuses;
        breakdowns[resourceType].researchBonus += afterResearch - afterModifiers;
        breakdowns[resourceType].reputationBonus += afterReputation - afterResearch;
        breakdowns[resourceType].final += finalAmount;
      }

      // Add flat production from features (must match productionCalculateTotal)
      const flatProduction = featureCalculateFlatProduction(
        room,
        GAME_TIME_TICKS_PER_MINUTE,
      );
      for (const [resourceType, amount] of Object.entries(flatProduction)) {
        if (!amount) continue;
        roomFinals[resourceType] = (roomFinals[resourceType] ?? 0) + amount;
        if (!breakdowns[resourceType]) {
          breakdowns[resourceType] = {
            base: 0,
            inhabitantBonus: 0,
            adjacencyBonus: 0,
            modifierEffect: 0,
            researchBonus: 0,
            reputationBonus: 0,
            seasonBonus: 0,
            final: 0,
          };
        }
        breakdowns[resourceType].base += amount;
        breakdowns[resourceType].final += amount;
      }

      // Apply resource conversion if active (must match productionCalculateTotal)
      const conversionEfficiency = featureGetResourceConverterEfficiency(room);
      if (conversionEfficiency !== undefined && room.convertedOutputResource) {
        const targetResource = room.convertedOutputResource;
        let totalPositive = 0;
        for (const val of Object.values(roomFinals)) {
          if (val && val > 0) totalPositive += val;
        }
        if (totalPositive > 0) {
          // Remove existing contributions from breakdowns (they get converted)
          for (const [rt, val] of Object.entries(roomFinals)) {
            if (breakdowns[rt]) {
              breakdowns[rt].final -= val;
              breakdowns[rt].base -= val;
            }
          }
          // Add converted output
          const convertedAmount = totalPositive * conversionEfficiency;
          roomFinals = { [targetResource]: convertedAmount };
          if (!breakdowns[targetResource]) {
            breakdowns[targetResource] = {
              base: 0,
              inhabitantBonus: 0,
              adjacencyBonus: 0,
              modifierEffect: 0,
              researchBonus: 0,
              reputationBonus: 0,
              seasonBonus: 0,
              final: 0,
            };
          }
          breakdowns[targetResource].base += convertedAmount;
          breakdowns[targetResource].final += convertedAmount;
        }
      }

      // Apply production multiplier from upgrades (per-resource to respect targeting)
      for (const resourceType of Object.keys(roomFinals)) {
        if (!breakdowns[resourceType]) continue;
        const roomFinal = roomFinals[resourceType] ?? 0;
        const upgradeMultiplier = roomUpgradeGetProductionMultiplier(room, resourceType);
        if (upgradeMultiplier !== 1.0) {
          const upgradeDelta = roomFinal * (upgradeMultiplier - 1);
          breakdowns[resourceType].final += upgradeDelta;
          breakdowns[resourceType].modifierEffect += upgradeDelta;
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
            reputationBonus: 0,
            seasonBonus: 0,
            final: 0,
          };
        }
        breakdowns[resourceType].base += amount;
        breakdowns[resourceType].final += amount;
      }

    }
  }

  // Add non-room corruption sources to breakdown
  const nonRoomCorruption = productionCalculateNonRoomCorruption(floors, hour);
  if (nonRoomCorruption.final !== 0) {
    if (!breakdowns['corruption']) {
      breakdowns['corruption'] = {
        base: 0,
        inhabitantBonus: 0,
        adjacencyBonus: 0,
        modifierEffect: 0,
        researchBonus: 0,
        reputationBonus: 0,
        seasonBonus: 0,
        final: 0,
      };
    }

    const { inhabitantPerTick, featurePerTick, deepObjectivePerTick, dayNightMultiplier, researchThroneMultiplier } = nonRoomCorruption;
    const nonInhabitantBase = featurePerTick + deepObjectivePerTick;
    const totalBase = inhabitantPerTick + nonInhabitantBase;

    // Inhabitant corruption shows as worker bonus; features/objectives show as base
    breakdowns['corruption'].base += nonInhabitantBase;
    breakdowns['corruption'].inhabitantBonus += inhabitantPerTick;
    // Modifier and research effects apply to the combined total
    const afterModifier = totalBase * dayNightMultiplier;
    breakdowns['corruption'].modifierEffect += afterModifier - totalBase;
    breakdowns['corruption'].researchBonus += afterModifier * researchThroneMultiplier - afterModifier;
    breakdowns['corruption'].final += nonRoomCorruption.final;
  }

  // Apply season production multiplier to all breakdowns
  if (season) {
    for (const [resourceType, bd] of Object.entries(breakdowns)) {
      const seasonMul = seasonGetProductionMultiplier(season, resourceType);
      if (seasonMul !== 1.0) {
        bd.seasonBonus = bd.final * (seasonMul - 1);
        bd.final *= seasonMul;
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
  const activeSynergies = synergyEvaluateAll(floors);
  const allInhabitantsForAura = collectUniqueInhabitants(floors);

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

      // Skip rooms with no relevant production (but allow negative production like drain)
      if (
        effectiveBase === 0 &&
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
        creatureModifier;

      const synergyBonusVal = synergyCalculateProductionBonus(
        room.id,
        resourceType,
        activeSynergies,
      );
      const totalBonus =
        inhabitantBonusVal +
        adjacencyBonusVal +
        featureAdjacentBonus +
        featureProductionBonus +
        synergyBonusVal;
      const withBonuses = effectiveBase * (1 + totalBonus);
      const afterModifiers = withBonuses * combinedModifier;
      const researchMultiplier = productionGetResearchMultiplier(resourceType);
      const afterResearch = afterModifiers * researchMultiplier;
      const reputationMultiplier = productionGetReputationMultiplier(resourceType);
      const afterReputation = afterResearch * reputationMultiplier;
      const legendaryAuraMultiplier = productionGetLegendaryAuraMultiplier(resourceType, allInhabitantsForAura);
      const afterLegendaryAura = afterReputation * legendaryAuraMultiplier;

      if (reputationMultiplier !== 1.0) {
        modifierDetails.push({
          name: 'Reputation Effect',
          multiplier: reputationMultiplier,
        });
      }

      if (legendaryAuraMultiplier !== 1.0) {
        modifierDetails.push({
          name: 'Legendary Aura',
          multiplier: legendaryAuraMultiplier,
        });
      }

      // Handle resource conversion efficiency
      let conversionAdjusted = afterLegendaryAura;
      if (hasConversion && room.convertedOutputResource === resourceType) {
        const efficiency = featureGetResourceConverterEfficiency(room);
        if (efficiency !== undefined) {
          conversionAdjusted = afterLegendaryAura * efficiency;
        }
      }

      // Flat production from features
      const flatProduction = featureCalculateFlatProduction(
        room,
        GAME_TIME_TICKS_PER_MINUTE,
      );
      const flatForType = flatProduction[resourceType] ?? 0;

      // Upgrade multiplier (per-resource to respect resource targeting)
      const upgradeMultiplier = roomUpgradeGetProductionMultiplier(room, resourceType);
      let finalAmount =
        (hasConversion && room.convertedOutputResource === resourceType
          ? conversionAdjusted
          : afterLegendaryAura) + flatForType;
      finalAmount *= upgradeMultiplier;

      // Secondary production from upgrades
      const secondaryProduction = roomUpgradeGetSecondaryProduction(room);
      const secondaryForType = secondaryProduction[resourceType] ?? 0;
      finalAmount += secondaryForType;

      // Apply speed multiplier (Time Dilation Field) — only when maintenance is active
      if (room.maintenanceActive !== false) {
        const speedMultiplier = featureCalculateSpeedMultiplier(room);
        if (speedMultiplier !== 1.0) {
          modifierDetails.push({ name: 'Time Dilation', multiplier: speedMultiplier });
          finalAmount *= speedMultiplier;
        }
      }

      // Apply season production multiplier
      if (season) {
        const seasonMul = seasonGetProductionMultiplier(season, resourceType);
        if (seasonMul !== 1.0) {
          modifierDetails.push({ name: 'Season', multiplier: seasonMul });
          finalAmount *= seasonMul;
        }
      }

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
        synergyBonus: effectiveBase * synergyBonusVal,
        researchBonus: afterResearch - afterModifiers,
        reputationBonus: afterReputation - afterResearch,
        modifierEffect: afterModifiers - withBonuses,
        modifierDetails,
        flatFeatureProduction: flatForType,
        upgradeSecondaryProduction: secondaryForType,
        upgradeMultiplier,
        final: finalAmount,
      });
    }
  }

  // Add non-room corruption sources as detail entries
  if (resourceType === 'corruption') {
    const dayNightMod = hour !== undefined
      ? dayNightGetResourceModifier(hour, 'corruption')
      : 1.0;
    const researchCorruptionBonus = researchUnlockGetPassiveBonusWithMastery('corruptionGeneration');
    const throneCorruptionBonus = throneRoomGetRulerBonusValue(floors, 'corruptionGeneration');
    const researchThroneMultiplier = 1 + researchCorruptionBonus + throneCorruptionBonus;

    const corruptionModifierDetails: ModifierDetail[] = [];
    if (dayNightMod !== 1.0) {
      corruptionModifierDetails.push({ name: 'Time of Day', multiplier: dayNightMod });
    }
    if (researchCorruptionBonus !== 0) {
      corruptionModifierDetails.push({ name: 'Research (Corruption Gen.)', multiplier: 1 + researchCorruptionBonus });
    }
    if (throneCorruptionBonus !== 0) {
      corruptionModifierDetails.push({ name: 'Throne Room', multiplier: 1 + throneCorruptionBonus });
    }

    // Per-room inhabitant corruption generation (shows in Workers tab)
    for (const floor of floors) {
      const roomCorruptionWorkers = new Map<string, { count: number; perTick: number }>();

      for (const inst of floor.inhabitants) {
        if (!inst.assignedRoomId) continue;
        const def = productionGetInhabitantDefinition(inst.definitionId);
        if (!def) continue;
        const rate = def.corruptionGeneration ?? 0;
        if (rate <= 0) continue;

        const existing = roomCorruptionWorkers.get(inst.assignedRoomId) ?? { count: 0, perTick: 0 };
        existing.count += 1;
        existing.perTick += rate / GAME_TIME_TICKS_PER_MINUTE;
        roomCorruptionWorkers.set(inst.assignedRoomId, existing);
      }

      for (const [roomId, data] of roomCorruptionWorkers) {
        const room = floor.rooms.find((r) => r.id === roomId);
        if (!room) continue;

        const afterModifier = data.perTick * dayNightMod;
        let finalAmount = afterModifier * researchThroneMultiplier;
        const seasonCorruptionMul = season ? seasonGetProductionMultiplier(season, 'corruption') : 1.0;
        finalAmount *= seasonCorruptionMul;

        const entryModifierDetails = [...corruptionModifierDetails];
        if (seasonCorruptionMul !== 1.0) {
          entryModifierDetails.push({ name: 'Season', multiplier: seasonCorruptionMul });
        }

        details.push({
          roomId: `${roomId}-corruption-gen` as PlacedRoomId,
          roomName: roomGetDisplayName(room),
          floorDepth: floor.depth,
          base: 0,
          inhabitantBonus: finalAmount,
          workerCount: data.count,
          adjacencyBonus: 0,
          featureBonus: 0,
          synergyBonus: 0,
          researchBonus: 0,
          reputationBonus: 0,
          modifierEffect: 0,
          modifierDetails: entryModifierDetails,
          flatFeatureProduction: 0,
          upgradeSecondaryProduction: 0,
          upgradeMultiplier: 1,
          final: finalAmount,
        });
      }
    }

    // Feature corruption and deep objective rooms (shows in Base tab)
    const sealedRoomIds = featureGetCorruptionSealedRoomIds(floors);
    let featurePerTick = 0;
    for (const floor of floors) {
      const unsealedRooms = sealedRoomIds.size > 0
        ? floor.rooms.filter((r) => !sealedRoomIds.has(r.id))
        : floor.rooms;
      featurePerTick += featureCalculateCorruptionGenerationPerTick(
        unsealedRooms,
        GAME_TIME_TICKS_PER_MINUTE,
      );
    }

    const deepObjectivePerTick = corruptionCalculateDeepObjectiveRate(floors);

    const baseSources = [
      { name: 'Corruption Features', base: featurePerTick },
      { name: 'Deep Objective Rooms', base: deepObjectivePerTick },
    ];

    for (const source of baseSources) {
      if (source.base === 0) continue;

      const afterModifier = source.base * dayNightMod;
      let finalAmount = afterModifier * researchThroneMultiplier;
      const seasonCorruptionMul = season ? seasonGetProductionMultiplier(season, 'corruption') : 1.0;
      finalAmount *= seasonCorruptionMul;

      const entryModifierDetails = [...corruptionModifierDetails];
      if (seasonCorruptionMul !== 1.0) {
        entryModifierDetails.push({ name: 'Season', multiplier: seasonCorruptionMul });
      }

      details.push({
        roomId: '' as PlacedRoomId,
        roomName: source.name,
        floorDepth: 0,
        base: source.base,
        inhabitantBonus: 0,
        workerCount: 0,
        adjacencyBonus: 0,
        featureBonus: 0,
        synergyBonus: 0,
        researchBonus: finalAmount - afterModifier,
        reputationBonus: 0,
        modifierEffect: afterModifier - source.base,
        modifierDetails: entryModifierDetails,
        flatFeatureProduction: 0,
        upgradeSecondaryProduction: 0,
        upgradeMultiplier: 1,
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

  // Compute non-food consumption (legendary upkeep + feature maintenance)
  // and subtract from production to get a single net delta per resource.
  const consumption = consumptionCalculateNonFoodTotals(
    state.world.floors,
    state.world.inhabitants,
  );

  // Merge production and consumption into a net delta
  const allTypes = new Set([
    ...Object.keys(production),
    ...Object.keys(consumption),
  ]);

  const unlocked = state.world.unlockedCurrencies;

  for (const type of allTypes) {
    const resourceType = type as ResourceType;

    // Skip locked currencies — no generation or accumulation
    if (unlocked && !unlocked.includes(resourceType)) continue;

    const gain = production[resourceType] ?? 0;
    const cost = consumption[resourceType] ?? 0;
    const net = gain - cost;
    if (!net) continue;

    // Apply single net delta. resourceClampAll() at end of tick ensures [0, max].
    state.world.resources[resourceType].current += net * numTicks;
  }
}
