import {
  canCreateFloor,
  createFloor,
  getFloor,
  getFloorBiome,
  getFloorByDepth,
  getFloorCreationCost,
  migrateFloors,
} from '@helpers/floor';
import type { Floor } from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGamestate = vi.fn();
const mockUpdateGamestate = vi.fn();
const mockCanAfford = vi.fn();
const mockPayCost = vi.fn();

vi.mock('@helpers/state-game', () => ({
  gamestate: (...args: unknown[]) => mockGamestate(...args),
  updateGamestate: (...args: unknown[]) => mockUpdateGamestate(...args),
}));

vi.mock('@helpers/resources', () => ({
  canAfford: (...args: unknown[]) => mockCanAfford(...args),
  payCost: (...args: unknown[]) => mockPayCost(...args),
}));

vi.mock('@helpers/defaults', () => ({
  defaultFloor: (depth: number, biome: string) => ({
    id: `new-floor-${depth}`,
    name: `Floor ${depth}`,
    depth,
    biome: biome ?? 'neutral',
    grid: [['empty-grid']],
    rooms: [],
    hallways: [],
    inhabitants: [],
    connections: [],
  }),
}));

vi.mock('@helpers/grid', () => ({
  createEmptyGrid: () => [['empty-grid']],
}));

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: [],
    rooms: [],
    hallways: [],
    inhabitants: [],
    traps: [],
    ...overrides,
  } as Floor;
}

const threeFloorState = () => ({
  world: {
    floors: [
      makeFloor({ id: 'floor-1', name: 'Floor 1', depth: 1, biome: 'neutral' }),
      makeFloor({ id: 'floor-2', name: 'Floor 2', depth: 2, biome: 'volcanic' }),
      makeFloor({ id: 'floor-3', name: 'Floor 3', depth: 3, biome: 'crystal' }),
    ],
    currentFloorIndex: 0,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGamestate.mockReturnValue(threeFloorState());
  mockUpdateGamestate.mockResolvedValue(undefined);
  mockCanAfford.mockReturnValue(true);
  mockPayCost.mockResolvedValue(true);
});

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

describe('getFloorByDepth', () => {
  it('should return floor at depth 1', () => {
    const floor = getFloorByDepth(1);
    expect(floor).toBeDefined();
    expect(floor?.id).toBe('floor-1');
    expect(floor?.biome).toBe('neutral');
  });

  it('should return floor at depth 2', () => {
    const floor = getFloorByDepth(2);
    expect(floor).toBeDefined();
    expect(floor?.id).toBe('floor-2');
    expect(floor?.biome).toBe('volcanic');
  });

  it('should return floor at depth 3', () => {
    const floor = getFloorByDepth(3);
    expect(floor).toBeDefined();
    expect(floor?.id).toBe('floor-3');
    expect(floor?.biome).toBe('crystal');
  });

  it('should return undefined for non-existent depth', () => {
    expect(getFloorByDepth(99)).toBeUndefined();
  });

  it('should return undefined for depth 0', () => {
    expect(getFloorByDepth(0)).toBeUndefined();
  });
});

describe('getFloorCreationCost', () => {
  it('should return cost scaling with depth 1', () => {
    const cost = getFloorCreationCost(1);
    expect(cost).toEqual({ crystals: 50, gold: 30 });
  });

  it('should return cost scaling with depth 5', () => {
    const cost = getFloorCreationCost(5);
    expect(cost).toEqual({ crystals: 250, gold: 150 });
  });

  it('should return cost scaling with depth 10', () => {
    const cost = getFloorCreationCost(10);
    expect(cost).toEqual({ crystals: 500, gold: 300 });
  });
});

describe('canCreateFloor', () => {
  it('should return canCreate true when under max and can afford', () => {
    const result = canCreateFloor();
    expect(result.canCreate).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should return false when max floors reached', () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: Array.from({ length: 10 }, (_, i) =>
          makeFloor({ id: `floor-${i + 1}`, depth: i + 1 }),
        ),
        currentFloorIndex: 0,
      },
    });

    const result = canCreateFloor();
    expect(result.canCreate).toBe(false);
    expect(result.reason).toBe('Maximum number of floors reached');
  });

  it('should return false when insufficient resources', () => {
    mockCanAfford.mockReturnValue(false);

    const result = canCreateFloor();
    expect(result.canCreate).toBe(false);
    expect(result.reason).toBe('Insufficient resources');
  });

  it('should check cost for next depth based on current floor count', () => {
    canCreateFloor();
    // 3 floors exist, so next depth is 4: 50*4=200 crystals, 30*4=120 gold
    expect(mockCanAfford).toHaveBeenCalledWith({ crystals: 200, gold: 120 });
  });
});

