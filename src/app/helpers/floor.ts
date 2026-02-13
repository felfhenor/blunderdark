import { computed } from '@angular/core';
import { defaultFloor } from '@helpers/defaults';
import { gridCreateEmpty } from '@helpers/grid';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { BiomeType, Floor, GameStateWorld, ResourceCost } from '@interfaces';
import { MAX_FLOORS } from '@interfaces/floor';

const CRYSTALS_PER_DEPTH = 50;
const GOLD_PER_DEPTH = 30;

/**
 * Get the current floor based on floorCurrentIndex.
 */
export const floorCurrent = computed<Floor | undefined>(() => {
  const state = gamestate();
  const index = state.world.currentFloorIndex;
  return state.world.floors[index];
});

/**
 * Get the biome of the current floor.
 */
export const floorCurrentBiome = computed<BiomeType>(() => {
  const floor = floorCurrent();
  return floor?.biome ?? 'neutral';
});

/**
 * Get all floors.
 */
export const floorAll = computed<Floor[]>(() => {
  return gamestate().world.floors;
});

/**
 * Get a floor by its ID.
 */
export function floorGet(floorId: string): Floor | undefined {
  return gamestate().world.floors.find((f) => f.id === floorId);
}

/**
 * Get the biome of a specific floor by ID.
 * Returns 'neutral' if floor not found.
 */
export function floorGetBiome(floorId: string): BiomeType {
  const floor = floorGet(floorId);
  return floor?.biome ?? 'neutral';
}

/**
 * Get a floor by its depth (1-based).
 * Returns undefined if no floor exists at that depth.
 */
export function floorGetByDepth(depth: number): Floor | undefined {
  return gamestate().world.floors.find((f) => f.depth === depth);
}

/**
 * Get the current floor index.
 */
export const floorCurrentIndex = computed<number>(() => {
  return gamestate().world.currentFloorIndex;
});

/**
 * Set the current floor by index.
 * Returns false if index is out of bounds.
 */
export async function floorSetCurrentByIndex(index: number): Promise<boolean> {
  const floors = gamestate().world.floors;
  if (index < 0 || index >= floors.length) {
    return false;
  }

  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      currentFloorIndex: index,
    },
  }));
  return true;
}

/**
 * Set the current floor by floor ID.
 * Returns false if floor not found.
 */
export async function floorSetCurrentById(floorId: string): Promise<boolean> {
  const floors = gamestate().world.floors;
  const index = floors.findIndex((f) => f.id === floorId);
  if (index === -1) {
    return false;
  }

  return floorSetCurrentByIndex(index);
}

/**
 * Calculate the resource cost to create a floor at the given depth.
 * Costs scale linearly: 50 crystals + 30 gold per depth level.
 */
export function floorGetCreationCost(depth: number): ResourceCost {
  return {
    crystals: CRYSTALS_PER_DEPTH * depth,
    gold: GOLD_PER_DEPTH * depth,
  };
}

/**
 * Check whether a new floor can be created.
 * Returns an object with whether creation is possible and a reason if not.
 */
export function floorCanCreate(): { canCreate: boolean; reason?: string } {
  const floors = gamestate().world.floors;

  if (floors.length >= MAX_FLOORS) {
    return { canCreate: false, reason: 'Maximum number of floors reached' };
  }

  const nextDepth = floors.length + 1;
  const cost = floorGetCreationCost(nextDepth);

  if (!resourceCanAfford(cost)) {
    return { canCreate: false, reason: 'Insufficient resources' };
  }

  return { canCreate: true };
}

/**
 * Create a new floor at the next available depth.
 * Deducts resource costs and adds the floor to the game state.
 * Returns the new floor on success, or undefined if creation failed.
 */
export async function floorCreate(
  biome: BiomeType = 'neutral',
): Promise<Floor | undefined> {
  const { canCreate } = floorCanCreate();
  if (!canCreate) {
    return undefined;
  }

  const nextDepth = gamestate().world.floors.length + 1;
  const cost = floorGetCreationCost(nextDepth);

  const paid = await resourcePayCost(cost);
  if (!paid) {
    return undefined;
  }

  const newFloor = defaultFloor(nextDepth, biome);

  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      floors: [...state.world.floors, newFloor],
    },
  }));

  return newFloor;
}

/**
 * Migrate floor data from a saved game state.
 * Handles:
 * - Missing floors array: creates floor 1 from top-level grid/hallways/inhabitants
 * - Empty floors array: same as missing
 * - Incomplete floor objects: fills missing fields from defaults
 * - Invalid currentFloorIndex: clamps to valid range
 */
export function floorMigrate(world: Partial<GameStateWorld>): {
  floors: Floor[];
  currentFloorIndex: number;
} {
  const savedFloors = world.floors;

  let floors: Floor[];

  if (!savedFloors || savedFloors.length === 0) {
    // Old save format or empty: create floor 1 from top-level world data
    const floor: Floor = {
      ...defaultFloor(1),
      grid: world.grid ?? gridCreateEmpty(),
      hallways: world.hallways ?? [],
      inhabitants: world.inhabitants ?? [],
    };
    floors = [floor];
  } else {
    // Ensure each floor has all required fields
    floors = savedFloors.map((saved) => {
      const base = defaultFloor(saved.depth ?? 1);
      return {
        id: saved.id ?? base.id,
        name: saved.name ?? base.name,
        depth: saved.depth ?? base.depth,
        biome: saved.biome ?? base.biome,
        grid: saved.grid ?? base.grid,
        rooms: saved.rooms ?? base.rooms,
        hallways: saved.hallways ?? base.hallways,
        inhabitants: saved.inhabitants ?? base.inhabitants,
        connections: saved.connections ?? base.connections,
        traps: saved.traps ?? base.traps,
      };
    });
  }

  // Clamp currentFloorIndex to valid range
  const savedIndex = world.currentFloorIndex ?? 0;
  const currentFloorIndex = Math.max(0, Math.min(savedIndex, floors.length - 1));

  return { floors, currentFloorIndex };
}
