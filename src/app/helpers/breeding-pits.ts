import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { rngChoice, rngRandom, rngUuid } from '@helpers/rng';
import type {
  BreedingRecipeContent,
  GameState,
  InhabitantDefinition,
  InhabitantInstance,
  InhabitantStats,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
} from '@interfaces';
import { Subject } from 'rxjs';
import type { PRNG } from 'seedrandom';
import type { MutationOutcome, BreedingCompletedEvent, MutationCompletedEvent } from '@interfaces/breeding';

// --- Constants ---

export const BREEDING_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 5; // 25 ticks
export const MUTATION_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 3; // 15 ticks

export const MUTATION_POSITIVE_CHANCE = 0.6;
export const MUTATION_NEUTRAL_CHANCE = 0.25;
export const MUTATION_NEGATIVE_CHANCE = 0.15;

export const MUTATION_POSITIVE_BONUS = 0.2;
export const MUTATION_NEGATIVE_PENALTY = 0.15;

const breedingCompletedSubject = new Subject<BreedingCompletedEvent>();
export const breedingCompleted$ = breedingCompletedSubject.asObservable();

const mutationCompletedSubject = new Subject<MutationCompletedEvent>();
export const mutationCompleted$ = mutationCompletedSubject.asObservable();

// --- Pure helpers ---

/**
 * Find a breeding recipe matching two parent definition IDs (order-independent).
 */
