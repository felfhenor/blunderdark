import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import type {
  AlchemyConversion,
  AlchemyRecipeContent,
  GameState,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
} from '@interfaces';
import { Subject } from 'rxjs';
import type { AlchemyLabCompletedEvent } from '@interfaces/alchemy';

// --- Constants ---

/** Base conversion cycle: 3 game-minutes = 15 ticks */
export const ALCHEMY_LAB_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 3;

const alchemyLabCompletedSubject = new Subject<AlchemyLabCompletedEvent>();
export const alchemyLabCompleted$ = alchemyLabCompletedSubject.asObservable();

// --- Pure helpers ---

/**
 * Get available alchemy recipes for a room, filtered by tier.
 * Base rooms can only use 'basic' recipes.
 * With the Advanced Alchemy upgrade, 'advanced' recipes are also available.
 */
export function alchemyLabGetAvailableRecipes(
  room: PlacedRoom,
): Array<AlchemyRecipeContent & IsContentItem> {
  const recipes = contentGetEntriesByType<AlchemyRecipeContent & IsContentItem>('alchemyrecipe');

  const effects = roomUpgradeGetAppliedEffects(room);
  const hasAdvancedAlchemy = effects.some((e) => e.type === 'alchemyTierUnlock');

  return recipes.filter((r) => {
    if (r.tier === 'basic') return true;
    if (r.tier === 'advanced' && hasAdvancedAlchemy) return true;
    return false;
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
    const adjDef = contentGetEntry<RoomDefinition & IsContentItem>(adjTypeId);
    if (adjDef?.alchemyAdjacencyEffects?.alchemySpeedBonus) {
      ticks = Math.round(ticks * (1 - adjDef.alchemyAdjacencyEffects.alchemySpeedBonus));
    }
  }

  return Math.max(1, ticks);
}

/**
 * Calculate effective input cost after upgrade and adjacency modifiers.
 */
export function alchemyLabGetEffectiveCost(
  room: PlacedRoom,
  baseCost: Partial<Record<string, number>>,
  adjacentRoomTypeIds: Set<string>,
): Partial<Record<string, number>> {
  const effects = roomUpgradeGetAppliedEffects(room);

  // Apply upgrade cost multiplier (e.g., Efficient Distillation)
  let costMultiplier = 1;
  for (const effect of effects) {
    if (effect.type === 'alchemyCostMultiplier') {
      costMultiplier *= effect.value;
    }
  }

  // Apply adjacency cost reduction
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomDefinition & IsContentItem>(adjTypeId);
    if (adjDef?.alchemyAdjacencyEffects?.alchemyCostReduction) {
      costMultiplier *= (1 - adjDef.alchemyAdjacencyEffects.alchemyCostReduction);
    }
  }

  const result: Partial<Record<string, number>> = {};
  for (const [resource, amount] of Object.entries(baseCost)) {
    if (amount && amount > 0) {
      result[resource] = Math.max(1, Math.round(amount * costMultiplier));
    }
  }
  return result;
}

// --- Conversion management ---

export function alchemyLabGetConversion(
  conversions: AlchemyConversion[],
  roomId: string,
): AlchemyConversion | undefined {
  return conversions.find((c) => c.roomId === roomId);
}

export function alchemyLabStartConversion(
  conversions: AlchemyConversion[],
  roomId: string,
  recipeId: string,
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
  roomId: string,
): AlchemyConversion[] {
  return conversions.filter((c) => c.roomId !== roomId);
}

// --- Validation ---

export function alchemyLabCanConvert(
  roomId: string,
  floors: GameState['world']['floors'],
): { canConvert: boolean; reason?: string; room?: PlacedRoom } {
  for (const floor of floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
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
export function alchemyLabProcess(state: GameState): void {
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

      const recipe = contentGetEntry<AlchemyRecipeContent & IsContentItem>(conversion.recipeId);
      if (!recipe) continue;

      // Step 1: Consume input resources at start of cycle
      if (!conversion.inputConsumed) {
        const adjacentTypes = alchemyLabGetAdjacentRoomTypeIds(room, floor);
        const effectiveCost = alchemyLabGetEffectiveCost(room, recipe.inputCost, adjacentTypes);

        // Check if we can afford
        let canAfford = true;
        for (const [resource, amount] of Object.entries(effectiveCost)) {
          if (!amount || amount <= 0) continue;
          const res = state.world.resources[resource as keyof typeof state.world.resources];
          if (!res || res.current < amount) {
            canAfford = false;
            break;
          }
        }

        if (!canAfford) continue;

        // Deduct resources
        for (const [resource, amount] of Object.entries(effectiveCost)) {
          if (!amount || amount <= 0) continue;
          const res = state.world.resources[resource as keyof typeof state.world.resources];
          if (res) {
            res.current -= amount;
          }
        }

        conversion.inputConsumed = true;
      }

      // Step 2: Progress the conversion
      conversion.progress += 1;

      // Step 3: Complete the conversion
      if (conversion.progress >= conversion.targetTicks) {
        // Add output resource
        const outputRes = state.world.resources[recipe.outputResource as keyof typeof state.world.resources];
        if (outputRes) {
          outputRes.current = Math.min(outputRes.current + recipe.outputAmount, outputRes.max);
        }

        // Reset cycle for continuous conversion
        conversion.progress = 0;
        conversion.inputConsumed = false;

        alchemyLabCompletedSubject.next({
          roomId: room.id,
          recipeName: recipe.name,
          outputResource: recipe.outputResource,
          outputAmount: recipe.outputAmount,
        });
      }
    }
  }
}