describe('createFloor', () => {
  it('should create floor at next depth with default neutral biome', async () => {
    const floor = await createFloor();
    expect(floor).not.toBeNull();
    expect(floor?.depth).toBe(4);
    expect(floor?.biome).toBe('neutral');
    expect(floor?.rooms).toEqual([]);
    expect(floor?.hallways).toEqual([]);
    expect(floor?.inhabitants).toEqual([]);
  });

  it('should create floor with specified biome', async () => {
    const floor = await createFloor('volcanic');
    expect(floor).not.toBeNull();
    expect(floor?.biome).toBe('volcanic');
  });

  it('should return null when max floors reached', async () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: Array.from({ length: 10 }, (_, i) =>
          makeFloor({ id: `floor-${i + 1}`, depth: i + 1 }),
        ),
        currentFloorIndex: 0,
      },
    });

    const floor = await createFloor();
    expect(floor).toBeNull();
    expect(mockPayCost).not.toHaveBeenCalled();
  });

  it('should return null when payCost fails', async () => {
    mockPayCost.mockResolvedValue(false);

    const floor = await createFloor();
    expect(floor).toBeNull();
    expect(mockUpdateGamestate).not.toHaveBeenCalled();
  });

  it('should deduct resources before adding floor', async () => {
    await createFloor();
    // payCost should be called with cost for depth 4
    expect(mockPayCost).toHaveBeenCalledWith({ crystals: 200, gold: 120 });
    expect(mockUpdateGamestate).toHaveBeenCalled();
  });

  it('should call updateGamestate to add the new floor', async () => {
    await createFloor('crystal');
    expect(mockUpdateGamestate).toHaveBeenCalledTimes(1);

    // Execute the updater function to verify it appends the floor
    const updaterFn = mockUpdateGamestate.mock.calls[0][0];
    const state = threeFloorState();
    const newState = updaterFn(state);
    expect(newState.world.floors).toHaveLength(4);
    expect(newState.world.floors[3].depth).toBe(4);
    expect(newState.world.floors[3].biome).toBe('crystal');
  });
});

describe('migrateFloors', () => {
  it('should create floor from top-level world data when floors is missing', () => {
    const world = {
      grid: [['saved-grid']] as unknown as Floor['grid'],
      hallways: [{ id: 'h1' }] as unknown as Floor['hallways'],
      inhabitants: [{ instanceId: 'i1' }] as unknown as Floor['inhabitants'],
    };

    const result = migrateFloors(world);
    expect(result.floors).toHaveLength(1);
    expect(result.floors[0].depth).toBe(1);
    expect(result.floors[0].grid).toEqual([['saved-grid']]);
    expect(result.floors[0].hallways).toEqual([{ id: 'h1' }]);
    expect(result.floors[0].inhabitants).toEqual([{ instanceId: 'i1' }]);
    expect(result.currentFloorIndex).toBe(0);
  });

  it('should create floor with empty grid when no world data exists', () => {
    const result = migrateFloors({});
    expect(result.floors).toHaveLength(1);
    expect(result.floors[0].depth).toBe(1);
    expect(result.floors[0].grid).toEqual([['empty-grid']]);
    expect(result.floors[0].hallways).toEqual([]);
    expect(result.floors[0].inhabitants).toEqual([]);
  });

  it('should create floor from empty floors array', () => {
    const result = migrateFloors({ floors: [] });
    expect(result.floors).toHaveLength(1);
    expect(result.floors[0].depth).toBe(1);
  });

  it('should preserve existing floors when present', () => {
    const floors = [
      makeFloor({ id: 'f1', depth: 1, biome: 'volcanic' }),
      makeFloor({ id: 'f2', depth: 2, biome: 'crystal' }),
    ];

    const result = migrateFloors({ floors });
    expect(result.floors).toHaveLength(2);
    expect(result.floors[0].id).toBe('f1');
    expect(result.floors[0].biome).toBe('volcanic');
    expect(result.floors[1].id).toBe('f2');
    expect(result.floors[1].biome).toBe('crystal');
  });

  it('should fill missing fields on saved floors with defaults', () => {
    const partialFloor = { id: 'f1', depth: 2 } as unknown as Floor;
    const result = migrateFloors({ floors: [partialFloor] });
    expect(result.floors[0].id).toBe('f1');
    expect(result.floors[0].depth).toBe(2);
    expect(result.floors[0].name).toBe('Floor 2');
    expect(result.floors[0].biome).toBe('neutral');
    expect(result.floors[0].rooms).toEqual([]);
  });

  it('should clamp currentFloorIndex to valid range', () => {
    const floors = [makeFloor({ id: 'f1', depth: 1 })];
    const result = migrateFloors({ floors, currentFloorIndex: 5 });
    expect(result.currentFloorIndex).toBe(0);
  });

  it('should clamp negative currentFloorIndex to 0', () => {
    const floors = [makeFloor({ id: 'f1', depth: 1 })];
    const result = migrateFloors({ floors, currentFloorIndex: -1 });
    expect(result.currentFloorIndex).toBe(0);
  });

  it('should preserve valid currentFloorIndex', () => {
    const floors = [
      makeFloor({ id: 'f1', depth: 1 }),
      makeFloor({ id: 'f2', depth: 2 }),
      makeFloor({ id: 'f3', depth: 3 }),
    ];
    const result = migrateFloors({ floors, currentFloorIndex: 2 });
    expect(result.currentFloorIndex).toBe(2);
  });

  it('should not mutate input data', () => {
    const original = {
      floors: [makeFloor({ id: 'f1', depth: 1 })],
      currentFloorIndex: 0,
    };
    const floorsCopy = JSON.parse(JSON.stringify(original));

    migrateFloors(original);
    expect(original).toEqual(floorsCopy);
  });
});
