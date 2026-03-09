import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import {
  currencyIsUnlocked,
  currencyUnlockInPlace,
} from '@helpers/currency-unlock';
import { updateGamestate } from '@helpers/state-game';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { reputationAwardInPlace } from '@helpers/reputation';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { findRoomOnFloor } from '@helpers/floor';
import { roomRoleFindById } from '@helpers/room-roles';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { roomGetDisplayName } from '@helpers/room-upgrades';
import type {
  AlchemyConversion,
  AlchemyRecipeContent,
  AlchemyRecipeId,
  AlchemyResourceEntry,
  Floor,
  GameState,
  PlacedRoom,
  PlacedRoomId,
  ResourceType,
} from '@interfaces';
import type { AlchemyLabCompletedEvent } from '@interfaces/alchemy';
import type { RoomContent } from '@interfaces/content-room';
import type {
  AlchemyConversionDetail,
  ConsumptionDetail,
} from '@interfaces/production';
import { Subject } from 'rxjs';

// --- Constants ---

/** Base conversion cycle: 3 game-minutes = 15 ticks */
export const ALCHEMY_LAB_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 3;

const alchemyLabCompletedSubject = new Subject<AlchemyLabCompletedEvent>();
export const alchemyLabCompleted$ = alchemyLabCompletedSubject.asObservable();

// --- Pure helpers ---

/**
 * Get available alchemy recipes for a room, filtered by tier.
 * Base rooms can only use 'basic' recipes.
 * Thematic upgrades unlock their corresponding recipe tiers.
 */
export function alchemyLabGetAvailableRecipes(
  room: PlacedRoom,
): Array<AlchemyRecipeContent> {
  const recipes =
    contentGetEntriesByType<AlchemyRecipeContent>('alchemyrecipe');

  const effects = roomUpgradeGetAppliedEffects(room);
  const hasDarkCrucible = effects.some(
    (e) => e.type === 'alchemyUnlockDarkCrucible',
  );
  const hasArcaneAnnex = effects.some(
    (e) => e.type === 'alchemyUnlockArcaneAnnex',
  );
  const hasTransmutationForge = effects.some(
    (e) => e.type === 'alchemyUnlockTransmutationForge',
  );

  return recipes.filter((r) => {
    if (r.tier === 'basic') { /* always eligible */ }
    else if (r.tier === 'dark-crucible' && hasDarkCrucible) { /* eligible */ }
    else if (r.tier === 'arcane-annex' && hasArcaneAnnex) { /* eligible */ }
    else if (r.tier === 'transmutation-forge' && hasTransmutationForge) { /* eligible */ }
    else return false;

    // Hide recipes whose input currencies are not yet unlocked
    return r.inputCost.every((c) => currencyIsUnlocked(c.resource as ResourceType));
  });
}

/**
 * Calculate effective conversion ticks, accounting for recipe baseTicks,
 * worker scaling, upgrade speed, and adjacency speed bonus.
 */
export function alchemyLabGetConversionTicks(
  room: PlacedRoom,
  assignedWorkerCount: number,
  recipeBaseTicks: number,
  adjacentRoomTypeIds: Set<string>,
): number {
  let ticks = recipeBaseTicks;

  // Each additional worker beyond the first reduces time by 25%, capped at 0.5 multiplier
  if (assignedWorkerCount > 1) {
    const workerSpeedBonus = 1 - (assignedWorkerCount - 1) * 0.25;
    ticks = Math.round(ticks * Math.max(0.5, workerSpeedBonus));
  }

  // Check adjacent rooms for alchemyAdjacencyEffects.alchemySpeedBonus
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.alchemyAdjacencyEffects?.alchemySpeedBonus) {
      ticks = Math.round(
        ticks * (1 - adjDef.alchemyAdjacencyEffects.alchemySpeedBonus),
      );
    }
  }

  const researchCraftBonus = researchUnlockGetPassiveBonusWithMastery('craftingSpeed');
  if (researchCraftBonus > 0) {
    ticks = Math.max(1, Math.round(ticks * (1 / (1 + researchCraftBonus))));
  }

  return Math.max(1, ticks);
}

/**
 * Calculate effective input cost after adjacency modifiers.
 */