export function breedingFindRecipe(
  parentADefId: string,
  parentBDefId: string,
): (BreedingRecipeContent & IsContentItem) | undefined {
  const recipes = contentGetEntriesByType<BreedingRecipeContent & IsContentItem>('breedingrecipe');
  return recipes.find(
    (r) =>
      (r.parentInhabitantAId === parentADefId && r.parentInhabitantBId === parentBDefId) ||
      (r.parentInhabitantAId === parentBDefId && r.parentInhabitantBId === parentADefId),
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
  recipe: BreedingRecipeContent & IsContentItem;
}> {
  const results: Array<{
    parentA: InhabitantInstance;
    parentB: InhabitantInstance;
    recipe: BreedingRecipeContent & IsContentItem;
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
    const adjDef = contentGetEntry<RoomDefinition & IsContentItem>(adjTypeId);
    if (adjDef?.breedingAdjacencyEffects?.hybridTimeReduction) {
      ticks = Math.round(ticks * (1 - adjDef.breedingAdjacencyEffects.hybridTimeReduction));
    }
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
    const adjDef = contentGetEntry<RoomDefinition & IsContentItem>(adjTypeId);
    if (adjDef?.breedingAdjacencyEffects?.mutationOddsBonus) {
      positiveBonus += adjDef.breedingAdjacencyEffects.mutationOddsBonus;
    }
  }

  const positive = Math.min(0.95, MUTATION_POSITIVE_CHANCE + positiveBonus);
  const remaining = 1 - positive;
  const neutralRatio = MUTATION_NEUTRAL_CHANCE / (MUTATION_NEUTRAL_CHANCE + MUTATION_NEGATIVE_CHANCE);
  const neutral = remaining * neutralRatio;
  const negative = remaining * (1 - neutralRatio);

  return { positive, neutral, negative };
}

/**
 * Calculate hybrid stats from averaged parents + recipe bonuses.
 */
export function breedingCalculateHybridStats(
  parentADef: InhabitantDefinition,
  parentBDef: InhabitantDefinition,
  recipe: BreedingRecipeContent,
  statBonusMultiplier = 1.0,
): InhabitantStats {
  const avg = (a: number, b: number) => Math.round((a + b) / 2);

  const stats: InhabitantStats = {
    hp: avg(parentADef.stats.hp, parentBDef.stats.hp),
    attack: avg(parentADef.stats.attack, parentBDef.stats.attack),
    defense: avg(parentADef.stats.defense, parentBDef.stats.defense),
    speed: avg(parentADef.stats.speed, parentBDef.stats.speed),
    workerEfficiency: (parentADef.stats.workerEfficiency + parentBDef.stats.workerEfficiency) / 2,
  };

  // Apply recipe stat bonuses
  const bonusKeys = Object.keys(recipe.statBonuses) as Array<keyof InhabitantStats>;
  for (const key of bonusKeys) {
    const bonus = recipe.statBonuses[key];
    if (bonus !== undefined) {
      stats[key] += bonus * statBonusMultiplier;
    }
  }

  // Round workerEfficiency to 2 decimal places
  stats.workerEfficiency = Math.round(stats.workerEfficiency * 100) / 100;

  return stats;
}

/**
 * Create a new hybrid InhabitantInstance from two parents and a recipe.
 */
export function breedingCreateHybrid(
  parentA: InhabitantInstance,
  parentB: InhabitantInstance,
  recipe: BreedingRecipeContent,
  statBonusMultiplier = 1.0,
): InhabitantInstance {
  const parentADef = contentGetEntry<InhabitantDefinition & IsContentItem>(parentA.definitionId);
  const parentBDef = contentGetEntry<InhabitantDefinition & IsContentItem>(parentB.definitionId);
  if (!parentADef || !parentBDef) {
    throw new Error('Parent definitions not found');
  }

  const stats = breedingCalculateHybridStats(parentADef, parentBDef, recipe, statBonusMultiplier);
  const suffixes = ['the Hybrid', 'the Crossed', 'the Merged', 'the Blended', 'the Fused'];
  const suffix = rngChoice(suffixes);

  // Use parentA's definitionId as the base definition for the hybrid
  return {
    instanceId: rngUuid(),
    definitionId: parentA.definitionId,
    name: `${recipe.resultName} ${suffix}`,
    state: 'normal',
    assignedRoomId: undefined,
    trained: false,
    trainingProgress: 0,
    trainingBonuses: { defense: 0, attack: 0 },
    hungerTicksWithoutFood: 0,
    mutationBonuses: {
      hp: stats.hp - parentADef.stats.hp,
      attack: stats.attack - parentADef.stats.attack,
      defense: stats.defense - parentADef.stats.defense,
      speed: stats.speed - parentADef.stats.speed,
      workerEfficiency: Math.round((stats.workerEfficiency - parentADef.stats.workerEfficiency) * 100) / 100,
    },
    isHybrid: true,
    hybridParentIds: [parentA.definitionId, parentB.definitionId],
  };
}

/**
 * Apply a mutation to an inhabitant based on outcome.
 * Returns the mutated inhabitant (new object).
 */
export function breedingApplyMutation(
  inhabitant: InhabitantInstance,
  outcome: MutationOutcome,
  rng: PRNG,
): InhabitantInstance {
  const def = contentGetEntry<InhabitantDefinition & IsContentItem>(inhabitant.definitionId);
  if (!def) return { ...inhabitant, mutated: true };

  const statKeys: Array<keyof InhabitantStats> = ['hp', 'attack', 'defense', 'speed', 'workerEfficiency'];
  const targetStat = statKeys[Math.floor(rng() * statKeys.length)];
  const baseStat = def.stats[targetStat];

  let change = 0;
  if (outcome === 'positive') {
    change = Math.round(baseStat * MUTATION_POSITIVE_BONUS * 100) / 100;
  } else if (outcome === 'negative') {
    change = -Math.round(baseStat * MUTATION_NEGATIVE_PENALTY * 100) / 100;
  }

  const existing = inhabitant.mutationBonuses ?? {};
  const currentBonus = existing[targetStat] ?? 0;

  return {
    ...inhabitant,
    mutated: true,
    mutationBonuses: {
      ...existing,
      [targetStat]: Math.round((currentBonus + change) * 100) / 100,
    },
  };
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
export function breedingPitsProcess(state: GameState): void {
  const breedingPitsTypeId = roomRoleFindById('breedingPits');
  if (!breedingPitsTypeId) return;

  let inhabitantsChanged = false;

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== breedingPitsTypeId) continue;

      // Process breeding job
      if (room.breedingJob) {
        room.breedingJob.ticksRemaining -= 1;

        if (room.breedingJob.ticksRemaining <= 0) {
          const recipe = contentGetEntry<BreedingRecipeContent & IsContentItem>(room.breedingJob.recipeId);
          const parentA = state.world.inhabitants.find(
            (i) => i.instanceId === room.breedingJob!.parentAInstanceId,
          );
          const parentB = state.world.inhabitants.find(
            (i) => i.instanceId === room.breedingJob!.parentBInstanceId,
          );

          if (recipe && parentA && parentB) {
            // Get stat bonus multiplier from upgrades
            let statBonusMultiplier = 1.0;
            const effects = roomUpgradeGetAppliedEffects(room);
            for (const effect of effects) {
              if (effect.type === 'mutationStatBonus') {
                statBonusMultiplier += effect.value;
              }
            }

            const hybrid = breedingCreateHybrid(parentA, parentB, recipe, statBonusMultiplier);

            // Remove parents from roster
            state.world.inhabitants = state.world.inhabitants.filter(
              (i) => i.instanceId !== parentA.instanceId && i.instanceId !== parentB.instanceId,
            );

            // Add hybrid
            state.world.inhabitants = [...state.world.inhabitants, hybrid];
            inhabitantsChanged = true;

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
        room.mutationJob.ticksRemaining -= 1;

        if (room.mutationJob.ticksRemaining <= 0) {
          const targetIdx = state.world.inhabitants.findIndex(
            (i) => i.instanceId === room.mutationJob!.targetInstanceId,
          );

          if (targetIdx >= 0) {
            const adjacentTypes = breedingGetAdjacentRoomTypeIds(room, floor);
            const odds = breedingGetMutationOdds(room, adjacentTypes);
            const rng = rngRandom();
            const outcome = breedingRollMutationOutcome(odds, rng);
            const mutated = breedingApplyMutation(state.world.inhabitants[targetIdx], outcome, rng);

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
