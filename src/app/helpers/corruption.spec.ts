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

const {
  corruptionAdd,
  corruptionSpend,
  corruptionCanAfford,
  corruptionGetLevel,
  corruptionGetLevelDescription,
  CORRUPTION_THRESHOLD_MEDIUM,
  CORRUPTION_THRESHOLD_HIGH,
  CORRUPTION_THRESHOLD_CRITICAL,
} = await import('@helpers/corruption');

describe('corruptionAdd', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should add corruption and return the amount added', async () => {
    const added = await corruptionAdd(50);
    expect(added).toBe(50);
    expect(mockResources.corruption.current).toBe(50);
  });

  it('should return 0 when adding zero', async () => {
    const added = await corruptionAdd(0);
    expect(added).toBe(0);
    expect(mockResources.corruption.current).toBe(0);
  });

  it('should return 0 when adding a negative amount', async () => {
    const added = await corruptionAdd(-10);
    expect(added).toBe(0);
    expect(mockResources.corruption.current).toBe(0);
  });

  it('should allow adding large amounts (no hard cap)', async () => {
    const added = await corruptionAdd(500);
    expect(added).toBe(500);
    expect(mockResources.corruption.current).toBe(500);
  });
});

describe('corruptionSpend', () => {
  beforeEach(() => {
    mockResources = defaultResources();
    mockResources.corruption.current = 100;
  });

  it('should spend corruption and return true', async () => {
    const result = await corruptionSpend(30);
    expect(result).toBe(true);
    expect(mockResources.corruption.current).toBe(70);
  });

  it('should not go below 0', async () => {
    const result = await corruptionSpend(150);
    expect(result).toBe(false);
    expect(mockResources.corruption.current).toBe(100);
  });

  it('should return false for zero amount', async () => {
    const result = await corruptionSpend(0);
    expect(result).toBe(false);
    expect(mockResources.corruption.current).toBe(100);
  });

  it('should return false for negative amount', async () => {
    const result = await corruptionSpend(-10);
    expect(result).toBe(false);
    expect(mockResources.corruption.current).toBe(100);
  });

  it('should succeed when spending exact available amount', async () => {
    const result = await corruptionSpend(100);
    expect(result).toBe(true);
    expect(mockResources.corruption.current).toBe(0);
  });
});

describe('corruptionCanAfford', () => {
  beforeEach(() => {
    mockResources = defaultResources();
    mockResources.corruption.current = 75;
  });

  it('should return true when corruption is sufficient', () => {
    expect(corruptionCanAfford(50)).toBe(true);
  });

  it('should return false when corruption is insufficient', () => {
    expect(corruptionCanAfford(100)).toBe(false);
  });

  it('should return true when checking exact amount', () => {
    expect(corruptionCanAfford(75)).toBe(true);
  });
});

describe('corruptionGetLevel', () => {
  it('should return low for 0-49', () => {
    expect(corruptionGetLevel(0)).toBe('low');
    expect(corruptionGetLevel(25)).toBe('low');
    expect(corruptionGetLevel(49)).toBe('low');
  });

  it('should return medium for 50-99', () => {
    expect(corruptionGetLevel(CORRUPTION_THRESHOLD_MEDIUM)).toBe('medium');
    expect(corruptionGetLevel(75)).toBe('medium');
    expect(corruptionGetLevel(99)).toBe('medium');
  });

  it('should return high for 100-199', () => {
    expect(corruptionGetLevel(CORRUPTION_THRESHOLD_HIGH)).toBe('high');
    expect(corruptionGetLevel(150)).toBe('high');
    expect(corruptionGetLevel(199)).toBe('high');
  });

  it('should return critical for 200+', () => {
    expect(corruptionGetLevel(CORRUPTION_THRESHOLD_CRITICAL)).toBe('critical');
    expect(corruptionGetLevel(300)).toBe('critical');
    expect(corruptionGetLevel(1000)).toBe('critical');
  });
});

describe('corruptionGetLevelDescription', () => {
  it('should return a description for each level', () => {
    expect(corruptionGetLevelDescription('low')).toBeTruthy();
    expect(corruptionGetLevelDescription('medium')).toBeTruthy();
    expect(corruptionGetLevelDescription('high')).toBeTruthy();
    expect(corruptionGetLevelDescription('critical')).toBeTruthy();
  });

  it('should return different descriptions for different levels', () => {
    const low = corruptionGetLevelDescription('low');
    const medium = corruptionGetLevelDescription('medium');
    const high = corruptionGetLevelDescription('high');
    const critical = corruptionGetLevelDescription('critical');
    expect(new Set([low, medium, high, critical]).size).toBe(4);
  });
});