export function alchemyLabGetEffectiveCost(
  _room: PlacedRoom,
  baseCost: AlchemyResourceEntry[],
  adjacentRoomTypeIds: Set<string>,
): AlchemyResourceEntry[] {
  let costMultiplier = 1;

  // Apply adjacency cost reduction
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.alchemyAdjacencyEffects?.alchemyCostReduction) {
      costMultiplier *= 1 - adjDef.alchemyAdjacencyEffects.alchemyCostReduction;
    }
  }

  return baseCost
    .filter((entry) => entry.amount > 0)
    .map((entry) => ({
      resource: entry.resource,
      amount: Math.max(1, Math.round(entry.amount * costMultiplier)),
    }));
}

// --- Conversion management ---

export function alchemyLabGetConversion(
  conversions: AlchemyConversion[],
  roomId: PlacedRoomId,
): AlchemyConversion | undefined {
  return conversions.find((c) => c.roomId === roomId);
}

export function alchemyLabStartConversion(
  conversions: AlchemyConversion[],
  roomId: PlacedRoomId,
  recipeId: AlchemyRecipeId,
  targetTicks: number,
): AlchemyConversion[] {
  // Remove any existing conversion for this room
  const filtered = conversions.filter((c) => c.roomId !== roomId);
  return [
    ...filtered,
    {
      roomId,
      recipeId,
      progress: 0,
      targetTicks,
      inputConsumed: false,
    },
  ];
}

export function alchemyLabStopConversion(
  conversions: AlchemyConversion[],
  roomId: PlacedRoomId,
): AlchemyConversion[] {
  return conversions.filter((c) => c.roomId !== roomId);
}

// --- Validation ---

export function alchemyLabCanConvert(
  roomId: PlacedRoomId,
  floors: Floor[],
): { canConvert: boolean; reason?: string; room?: PlacedRoom } {
  for (const floor of floors) {
    const room = findRoomOnFloor(floor, roomId);
    if (!room) continue;

    if (room.roomTypeId !== roomRoleFindById('alchemyLab')) {
      return { canConvert: false, reason: 'Room is not an Alchemy Lab' };
    }

    const assignedCount = floor.inhabitants.filter(
      (i) => i.assignedRoomId === roomId,
    ).length;
    if (assignedCount < 1) {
      return {
        canConvert: false,
        reason: 'At least 1 inhabitant must be assigned to convert resources',
      };
    }

    return { canConvert: true, room };
  }

  return { canConvert: false, reason: 'Room not found' };
}

// --- Adjacency ---

/**
 * Get adjacent room type IDs for an alchemy lab room.
 */
export function alchemyLabGetAdjacentRoomTypeIds(
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

// --- Breakdown for currency modal ---

/**
 * Calculate alchemy conversion production and consumption rates
 * for a given resource type across all active alchemy labs.
 */
export function alchemyLabCalculateBreakdown(
  floors: Floor[],
  alchemyConversions: AlchemyConversion[],
  resourceType: ResourceType,
): {
  production: AlchemyConversionDetail[];
  consumption: ConsumptionDetail[];
} {
  const production: AlchemyConversionDetail[] = [];
  const consumption: ConsumptionDetail[] = [];

  const labTypeId = roomRoleFindById('alchemyLab');
  if (!labTypeId) return { production, consumption };

  for (const floor of floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== labTypeId) continue;

      const conversion = alchemyConversions.find((c) => c.roomId === room.id);
      if (!conversion) continue;

      const recipe = contentGetEntry<AlchemyRecipeContent>(
        conversion.recipeId,
      );
      if (!recipe) continue;

      // Must have at least 1 worker
      const assignedCount = floor.inhabitants.filter(
        (i) => i.assignedRoomId === room.id,
      ).length;
      if (assignedCount < 1) continue;

      // Compute effective ticks and cost
      const adjacentTypes = alchemyLabGetAdjacentRoomTypeIds(room, floor);
      const effectiveTicks = alchemyLabGetConversionTicks(
        room,
        assignedCount,
        recipe.baseTicks,
        adjacentTypes,
      );
      const effectiveCost = alchemyLabGetEffectiveCost(
        room,
        recipe.inputCost,
        adjacentTypes,
      );

      const roomName = roomGetDisplayName(room);

      // Output production for the requested resource
      for (const output of recipe.outputCost) {
        if (output.resource === resourceType) {
          const perTick = output.amount / effectiveTicks;
          production.push({
            recipeName: recipe.name,
            roomName,
            floorDepth: floor.depth,
            perTick,
          });
        }
      }

      // Input consumption for the requested resource
      const inputEntry = effectiveCost.find(
        (e) => e.resource === resourceType,
      );
      if (inputEntry && inputEntry.amount > 0) {
        const perTick = inputEntry.amount / effectiveTicks;
        consumption.push({
          sourceName: recipe.name,
          category: 'alchemy_input',
          amount: perTick,
          roomName,
        });
      }
    }
  }

  return { production, consumption };
}

