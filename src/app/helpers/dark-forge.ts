import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { craftingQueueGetMaxSize } from '@helpers/crafting-queue';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { reputationAwardInPlace } from '@helpers/reputation';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import type {
  Floor,
  ForgeCraftingJob,
  ForgeInventoryEntry,
  ForgeRecipeContent,
  ForgeRecipeId,
  GameState,
  InhabitantStats,
  PlacedRoom,
} from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';
import type { DarkForgeCompletedEvent } from '@interfaces/forge';
import { Subject } from 'rxjs';

// --- Constants ---

/** Base crafting time: 20 game-minutes = 20 ticks */
export const DARK_FORGE_BASE_CRAFTING_TICKS = GAME_TIME_TICKS_PER_MINUTE * 20;

const darkForgeCompletedSubject = new Subject<DarkForgeCompletedEvent>();
export const darkForgeCompleted$ = darkForgeCompletedSubject.asObservable();

// --- Pure helpers ---

/**
 * Get available forge recipes for a room, filtered by tier.
 * Base rooms can only use 'basic' recipes.
 * With the Infernal Forge upgrade, 'advanced' recipes are also available.
 */
export function darkForgeGetAvailableRecipes(
  room: PlacedRoom,
): Array<ForgeRecipeContent> {
  const recipes = contentGetEntriesByType<ForgeRecipeContent>('forgerecipe');

  const effects = roomUpgradeGetAppliedEffects(room);
  const hasInfernalForge = effects.some((e) => e.type === 'forgingTierUnlock');

  return recipes.filter((r) => {
    if (r.tier === 'basic') return true;
    if (r.tier === 'advanced' && hasInfernalForge) return true;
    return false;
  });
}

/**
 * Calculate effective crafting ticks, accounting for recipe multiplier,
 * worker scaling, upgrade speed, and adjacency speed bonus.
 */
export function darkForgeGetCraftingTicks(
  room: PlacedRoom,
  assignedWorkerCount: number,
  recipeTimeMultiplier: number,
  adjacentRoomTypeIds: Set<string>,
): number {
  let ticks = Math.round(DARK_FORGE_BASE_CRAFTING_TICKS * recipeTimeMultiplier);

  // Apply upgrade speed multiplier
  const effects = roomUpgradeGetAppliedEffects(room);
  for (const effect of effects) {
    if (effect.type === 'forgingSpeedMultiplier') {
      ticks = Math.round(ticks * effect.value);
    }
  }

  // Each additional worker beyond the first reduces time by 20%, capped at 0.4 multiplier
  if (assignedWorkerCount > 1) {
    const workerSpeedBonus = 1 - (assignedWorkerCount - 1) * 0.2;
    ticks = Math.round(ticks * Math.max(0.4, workerSpeedBonus));
  }

  // Check adjacent rooms for forgingAdjacencyEffects.forgingSpeedBonus
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.forgingAdjacencyEffects?.forgingSpeedBonus) {
      ticks = Math.round(ticks * (1 - adjDef.forgingAdjacencyEffects.forgingSpeedBonus));
    }
  }

  const researchCraftBonus = researchUnlockGetPassiveBonusWithMastery('craftingSpeed');
  if (researchCraftBonus > 0) {
    ticks = Math.max(1, Math.round(ticks * (1 / (1 + researchCraftBonus))));
  }

  return Math.max(1, ticks);
}

/**
 * Calculate stat bonuses from recipe + Infernal Forge upgrade + adjacency bonuses.
 */
