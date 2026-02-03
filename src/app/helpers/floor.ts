import { computed } from '@angular/core';
import { gamestate } from '@helpers/state-game';
import type { BiomeType, Floor } from '@interfaces';

/**
 * Get the current floor based on currentFloorIndex.
 */
export const currentFloor = computed<Floor | undefined>(() => {
  const state = gamestate();
  const index = state.world.currentFloorIndex;
  return state.world.floors[index];
});

/**
 * Get the biome of the current floor.
 */
export const currentFloorBiome = computed<BiomeType>(() => {
  const floor = currentFloor();
  return floor?.biome ?? 'neutral';
});

/**
 * Get all floors.
 */
export const allFloors = computed<Floor[]>(() => {
  return gamestate().world.floors;
});

/**
 * Get a floor by its ID.
 */
export function getFloor(floorId: string): Floor | undefined {
  return gamestate().world.floors.find((f) => f.id === floorId);
}

/**
 * Get the biome of a specific floor by ID.
 * Returns 'neutral' if floor not found.
 */
export function getFloorBiome(floorId: string): BiomeType {
  const floor = getFloor(floorId);
  return floor?.biome ?? 'neutral';
}
