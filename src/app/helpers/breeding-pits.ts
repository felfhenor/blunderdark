import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { generateInhabitantName } from '@helpers/inhabitant-names';
import {
  mutationTraitApply,
  mutationTraitRoll,
  mutationTraitRollNegative,
} from '@helpers/mutation-traits';
import { rngRandom, rngUuid } from '@helpers/rng';
import { roomRoleFindById } from '@helpers/room-roles';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import type {
  BreedingRecipeContent,
  GameState,
  InhabitantInstance,
  InhabitantStats,
  PlacedRoom,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type {
  BreedingCompletedEvent,
  MutationCompletedEvent,
  MutationOutcome,
} from '@interfaces/breeding';
import type { InhabitantInstanceId } from '@interfaces/inhabitant';
import { Subject } from 'rxjs';
import type { PRNG } from 'seedrandom';

// --- Constants ---

export const BREEDING_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 5; // 25 ticks
export const MUTATION_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 3; // 15 ticks

export const MUTATION_POSITIVE_CHANCE = 0.6;
export const MUTATION_NEUTRAL_CHANCE = 0.25;
export const MUTATION_NEGATIVE_CHANCE = 0.15;


const breedingCompletedSubject = new Subject<BreedingCompletedEvent>();
export const breedingCompleted$ = breedingCompletedSubject.asObservable();

const mutationCompletedSubject = new Subject<MutationCompletedEvent>();
export const mutationCompleted$ = mutationCompletedSubject.asObservable();

// --- Pure helpers ---

/**
 * Get all breeding recipes.
 */
export function breedingGetAllRecipes(): BreedingRecipeContent[] {
  return contentGetEntriesByType<BreedingRecipeContent>('breedingrecipe');
}

/**
 * Find a breeding recipe matching two parent definition IDs (order-independent).
 */
export function breedingFindRecipe(
  parentADefId: string,
  parentBDefId: string,
): (BreedingRecipeContent) | undefined {
  const recipes = contentGetEntriesByType<
    BreedingRecipeContent  >('breedingrecipe');
  return recipes.find(
    (r) =>
      (r.parentInhabitantAId === parentADefId &&
        r.parentInhabitantBId === parentBDefId) ||
      (r.parentInhabitantAId === parentBDefId &&
        r.parentInhabitantBId === parentADefId),
  );
}

/**
 * Get all available recipes based on assigned inhabitants.
 * Returns pairs of inhabitants that have valid recipes.
 */
export function breedingGetAvailableRecipes(
  assignedInhabitants: InhabitantInstance[],
): Array<{
  parentA: InhabitantInstance;
  parentB: InhabitantInstance;
  recipe: BreedingRecipeContent;
}> {
  const results: Array<{
    parentA: InhabitantInstance;
    parentB: InhabitantInstance;
    recipe: BreedingRecipeContent;
  }> = [];

  for (let i = 0; i < assignedInhabitants.length; i++) {
    for (let j = i + 1; j < assignedInhabitants.length; j++) {
      const a = assignedInhabitants[i];
      const b = assignedInhabitants[j];
      const recipe = breedingFindRecipe(a.definitionId, b.definitionId);
      if (recipe) {
        results.push({ parentA: a, parentB: b, recipe });
      }
    }
  }

  return results;
}

/**
 * Get inhabitants that can be mutated (not already mutated).
 */
export function breedingGetMutatableInhabitants(
  assignedInhabitants: InhabitantInstance[],
): InhabitantInstance[] {
  return assignedInhabitants.filter((i) => !i.mutated);
}

/**
 * Calculate hybrid breeding ticks accounting for recipe multiplier, upgrades, and adjacency.
 */
export function breedingGetHybridTicks(
  placedRoom: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
  recipeTimeMultiplier: number,
): number {
  let ticks = Math.round(BREEDING_BASE_TICKS * recipeTimeMultiplier);

  // Apply upgrade time multiplier
  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  for (const effect of effects) {
    if (effect.type === 'breedingTimeMultiplier') {
      ticks = Math.round(ticks * effect.value);
    }
  }

  // Check adjacent rooms for breedingAdjacencyEffects.hybridTimeReduction
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.breedingAdjacencyEffects?.hybridTimeReduction) {
      ticks = Math.round(
        ticks * (1 - adjDef.breedingAdjacencyEffects.hybridTimeReduction),
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
 * Calculate mutation odds (base + upgrade + adjacency).
 */
export function breedingGetMutationOdds(
  placedRoom: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
): { positive: number; neutral: number; negative: number } {
  let positiveBonus = 0;

  // Apply upgrade mutation odds bonus
  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  for (const effect of effects) {
    if (effect.type === 'mutationOddsBonus') {
      positiveBonus += effect.value;
    }
  }

  // Check adjacent rooms for breedingAdjacencyEffects.mutationOddsBonus
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.breedingAdjacencyEffects?.mutationOddsBonus) {
      positiveBonus += adjDef.breedingAdjacencyEffects.mutationOddsBonus;
    }
  }

  const positive = Math.min(0.95, MUTATION_POSITIVE_CHANCE + positiveBonus);
  const remaining = 1 - positive;
  const neutralRatio =
    MUTATION_NEUTRAL_CHANCE /
    (MUTATION_NEUTRAL_CHANCE + MUTATION_NEGATIVE_CHANCE);
  const neutral = remaining * neutralRatio;
  const negative = remaining * (1 - neutralRatio);

  return { positive, neutral, negative };
}

/**
 * Calculate hybrid stats from averaged parents.
 */
export function breedingCalculateHybridStats(
  parentADef: InhabitantContent,
  parentBDef: InhabitantContent,
): InhabitantStats {
  const avg = (a: number, b: number) => Math.round((a + b) / 2);

  return {
    hp: avg(parentADef.stats.hp, parentBDef.stats.hp),
    attack: avg(parentADef.stats.attack, parentBDef.stats.attack),
    defense: avg(parentADef.stats.defense, parentBDef.stats.defense),
    speed: avg(parentADef.stats.speed, parentBDef.stats.speed),
    workerEfficiency:
      Math.round(
        ((parentADef.stats.workerEfficiency +
          parentBDef.stats.workerEfficiency) /
          2) *
          100,
      ) / 100,
  };
}

/**
 * Create a new hybrid InhabitantInstance from two parents and a recipe.
 */
export function breedingCreateHybrid(
  parentA: InhabitantInstance,
  parentB: InhabitantInstance,
  recipe: BreedingRecipeContent,
): InhabitantInstance {
  const parentADef = contentGetEntry<InhabitantContent>(
    parentA.definitionId,
  );
  const parentBDef = contentGetEntry<InhabitantContent>(
    parentB.definitionId,
  );
  if (!parentADef || !parentBDef) {
    throw new Error('Parent definitions not found');
  }

  const stats = breedingCalculateHybridStats(parentADef, parentBDef);
  // Use parentA's definitionId as the base definition for the hybrid
  return {
    instanceId: rngUuid<InhabitantInstanceId>(),
    definitionId: parentA.definitionId,
    name: generateInhabitantName(parentADef.type),
    state: 'normal',
    assignedRoomId: undefined,
    hungerTicksWithoutFood: 0,
    instanceStatBonuses: {
      hp: stats.hp - parentADef.stats.hp,
      attack: stats.attack - parentADef.stats.attack,
      defense: stats.defense - parentADef.stats.defense,
      speed: stats.speed - parentADef.stats.speed,
      workerEfficiency:
        Math.round(
          (stats.workerEfficiency - parentADef.stats.workerEfficiency) * 100,
        ) / 100,
    },
    isHybrid: true,
    hybridParentIds: [
      parentA.definitionId as unknown as InhabitantInstanceId,
      parentB.definitionId as unknown as InhabitantInstanceId,
    ],
    instanceTraitIds: [
      recipe.resultInhabitantTraitId,
      ...(recipe.inhabitantTraitIds ?? []),
    ],
  };
}

/**
 * Apply a mutation to an inhabitant based on outcome.
 * Returns the mutated inhabitant (new object).
 * Positive → roll positive trait; Negative → roll negative trait; Neutral → set mutated only.
 */
export function breedingApplyMutation(
  inhabitant: InhabitantInstance,
  outcome: MutationOutcome,
  rng: PRNG,
): InhabitantInstance {
  const existingTraitIds = inhabitant.mutationTraitIds ?? [];

  if (outcome === 'positive') {
    const trait = mutationTraitRoll(false, existingTraitIds, rng);
    if (trait) return mutationTraitApply(inhabitant, trait);
  } else if (outcome === 'negative') {
    const trait = mutationTraitRollNegative(existingTraitIds, rng);
    if (trait) return mutationTraitApply(inhabitant, trait);
  }

  return { ...inhabitant, mutated: true };
}

/**
 * Determine mutation outcome based on RNG and odds.
 */
export function breedingRollMutationOutcome(
  odds: { positive: number; neutral: number; negative: number },
  rng: PRNG,
): MutationOutcome {
  const roll = rng();
  if (roll < odds.positive) return 'positive';
  if (roll < odds.positive + odds.neutral) return 'neutral';
  return 'negative';
}

/**
 * Get adjacent room type IDs for a breeding pits room.
 */
export function breedingGetAdjacentRoomTypeIds(
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
 * Process all Breeding Pits rooms each tick.
 * Called inside updateGamestate — mutates state in-place.
 */
export function breedingPitsProcess(state: GameState, numTicks = 1): void {
  const breedingPitsTypeId = roomRoleFindById('breedingPits');
  if (!breedingPitsTypeId) return;

  let inhabitantsChanged = false;

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== breedingPitsTypeId) continue;

      // Process breeding job
      if (room.breedingJob) {
        room.breedingJob.ticksRemaining -= numTicks;

        if (room.breedingJob.ticksRemaining <= 0) {
          const recipe = contentGetEntry<BreedingRecipeContent>(
            room.breedingJob.recipeId,
          );
          const parentA = state.world.inhabitants.find(
            (i) => i.instanceId === room.breedingJob!.parentAInstanceId,
          );
          const parentB = state.world.inhabitants.find(
            (i) => i.instanceId === room.breedingJob!.parentBInstanceId,
          );

          if (recipe && parentA && parentB) {
            const hybrid = breedingCreateHybrid(parentA, parentB, recipe);

            // Remove parents from roster
            state.world.inhabitants = state.world.inhabitants.filter(
              (i) =>
                i.instanceId !== parentA.instanceId &&
                i.instanceId !== parentB.instanceId,
            );

            // Add hybrid
            state.world.inhabitants = [...state.world.inhabitants, hybrid];
            inhabitantsChanged = true;

            // Clear breeding order since parents are consumed
            room.breedingInhabitantOrder = undefined;

            breedingCompletedSubject.next({
              roomId: room.id,
              hybridName: hybrid.name,
            });
          }

          room.breedingJob = undefined;
        }
      }

      // Process mutation job
      if (room.mutationJob) {
        room.mutationJob.ticksRemaining -= numTicks;

        if (room.mutationJob.ticksRemaining <= 0) {
          const targetIdx = state.world.inhabitants.findIndex(
            (i) => i.instanceId === room.mutationJob!.targetInstanceId,
          );

          if (targetIdx >= 0) {
            const adjacentTypes = breedingGetAdjacentRoomTypeIds(room, floor);
            const odds = breedingGetMutationOdds(room, adjacentTypes);
            const rng = rngRandom();
            const outcome = breedingRollMutationOutcome(odds, rng);
            const mutated = breedingApplyMutation(
              state.world.inhabitants[targetIdx],
              outcome,
              rng,
            );

            state.world.inhabitants[targetIdx] = mutated;
            inhabitantsChanged = true;

            mutationCompletedSubject.next({
              roomId: room.id,
              inhabitantName: mutated.name,
              outcome,
            });
          }

          room.mutationJob = undefined;
        }
      }
    }
  }

  // Sync floor inhabitants if any changed
  if (inhabitantsChanged) {
    for (const flr of state.world.floors) {
      flr.inhabitants = state.world.inhabitants;
    }
  }
}