// --- Tick processor ---

/**
 * Process all Alchemy Lab rooms each tick.
 * Called inside updateGamestate — mutates state in-place.
 *
 * Flow per room:
 * 1. If no active conversion, skip.
 * 2. If input not yet consumed: check resources, deduct them, mark inputConsumed.
 * 3. If input consumed: increment progress.
 * 4. If progress >= target: add output resource, reset cycle (progress=0, inputConsumed=false).
 */
export async function alchemyLabSelectRecipe(
  roomId: PlacedRoomId,
  recipeId: AlchemyRecipeId,
  targetTicks: number,
): Promise<void> {
  await updateGamestate((s) => {
    s.world.alchemyConversions = alchemyLabStartConversion(
      s.world.alchemyConversions,
      roomId,
      recipeId,
      targetTicks,
    );
    return s;
  });
}

export async function alchemyLabStopConversionAction(
  roomId: PlacedRoomId,
): Promise<void> {
  await updateGamestate((s) => {
    s.world.alchemyConversions = alchemyLabStopConversion(
      s.world.alchemyConversions,
      roomId,
    );
    return s;
  });
}

export function alchemyLabProcess(state: GameState, numTicks = 1): void {
  const labTypeId = roomRoleFindById('alchemyLab');
  if (!labTypeId) return;

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== labTypeId) continue;

      const conversionIndex = state.world.alchemyConversions.findIndex(
        (c) => c.roomId === room.id,
      );
      if (conversionIndex === -1) continue;

      const conversion = state.world.alchemyConversions[conversionIndex];

      // Must have at least 1 worker
      const assignedCount = floor.inhabitants.filter(
        (i) => i.assignedRoomId === room.id,
      ).length;
      if (assignedCount < 1) continue;

      const recipe = contentGetEntry<AlchemyRecipeContent>(conversion.recipeId);
      if (!recipe) continue;

      // Step 1: Consume input resources at start of cycle
      if (!conversion.inputConsumed) {
        const adjacentTypes = alchemyLabGetAdjacentRoomTypeIds(room, floor);
        const effectiveCost = alchemyLabGetEffectiveCost(
          room,
          recipe.inputCost,
          adjacentTypes,
        );

        // Check if we can afford
        let canAfford = true;
        for (const entry of effectiveCost) {
          if (entry.amount <= 0) continue;
          const res = state.world.resources[entry.resource];
          if (!res || res.current < entry.amount) {
            canAfford = false;
            break;
          }
        }

        if (!canAfford) continue;

        // Deduct resources (direct mutation; clamped at end of tick)
        for (const entry of effectiveCost) {
          if (entry.amount <= 0) continue;
          state.world.resources[entry.resource].current -= entry.amount;
        }

        conversion.inputConsumed = true;
      }

      // Step 2: Progress the conversion
      conversion.progress += numTicks;

      // Step 3: Complete the conversion
      if (conversion.progress >= conversion.targetTicks) {
        // Add output resources (direct mutation; clamped at end of tick)
        for (const output of recipe.outputCost) {
          state.world.resources[output.resource].current += output.amount;
          currencyUnlockInPlace(state, output.resource as ResourceType);
        }

        reputationAwardInPlace(state, 'complete_transmutation');

        // Reset cycle for continuous conversion
        conversion.progress = 0;
        conversion.inputConsumed = false;

        alchemyLabCompletedSubject.next({
          roomId: room.id,
          recipeName: recipe.name,
          outputs: recipe.outputCost,
        });
      }
    }
  }
}
