import { defaultResources } from '@helpers/defaults';
import type { GameState, ResourceMap } from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockResources: ResourceMap;

vi.mock('@helpers/state-game', () => {
  return {
    gamestate: () => ({
      world: { resources: mockResources },
    }),
    updateGamestate: vi.fn(async (fn: (state: GameState) => GameState) => {
      const fakeState = {
        world: { resources: mockResources },
      } as GameState;
      const result = fn(fakeState);
      mockResources = result.world.resources;
    }),
  };
});

// Must import after mock setup
const {
  addResource,
  subtractResource,
  canAfford,
  payCost,
  isResourceLow,
  isResourceFull,
} = await import('@helpers/resources');

describe('addResource', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should add a normal amount and return the amount added', async () => {
    const added = await addResource('gold', 100);
    expect(added).toBe(100);
    expect(mockResources.gold.current).toBe(100);
  });

  it('should cap at max when adding would exceed max', async () => {
    mockResources.gold.current = 950;
    const added = await addResource('gold', 100);
    expect(added).toBe(50);
    expect(mockResources.gold.current).toBe(1000);
  });

  it('should return 0 and not change state when adding zero', async () => {
    const added = await addResource('gold', 0);
    expect(added).toBe(0);
    expect(mockResources.gold.current).toBe(0);
  });

  it('should return 0 and not change state when adding a negative amount', async () => {
    mockResources.gold.current = 500;
    const added = await addResource('gold', -50);
    expect(added).toBe(0);
    expect(mockResources.gold.current).toBe(500);
  });

  it('should return 0 when resource is already at max', async () => {
    mockResources.crystals.current = 500;
    const added = await addResource('crystals', 10);
    expect(added).toBe(0);
    expect(mockResources.crystals.current).toBe(500);
  });

  it('should work for different resource types', async () => {
    const added = await addResource('corruption', 50);
    expect(added).toBe(50);
    expect(mockResources.corruption.current).toBe(50);
  });
});

describe('subtractResource', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should subtract a normal amount and return true', async () => {
    mockResources.gold.current = 500;
    const result = await subtractResource('gold', 100);
    expect(result).toBe(true);
    expect(mockResources.gold.current).toBe(400);
  });

  it('should fail and not change state when subtracting more than available', async () => {
    mockResources.gold.current = 50;
    const result = await subtractResource('gold', 100);
    expect(result).toBe(false);
    expect(mockResources.gold.current).toBe(50);
  });

  it('should return true when subtracting zero', async () => {
    mockResources.gold.current = 500;
    const result = await subtractResource('gold', 0);
    expect(result).toBe(true);
    expect(mockResources.gold.current).toBe(500);
  });

  it('should return false when subtracting a negative amount', async () => {
    mockResources.gold.current = 500;
    const result = await subtractResource('gold', -10);
    expect(result).toBe(false);
    expect(mockResources.gold.current).toBe(500);
  });

  it('should succeed when subtracting exact current amount', async () => {
    mockResources.crystals.current = 200;
    const result = await subtractResource('crystals', 200);
    expect(result).toBe(true);
    expect(mockResources.crystals.current).toBe(0);
  });
});

describe('canAfford', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should return true when resources are sufficient', () => {
    mockResources.gold.current = 500;
    mockResources.crystals.current = 100;
    expect(canAfford({ gold: 200, crystals: 50 })).toBe(true);
  });

  it('should return false when any resource is insufficient', () => {
    mockResources.gold.current = 500;
    mockResources.crystals.current = 10;
    expect(canAfford({ gold: 200, crystals: 50 })).toBe(false);
  });

  it('should return true for empty costs', () => {
    expect(canAfford({})).toBe(true);
  });
});

describe('payCost', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should subtract multiple resources atomically', async () => {
    mockResources.gold.current = 500;
    mockResources.food.current = 200;
    const result = await payCost({ gold: 100, food: 50 });
    expect(result).toBe(true);
    expect(mockResources.gold.current).toBe(400);
    expect(mockResources.food.current).toBe(150);
  });

  it('should fail and not change any resource if one is insufficient', async () => {
    mockResources.gold.current = 500;
    mockResources.food.current = 10;
    const result = await payCost({ gold: 100, food: 50 });
    expect(result).toBe(false);
    expect(mockResources.gold.current).toBe(500);
    expect(mockResources.food.current).toBe(10);
  });
});

describe('isResourceLow', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should return true when resource is below threshold percentage', () => {
    mockResources.gold.current = 50;
    // 50/1000 = 0.05, which is below 0.1 (10%)
    const low = isResourceLow('gold', 0.1);
    expect(low()).toBe(true);
  });

  it('should return false when resource is above threshold percentage', () => {
    mockResources.gold.current = 500;
    // 500/1000 = 0.5, which is above 0.1 (10%)
    const low = isResourceLow('gold', 0.1);
    expect(low()).toBe(false);
  });

  it('should return true when resource is at zero', () => {
    const low = isResourceLow('gold', 0.1);
    expect(low()).toBe(true);
  });

  it('should react to resource changes', async () => {
    mockResources.gold.current = 50;
    const low = isResourceLow('gold', 0.1);
    expect(low()).toBe(true);

    mockResources.gold.current = 500;
    expect(low()).toBe(false);
  });
});

describe('isResourceFull', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should return true when resource equals its max', () => {
    mockResources.gold.current = 1000;
    const full = isResourceFull('gold');
    expect(full()).toBe(true);
  });

  it('should return false when resource is below max', () => {
    mockResources.gold.current = 999;
    const full = isResourceFull('gold');
    expect(full()).toBe(false);
  });

  it('should return false when resource is at zero', () => {
    const full = isResourceFull('gold');
    expect(full()).toBe(false);
  });

  it('should react to resource changes', async () => {
    const full = isResourceFull('crystals');
    expect(full()).toBe(false);

    mockResources.crystals.current = 500;
    expect(full()).toBe(true);
  });
});
