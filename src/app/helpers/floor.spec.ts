import { getFloor, getFloorBiome } from '@helpers/floor';
import type { Floor } from '@interfaces';
import { describe, expect, it, vi } from 'vitest';

// Mock state-game to control game state
vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => ({
    world: {
      floors: [
        {
          id: 'floor-1',
          name: 'Floor 1',
          depth: 1,
          biome: 'neutral',
          grid: [],
          rooms: [],
          hallways: [],
          inhabitants: [],
        } as Floor,
        {
          id: 'floor-2',
          name: 'Floor 2',
          depth: 2,
          biome: 'volcanic',
          grid: [],
          rooms: [],
          hallways: [],
          inhabitants: [],
        } as Floor,
        {
          id: 'floor-3',
          name: 'Floor 3',
          depth: 3,
          biome: 'crystal',
          grid: [],
          rooms: [],
          hallways: [],
          inhabitants: [],
        } as Floor,
      ],
      currentFloorIndex: 0,
    },
  })),
}));

describe('getFloor', () => {
  it('should return floor by ID', () => {
    const floor = getFloor('floor-1');
    expect(floor).toBeDefined();
    expect(floor?.name).toBe('Floor 1');
    expect(floor?.biome).toBe('neutral');
  });

  it('should return floor-2 by ID', () => {
    const floor = getFloor('floor-2');
    expect(floor).toBeDefined();
    expect(floor?.biome).toBe('volcanic');
  });

  it('should return undefined for non-existent floor', () => {
    const floor = getFloor('nonexistent');
    expect(floor).toBeUndefined();
  });
});

describe('getFloorBiome', () => {
  it('should return biome for existing floor', () => {
    expect(getFloorBiome('floor-1')).toBe('neutral');
    expect(getFloorBiome('floor-2')).toBe('volcanic');
    expect(getFloorBiome('floor-3')).toBe('crystal');
  });

  it('should return neutral for non-existent floor', () => {
    expect(getFloorBiome('nonexistent')).toBe('neutral');
  });
});
