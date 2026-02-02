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
const { addResource } = await import('@helpers/resources');

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
