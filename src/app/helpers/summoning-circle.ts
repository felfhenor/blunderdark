import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { rngChoice, rngUuid } from '@helpers/rng';
import { roomRoleFindById } from '@helpers/room-roles';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import type {
  GameState,
  InhabitantDefinition,
  InhabitantInstance,
  InhabitantInstanceId,
  InhabitantStats,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  SummonRecipeContent,
} from '@interfaces';
import type {
  SummoningCompletedEvent,
  SummoningExpiredEvent,
} from '@interfaces/summoning';
import { Subject } from 'rxjs';

// --- Constants ---

export const SUMMONING_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 4; // 20 ticks = 4 game-minutes

const summoningCompletedSubject = new Subject<SummoningCompletedEvent>();
export const summoningCompleted$ = summoningCompletedSubject.asObservable();

const summoningExpiredSubject = new Subject<SummoningExpiredEvent>();
export const summoningExpired$ = summoningExpiredSubject.asObservable();

// --- Pure helpers ---

/**
 * Get available summon recipes for a room, filtered by tier.
 * Base rooms can only use 'rare' recipes.
 * With the Greater Summoning upgrade, 'advanced' recipes are also available.
 */
export function summoningGetAvailableRecipes(
  room: PlacedRoom,
): Array<SummonRecipeContent & IsContentItem> {
  const recipes = contentGetEntriesByType<SummonRecipeContent & IsContentItem>(
    'summonrecipe',
  );

  const effects = roomUpgradeGetAppliedEffects(room);
  const hasGreaterSummoning = effects.some(
    (e) => e.type === 'summonTierUnlock',
  );

  return recipes.filter((r) => {
    if (r.tier === 'rare') return true;
    if (r.tier === 'advanced' && hasGreaterSummoning) return true;
    return false;
  });
}

/**
 * Calculate effective summoning ticks, accounting for recipe multiplier and adjacency time reduction.
 */
export function summoningGetEffectiveTicks(
  room: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
  recipeTimeMultiplier: number,
): number {
  let ticks = Math.round(SUMMONING_BASE_TICKS * recipeTimeMultiplier);

  // Check adjacent rooms for summoningAdjacencyEffects.summonTimeReduction
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomDefinition & IsContentItem>(adjTypeId);
    if (adjDef?.summoningAdjacencyEffects?.summonTimeReduction) {
      ticks = Math.round(
        ticks * (1 - adjDef.summoningAdjacencyEffects.summonTimeReduction),
      );
    }
  }

  return Math.max(1, ticks);
}

/**
 * Calculate stat bonuses from recipe + upgrade + adjacency.
 */
export function summoningGetStatBonuses(
  room: PlacedRoom,
  adjacentRoomTypeIds: Set<string>,
  recipe: SummonRecipeContent,
): Partial<InhabitantStats> {
  const bonuses: Partial<InhabitantStats> = { ...recipe.statBonuses };

  // Apply upgrade stat bonus (flat +N to all stats)
  const effects = roomUpgradeGetAppliedEffects(room);
  let upgradeBonus = 0;
  for (const effect of effects) {
    if (effect.type === 'summonStatBonus') {
      upgradeBonus += effect.value;
    }
  }

  // Apply adjacency stat bonus (flat +N to all stats)
  let adjacencyBonus = 0;
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomDefinition & IsContentItem>(adjTypeId);
    if (adjDef?.summoningAdjacencyEffects?.summonStatBonus) {
      adjacencyBonus += adjDef.summoningAdjacencyEffects.summonStatBonus;
    }
  }

  const totalFlat = upgradeBonus + adjacencyBonus;
  if (totalFlat > 0) {
    const statKeys: Array<keyof InhabitantStats> = [
      'hp',
      'attack',
      'defense',
      'speed',
    ];
    for (const key of statKeys) {
      bonuses[key] = (bonuses[key] ?? 0) + totalFlat;
    }
  }

  return bonuses;
}

/**
 * Calculate effective duration for temporary summons, accounting for Binding Mastery upgrade.
 */
export function summoningGetEffectiveDuration(
  room: PlacedRoom,
  baseDuration: number,
): number {
  const effects = roomUpgradeGetAppliedEffects(room);
  let multiplier = 1.0;
  for (const effect of effects) {
    if (effect.type === 'summonDurationMultiplier') {
      multiplier = effect.value;
    }
  }
  return Math.round(baseDuration * multiplier);
}

/**
 * Check if summoning can start: needs at least 1 assigned inhabitant and no active job.
 */