export function darkForgeGetStatBonuses(
  room: PlacedRoom,
  recipe: ForgeRecipeContent,
  adjacentRoomTypeIds: Set<string>,
): Partial<InhabitantStats> {
  const bonuses: Partial<InhabitantStats> = { ...recipe.statBonuses };

  // Apply upgrade stat bonus (flat +N to all stats)
  const effects = roomUpgradeGetAppliedEffects(room);
  let upgradeBonus = 0;
  for (const effect of effects) {
    if (effect.type === 'forgingStatBonus') {
      upgradeBonus += effect.value;
    }
  }

  // Apply adjacency stat bonus (flat +N to all stats)
  let adjacencyBonus = 0;
  for (const adjTypeId of adjacentRoomTypeIds) {
    const adjDef = contentGetEntry<RoomContent>(adjTypeId);
    if (adjDef?.forgingAdjacencyEffects?.forgingStatBonus) {
      adjacencyBonus += adjDef.forgingAdjacencyEffects.forgingStatBonus;
    }
  }

  const totalFlat = upgradeBonus + adjacencyBonus;
  if (totalFlat > 0) {
    const statKeys: Array<keyof InhabitantStats> = ['hp', 'attack', 'defense', 'speed'];
    for (const key of statKeys) {
      bonuses[key] = (bonuses[key] ?? 0) + totalFlat;
    }
  }

  return bonuses;
}

// --- Queue management ---

export function darkForgeGetQueue(room: PlacedRoom): ForgeCraftingJob[] {
  return room.forgeJobs ?? [];
}

export function darkForgeAddJob(
  room: PlacedRoom,
  recipeId: ForgeRecipeId,
  targetTicks: number,
): void {
  if (!room.forgeJobs) room.forgeJobs = [];
  room.forgeJobs.push({ recipeId, progress: 0, targetTicks });
}

export function darkForgeRemoveJob(
  room: PlacedRoom,
  jobIndex: number,
): void {
  if (!room.forgeJobs) return;
  room.forgeJobs.splice(jobIndex, 1);
  if (room.forgeJobs.length === 0) room.forgeJobs = undefined;
}

export function darkForgeRemoveJobGroup(
  room: PlacedRoom,
  startIndex: number,
  count: number,
): void {
  if (!room.forgeJobs) return;
  room.forgeJobs.splice(startIndex, count);
  if (room.forgeJobs.length === 0) room.forgeJobs = undefined;
}

// --- Inventory management ---

const STAT_KEYS: Array<keyof InhabitantStats> = [
  'hp',
  'attack',
  'defense',
  'speed',
  'workerEfficiency',
];

function statBonusesEqual(
  a: Partial<InhabitantStats>,
  b: Partial<InhabitantStats>,
): boolean {
  for (const key of STAT_KEYS) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) return false;
  }
  return true;
}

function statBonusSum(bonuses: Partial<InhabitantStats>): number {
  let sum = 0;
  for (const key of STAT_KEYS) {
    sum += bonuses[key] ?? 0;
  }
  return sum;
}

export function darkForgeAddToInventory(
  inventory: ForgeInventoryEntry[],
  recipeId: ForgeRecipeId,
  bakedStatBonuses: Partial<InhabitantStats>,
  count = 1,
): ForgeInventoryEntry[] {
  const updated = [...inventory];
  const existing = updated.find(
    (e) => e.recipeId === recipeId && statBonusesEqual(e.bakedStatBonuses, bakedStatBonuses),
  );
  if (existing) {
    existing.count += count;
  } else {
    updated.push({ recipeId, count, bakedStatBonuses });
  }
  return updated;
}

export function darkForgeRemoveFromInventory(
  inventory: ForgeInventoryEntry[],
  recipeId: ForgeRecipeId,
  bakedStatBonuses: Partial<InhabitantStats>,
  count = 1,
): ForgeInventoryEntry[] {
  const updated = [...inventory];
  const idx = updated.findIndex(
    (e) => e.recipeId === recipeId && statBonusesEqual(e.bakedStatBonuses, bakedStatBonuses),
  );
  if (idx === -1) return updated;

  updated[idx].count -= count;
  if (updated[idx].count <= 0) {
    updated.splice(idx, 1);
  }
  return updated;
}

// --- Auto-equip ---

/**
 * Auto-equip forge inventory items onto unequipped inhabitants on a floor.
 * Best items (highest stat sum) are equipped first.
 * Mutates inhabitants and inventory in-place.
 */
