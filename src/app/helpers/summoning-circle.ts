import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { generateInhabitantName } from '@helpers/inhabitant-names';
import { recruitmentMaxInhabitantCount } from '@helpers/recruitment';
import { reputationAwardInPlace } from '@helpers/reputation';
import { rngUuid } from '@helpers/rng';
import { roomRoleFindById } from '@helpers/room-roles';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import type {
  GameState,
  InhabitantInstance,
  InhabitantInstanceId,
  InhabitantStats,
  PlacedRoom,
  SummonRecipeContent,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type {
  SummoningCompletedEvent,
  SummoningDismissedEvent,
} from '@interfaces/summoning';
import { Subject } from 'rxjs';

// --- Constants ---

export const SUMMONING_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 4; // 20 ticks = 4 game-minutes

const summoningCompletedSubject = new Subject<SummoningCompletedEvent>();
export const summoningCompleted$ = summoningCompletedSubject.asObservable();

const summoningDismissedSubject = new Subject<SummoningDismissedEvent>();
export const summoningDismissed$ = summoningDismissedSubject.asObservable();

// --- Pure helpers ---

/**
 * Get available summon recipes for a room, filtered by tier.
 * Base rooms can only use 'rare' recipes.
 * With the Greater Summoning upgrade, 'advanced' recipes are also available.
 */
export function summoningGetAvailableRecipes(
  room: PlacedRoom,
): Array<SummonRecipeContent> {
  const recipes = contentGetEntriesByType<SummonRecipeContent>(
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
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.summoningAdjacencyEffects?.summonTimeReduction) {
      ticks = Math.round(
        ticks * (1 - adjDef.summoningAdjacencyEffects.summonTimeReduction),
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
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
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
  def: InhabitantContent,
  recipe: SummonRecipeContent,
  statBonuses: Partial<InhabitantStats>,
): InhabitantInstance {
  const instanceStatBonuses: Partial<InhabitantStats> = {};
  const statKeys = Object.keys(statBonuses) as Array<keyof InhabitantStats>;
  for (const key of statKeys) {
    const bonus = statBonuses[key];
    if (bonus !== undefined && bonus !== 0) {
      instanceStatBonuses[key] = bonus;
    }
  }

  return {
    instanceId: rngUuid<InhabitantInstanceId>(),
    definitionId: def.id,
    name: generateInhabitantName(def.type),
    state: 'normal',
    assignedRoomId: undefined,
    trained: false,
    trainingProgress: 0,
    trainingBonuses: { defense: 0, attack: 0 },
    hungerTicksWithoutFood: 0,
    instanceStatBonuses:
      Object.keys(instanceStatBonuses).length > 0 ? instanceStatBonuses : undefined,
    isSummoned: true,
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
export function summoningCircleProcess(state: GameState, numTicks = 1): void {
  const summoningCircleTypeId = roomRoleFindById('summoningCircle');
  if (!summoningCircleTypeId) return;

  let inhabitantsChanged = false;

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== summoningCircleTypeId) continue;

      // Process active summon job
      if (room.summonJob) {
        room.summonJob.ticksRemaining -= numTicks;

        if (room.summonJob.ticksRemaining <= 0) {
          const recipe = contentGetEntry<SummonRecipeContent>(
            room.summonJob.recipeId,
          );

          if (recipe) {
            const def = contentGetEntry<InhabitantContent>(
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

              const summoned = summoningCreateInhabitant(
                def,
                recipe,
                statBonuses,
              );

              // Check global roster cap before adding
              if (state.world.inhabitants.length >= recruitmentMaxInhabitantCount()) {
                summoningDismissedSubject.next({
                  inhabitantName: summoned.name,
                  inhabitantType: def.type,
                });
              } else {
                state.world.inhabitants = [...state.world.inhabitants, summoned];
                inhabitantsChanged = true;

                reputationAwardInPlace(state, 'Summon Wraith');

                summoningCompletedSubject.next({
                  roomId: room.id,
                  inhabitantName: summoned.name,
                  inhabitantType: def.type,
                });
              }
            }
          }

          room.summonJob = undefined;
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