export function summoningCanStart(
  room: PlacedRoom,
  inhabitants: InhabitantInstance[],
): boolean {
  if (room.summonJob) return false;
  const assigned = inhabitants.filter((i) => i.assignedRoomId === room.id);
  return assigned.length >= 1;
}

/**
 * Create a summoned InhabitantInstance from a definition and recipe.
 */
export function summoningCreateInhabitant(
  def: InhabitantDefinition & IsContentItem,
  recipe: SummonRecipeContent,
  statBonuses: Partial<InhabitantStats>,
  isTemporary: boolean,
  duration?: number,
): InhabitantInstance {
  const suffixes = [
    'the Summoned',
    'the Bound',
    'the Called',
    'the Conjured',
    'the Invoked',
  ];
  const suffix = rngChoice(suffixes);

  const mutationBonuses: Partial<InhabitantStats> = {};
  const statKeys = Object.keys(statBonuses) as Array<keyof InhabitantStats>;
  for (const key of statKeys) {
    const bonus = statBonuses[key];
    if (bonus !== undefined && bonus !== 0) {
      mutationBonuses[key] = bonus;
    }
  }

  return {
    instanceId: rngUuid<InhabitantInstanceId>(),
    definitionId: def.id,
    name: `${def.name} ${suffix}`,
    state: 'normal',
    assignedRoomId: undefined,
    trained: false,
    trainingProgress: 0,
    trainingBonuses: { defense: 0, attack: 0 },
    hungerTicksWithoutFood: 0,
    mutationBonuses:
      Object.keys(mutationBonuses).length > 0 ? mutationBonuses : undefined,
    isSummoned: true,
    isTemporary: isTemporary || undefined,
    temporaryTicksRemaining: isTemporary ? duration : undefined,
  };
}

/**
 * Get adjacent room type IDs for a summoning circle room.
 */
export function summoningGetAdjacentRoomTypeIds(
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
 * Process all Summoning Circle rooms each tick.
 * Called inside updateGamestate — mutates state in-place.
 */
export function summoningCircleProcess(state: GameState): void {
  const summoningCircleTypeId = roomRoleFindById('summoningCircle');
  if (!summoningCircleTypeId) return;

  let inhabitantsChanged = false;
  const newTemporaryIds = new Set<string>();

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== summoningCircleTypeId) continue;

      // Process active summon job
      if (room.summonJob) {
        room.summonJob.ticksRemaining -= 1;

        if (room.summonJob.ticksRemaining <= 0) {
          const recipe = contentGetEntry<SummonRecipeContent & IsContentItem>(
            room.summonJob.recipeId,
          );

          if (recipe) {
            const def = contentGetEntry<InhabitantDefinition & IsContentItem>(
              recipe.resultInhabitantId,
            );

            if (def) {
              const adjacentTypes = summoningGetAdjacentRoomTypeIds(
                room,
                floor,
              );
              const statBonuses = summoningGetStatBonuses(
                room,
                adjacentTypes,
                recipe,
              );
              const isTemporary = recipe.summonType === 'temporary';
              const duration =
                isTemporary && recipe.duration
                  ? summoningGetEffectiveDuration(room, recipe.duration)
                  : undefined;

              const summoned = summoningCreateInhabitant(
                def,
                recipe,
                statBonuses,
                isTemporary,
                duration,
              );

              state.world.inhabitants = [...state.world.inhabitants, summoned];
              inhabitantsChanged = true;

              if (isTemporary) {
                newTemporaryIds.add(summoned.instanceId);
              }

              summoningCompletedSubject.next({
                roomId: room.id,
                inhabitantName: summoned.name,
                summonType: recipe.summonType,
              });
            }
          }

          room.summonJob = undefined;
        }
      }
    }
  }

  // Process temporary inhabitant expiry (across all inhabitants, not just summoning circle rooms)
  // Skip newly created temporaries — they should not tick down on the same tick they spawn
  for (let i = state.world.inhabitants.length - 1; i >= 0; i--) {
    const inh = state.world.inhabitants[i];
    if (!inh.isTemporary || inh.temporaryTicksRemaining === undefined) continue;
    if (newTemporaryIds.has(inh.instanceId)) continue;

    inh.temporaryTicksRemaining -= 1;

    if (inh.temporaryTicksRemaining <= 0) {
      summoningExpiredSubject.next({ inhabitantName: inh.name });
      state.world.inhabitants = state.world.inhabitants.filter(
        (_, idx) => idx !== i,
      );
      inhabitantsChanged = true;
    }
  }

  // Sync floor inhabitants if any changed
  if (inhabitantsChanged) {
    for (const flr of state.world.floors) {
      flr.inhabitants = state.world.inhabitants;
    }
  }
}