export function darkForgeAutoEquip(
  state: GameState,
  floor: Floor,
): void {
  if (state.world.forgeInventory.length === 0) return;

  const unequipped = floor.inhabitants.filter(
    (i) => !i.equippedForgeItemRecipeId && i.assignedRoomId,
  );
  if (unequipped.length === 0) return;

  // Sort inventory by total stat sum (best first)
  const sorted = [...state.world.forgeInventory]
    .map((entry) => ({ entry, sum: statBonusSum(entry.bakedStatBonuses) }))
    .sort((a, b) => b.sum - a.sum);

  for (const inhabitant of unequipped) {
    const bestIdx = sorted.findIndex((e) => e.entry.count > 0);
    if (bestIdx === -1) break;

    const best = sorted[bestIdx];
    inhabitant.equippedForgeItemRecipeId = best.entry.recipeId;
    inhabitant.equippedStatBonuses = { ...best.entry.bakedStatBonuses };

    // Sync to world inhabitants if floor/world have separate object references
    const worldInst = state.world.inhabitants.find(
      (w) => w.instanceId === inhabitant.instanceId,
    );
    if (worldInst && worldInst !== inhabitant) {
      worldInst.equippedForgeItemRecipeId = inhabitant.equippedForgeItemRecipeId;
      worldInst.equippedStatBonuses = inhabitant.equippedStatBonuses;
    }

    best.entry.count -= 1;
  }

  // Rebuild inventory, removing depleted stacks
  state.world.forgeInventory = state.world.forgeInventory.filter((e) => e.count > 0);
}

// --- Validation ---

export function darkForgeCanQueue(
  room: PlacedRoom,
  floor: Floor,
): { canQueue: boolean; reason?: string } {
  if (room.roomTypeId !== roomRoleFindById('darkForge')) {
    return { canQueue: false, reason: 'Room is not a Dark Forge' };
  }

  const assignedCount = floor.inhabitants.filter(
    (i) => i.assignedRoomId === room.id,
  ).length;
  if (assignedCount < 1) {
    return {
      canQueue: false,
      reason: 'At least 1 inhabitant must be assigned to forge items',
    };
  }

  const maxSize = craftingQueueGetMaxSize(room);
  const currentSize = (room.forgeJobs ?? []).length;
  if (currentSize >= maxSize) {
    return {
      canQueue: false,
      reason: `Queue is full (max ${maxSize})`,
    };
  }

  return { canQueue: true };
}

// --- Adjacency ---

/**
 * Get adjacent room type IDs for a dark forge room.
 */
export function darkForgeGetAdjacentRoomTypeIds(
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
 * Process all Dark Forge rooms each tick.
 * Called inside updateGamestate — mutates state in-place.
 */
export function darkForgeProcess(state: GameState, numTicks = 1): void {
  const darkForgeTypeId = roomRoleFindById('darkForge');
  if (!darkForgeTypeId) return;

  for (const floor of state.world.floors) {
    let floorHasForge = false;

    for (const room of floor.rooms) {
      if (room.roomTypeId !== darkForgeTypeId) continue;
      floorHasForge = true;
      if (!room.forgeJobs || room.forgeJobs.length === 0) continue;

      // Only the first job in the queue progresses
      const assignedCount = floor.inhabitants.filter(
        (i) => i.assignedRoomId === room.id,
      ).length;
      if (assignedCount < 1) continue;

      const job = room.forgeJobs[0];
      job.progress += numTicks;

      if (job.progress >= job.targetTicks) {
        // Job complete: compute baked bonuses and add to inventory
        const recipe = contentGetEntry<ForgeRecipeContent>(job.recipeId);

        const adjacentTypes = darkForgeGetAdjacentRoomTypeIds(room, floor);
        const bakedBonuses = recipe
          ? darkForgeGetStatBonuses(room, recipe, adjacentTypes)
          : {};

        state.world.forgeInventory = darkForgeAddToInventory(
          state.world.forgeInventory,
          job.recipeId,
          bakedBonuses,
        );

        room.forgeJobs.shift();

        // Clean up empty arrays
        if (room.forgeJobs.length === 0) {
          room.forgeJobs = undefined;
        }

        if (recipe) {
          reputationAwardInPlace(state, 'Forge Equipment');

          darkForgeCompletedSubject.next({
            roomId: room.id,
            recipeName: recipe.name,
          });
        }
      }
    }

    // Auto-equip inhabitants on floors with a forge
    if (floorHasForge) {
      darkForgeAutoEquip(state, floor);
    }
  }
}
