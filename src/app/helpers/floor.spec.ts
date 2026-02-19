import {
  floorCanChangeBiome,
  floorCanCreate,
  floorCanRemove,
  floorChangeBiome,
  floorCreate,
  floorGet,
  floorGetBiome,
  floorGetByDepth,
  floorGetCreationCost,
  floorGetRemovalRefund,
  floorMigrate,
  floorRemove,
} from '@helpers/floor';
import type { Floor, FloorId } from '@interfaces';
import type { RoomId } from '@interfaces/content-room';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGamestate = vi.fn();
const mockUpdateGamestate = vi.fn();
const mockCanAfford = vi.fn();
const mockPayCost = vi.fn();
const mockResourceAdd = vi.fn();
const mockBiomeIsUnlocked = vi.fn();
const mockBiomeRestrictionCanBuild = vi.fn();
const mockContentGetEntry = vi.fn();

vi.mock('@helpers/state-game', () => ({
  gamestate: (...args: unknown[]) => mockGamestate(...args),
  updateGamestate: (...args: unknown[]) => mockUpdateGamestate(...args),
}));

vi.mock('@helpers/resources', () => ({
  resourceCanAfford: (...args: unknown[]) => mockCanAfford(...args),
  resourcePayCost: (...args: unknown[]) => mockPayCost(...args),
  resourceAdd: (...args: unknown[]) => mockResourceAdd(...args),
}));

vi.mock('@helpers/biome', () => ({
  biomeIsUnlocked: (...args: unknown[]) => mockBiomeIsUnlocked(...args),
}));

vi.mock('@helpers/biome-restrictions', () => ({
  biomeRestrictionCanBuild: (...args: unknown[]) => mockBiomeRestrictionCanBuild(...args),
}));

vi.mock('@helpers/content', () => ({
  contentGetEntry: (...args: unknown[]) => mockContentGetEntry(...args),
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
  gridCreateEmpty: () => [['empty-grid']],
}));

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: 'floor-1' as FloorId,
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
      makeFloor({ id: 'floor-1' as FloorId, name: 'Floor 1', depth: 1, biome: 'neutral' }),
      makeFloor({ id: 'floor-2' as FloorId, name: 'Floor 2', depth: 2, biome: 'volcanic' }),
      makeFloor({ id: 'floor-3' as FloorId, name: 'Floor 3', depth: 3, biome: 'crystal' }),
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
  mockBiomeIsUnlocked.mockReturnValue(true);
  mockBiomeRestrictionCanBuild.mockReturnValue({ allowed: true });
  mockContentGetEntry.mockReturnValue(undefined);
});

describe('floorGet', () => {
  it('should return floor by ID', () => {
    const floor = floorGet('floor-1');
    expect(floor).toBeDefined();
    expect(floor?.name).toBe('Floor 1');
    expect(floor?.biome).toBe('neutral');
  });

  it('should return floor-2 by ID', () => {
    const floor = floorGet('floor-2');
    expect(floor).toBeDefined();
    expect(floor?.biome).toBe('volcanic');
  });

  it('should return undefined for non-existent floor', () => {
    const floor = floorGet('nonexistent');
    expect(floor).toBeUndefined();
  });
});

describe('floorGetBiome', () => {
  it('should return biome for existing floor', () => {
    expect(floorGetBiome('floor-1')).toBe('neutral');
    expect(floorGetBiome('floor-2')).toBe('volcanic');
    expect(floorGetBiome('floor-3')).toBe('crystal');
  });

  it('should return neutral for non-existent floor', () => {
    expect(floorGetBiome('nonexistent')).toBe('neutral');
  });
});

describe('floorGetByDepth', () => {
  it('should return floor at depth 1', () => {
    const floor = floorGetByDepth(1);
    expect(floor).toBeDefined();
    expect(floor?.id).toBe('floor-1');
    expect(floor?.biome).toBe('neutral');
  });

  it('should return floor at depth 2', () => {
    const floor = floorGetByDepth(2);
    expect(floor).toBeDefined();
    expect(floor?.id).toBe('floor-2');
    expect(floor?.biome).toBe('volcanic');
  });

  it('should return floor at depth 3', () => {
    const floor = floorGetByDepth(3);
    expect(floor).toBeDefined();
    expect(floor?.id).toBe('floor-3');
    expect(floor?.biome).toBe('crystal');
  });

  it('should return undefined for non-existent depth', () => {
    expect(floorGetByDepth(99)).toBeUndefined();
  });

  it('should return undefined for depth 0', () => {
    expect(floorGetByDepth(0)).toBeUndefined();
  });
});

describe('floorGetCreationCost', () => {
  it('should return cost scaling with depth 1', () => {
    const cost = floorGetCreationCost(1);
    expect(cost).toEqual({ crystals: 50, gold: 30 });
  });

  it('should return cost scaling with depth 5', () => {
    const cost = floorGetCreationCost(5);
    expect(cost).toEqual({ crystals: 250, gold: 150 });
  });

  it('should return cost scaling with depth 10', () => {
    const cost = floorGetCreationCost(10);
    expect(cost).toEqual({ crystals: 500, gold: 300 });
  });
});

describe('floorCanCreate', () => {
  it('should return canCreate true when under max and can afford', () => {
    const result = floorCanCreate();
    expect(result.canCreate).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should return false when max floors reached', () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: Array.from({ length: 10 }, (_, i) =>
          makeFloor({ id: `floor-${i + 1}` as FloorId, depth: i + 1 }),
        ),
        currentFloorIndex: 0,
      },
    });

    const result = floorCanCreate();
    expect(result.canCreate).toBe(false);
    expect(result.reason).toBe('Maximum number of floors reached');
  });

  it('should return false when insufficient resources', () => {
    mockCanAfford.mockReturnValue(false);

    const result = floorCanCreate();
    expect(result.canCreate).toBe(false);
    expect(result.reason).toBe('Insufficient resources');
  });

  it('should check cost for next depth based on current floor count', () => {
    floorCanCreate();
    // 3 floors exist, so next depth is 4: 50*4=200 crystals, 30*4=120 gold
    expect(mockCanAfford).toHaveBeenCalledWith({ crystals: 200, gold: 120 });
  });
});

describe('floorCreate', () => {
  it('should create floor at next depth with default neutral biome', async () => {
    const floor = await floorCreate();
    expect(floor).toBeDefined();
    expect(floor?.depth).toBe(4);
    expect(floor?.biome).toBe('neutral');
    expect(floor?.rooms).toEqual([]);
    expect(floor?.hallways).toEqual([]);
    expect(floor?.inhabitants).toEqual([]);
  });

  it('should create floor with specified biome', async () => {
    const floor = await floorCreate('volcanic');
    expect(floor).toBeDefined();
    expect(floor?.biome).toBe('volcanic');
  });

  it('should return undefined when max floors reached', async () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: Array.from({ length: 10 }, (_, i) =>
          makeFloor({ id: `floor-${i + 1}` as FloorId, depth: i + 1 }),
        ),
        currentFloorIndex: 0,
      },
    });

    const floor = await floorCreate();
    expect(floor).toBeUndefined();
    expect(mockPayCost).not.toHaveBeenCalled();
  });

  it('should return undefined when resourcePayCost fails', async () => {
    mockPayCost.mockResolvedValue(false);

    const floor = await floorCreate();
    expect(floor).toBeUndefined();
    expect(mockUpdateGamestate).not.toHaveBeenCalled();
  });

  it('should deduct resources before adding floor', async () => {
    await floorCreate();
    // resourcePayCost should be called with cost for depth 4
    expect(mockPayCost).toHaveBeenCalledWith({ crystals: 200, gold: 120 });
    expect(mockUpdateGamestate).toHaveBeenCalled();
  });

  it('should call updateGamestate to add the new floor', async () => {
    await floorCreate('crystal');
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

describe('floorMigrate', () => {
  it('should create floor from top-level world data when floors is missing', () => {
    const world = {
      grid: [['saved-grid']] as unknown as Floor['grid'],
      hallways: [{ id: 'h1' }] as unknown as Floor['hallways'],
      inhabitants: [{ instanceId: 'i1' }] as unknown as Floor['inhabitants'],
    };

    const result = floorMigrate(world);
    expect(result.floors).toHaveLength(1);
    expect(result.floors[0].depth).toBe(1);
    expect(result.floors[0].grid).toEqual([['saved-grid']]);
    expect(result.floors[0].hallways).toEqual([{ id: 'h1' }]);
    expect(result.floors[0].inhabitants).toEqual([{ instanceId: 'i1' }]);
    expect(result.currentFloorIndex).toBe(0);
  });

  it('should create floor with empty grid when no world data exists', () => {
    const result = floorMigrate({});
    expect(result.floors).toHaveLength(1);
    expect(result.floors[0].depth).toBe(1);
    expect(result.floors[0].grid).toEqual([['empty-grid']]);
    expect(result.floors[0].hallways).toEqual([]);
    expect(result.floors[0].inhabitants).toEqual([]);
  });

  it('should create floor from empty floors array', () => {
    const result = floorMigrate({ floors: [] });
    expect(result.floors).toHaveLength(1);
    expect(result.floors[0].depth).toBe(1);
  });

  it('should preserve existing floors when present', () => {
    const floors = [
      makeFloor({ id: 'f1' as FloorId, depth: 1, biome: 'volcanic' }),
      makeFloor({ id: 'f2' as FloorId, depth: 2, biome: 'crystal' }),
    ];

    const result = floorMigrate({ floors });
    expect(result.floors).toHaveLength(2);
    expect(result.floors[0].id).toBe('f1');
    expect(result.floors[0].biome).toBe('volcanic');
    expect(result.floors[1].id).toBe('f2');
    expect(result.floors[1].biome).toBe('crystal');
  });

  it('should fill missing fields on saved floors with defaults', () => {
    const partialFloor = { id: 'f1' as FloorId, depth: 2 } as unknown as Floor;
    const result = floorMigrate({ floors: [partialFloor] });
    expect(result.floors[0].id).toBe('f1');
    expect(result.floors[0].depth).toBe(2);
    expect(result.floors[0].name).toBe('Floor 2');
    expect(result.floors[0].biome).toBe('neutral');
    expect(result.floors[0].rooms).toEqual([]);
  });

  it('should clamp floorCurrentIndex to valid range', () => {
    const floors = [makeFloor({ id: 'f1' as FloorId, depth: 1 })];
    const result = floorMigrate({ floors, currentFloorIndex: 5 });
    expect(result.currentFloorIndex).toBe(0);
  });

  it('should clamp negative floorCurrentIndex to 0', () => {
    const floors = [makeFloor({ id: 'f1' as FloorId, depth: 1 })];
    const result = floorMigrate({ floors, currentFloorIndex: -1 });
    expect(result.currentFloorIndex).toBe(0);
  });

  it('should preserve valid floorCurrentIndex', () => {
    const floors = [
      makeFloor({ id: 'f1' as FloorId, depth: 1 }),
      makeFloor({ id: 'f2' as FloorId, depth: 2 }),
      makeFloor({ id: 'f3' as FloorId, depth: 3 }),
    ];
    const result = floorMigrate({ floors, currentFloorIndex: 2 });
    expect(result.currentFloorIndex).toBe(2);
  });

  it('should not mutate input data', () => {
    const original = {
      floors: [makeFloor({ id: 'f1' as FloorId, depth: 1 })],
      currentFloorIndex: 0,
    };
    const floorsCopy = JSON.parse(JSON.stringify(original));

    floorMigrate(original);
    expect(original).toEqual(floorsCopy);
  });
});

describe('floorCanChangeBiome', () => {
  it('should return canChange true for compatible change', () => {
    const result = floorCanChangeBiome('floor-1', 'volcanic');
    expect(result.canChange).toBe(true);
  });

  it('should return false when biome is same as current', () => {
    const result = floorCanChangeBiome('floor-1', 'neutral');
    expect(result.canChange).toBe(false);
    expect(result.reason).toBe('Floor already has this biome');
  });

  it('should return false when floor not found', () => {
    const result = floorCanChangeBiome('nonexistent', 'volcanic');
    expect(result.canChange).toBe(false);
    expect(result.reason).toBe('Floor not found');
  });

  it('should return false when biome is not unlocked', () => {
    mockBiomeIsUnlocked.mockReturnValue(false);
    const result = floorCanChangeBiome('floor-1', 'corrupted');
    expect(result.canChange).toBe(false);
    expect(result.reason).toBe('This biome has not been unlocked yet');
  });

  it('should return false when rooms are incompatible', () => {
    const floorWithRooms = makeFloor({
      id: 'floor-1' as FloorId,
      biome: 'neutral',
      rooms: [
        { roomTypeId: 'room-lake' as RoomId } as Floor['rooms'][0],
      ],
    });
    mockGamestate.mockReturnValue({
      world: {
        floors: [floorWithRooms],
        currentFloorIndex: 0,
      },
    });
    mockBiomeRestrictionCanBuild.mockReturnValue({ allowed: false, reason: 'blocked' });
    mockContentGetEntry.mockReturnValue({ name: 'Underground Lake' });

    const result = floorCanChangeBiome('floor-1', 'volcanic');
    expect(result.canChange).toBe(false);
    expect(result.incompatibleRooms).toContain('Underground Lake');
  });
});

describe('floorChangeBiome', () => {
  it('should update floor biome in state', async () => {
    const result = await floorChangeBiome('floor-1', 'volcanic');
    expect(result).toBe(true);
    expect(mockUpdateGamestate).toHaveBeenCalledTimes(1);

    const updaterFn = mockUpdateGamestate.mock.calls[0][0];
    const state = threeFloorState();
    const newState = updaterFn(state);
    expect(newState.world.floors[0].biome).toBe('volcanic');
    expect(newState.world.floors[1].biome).toBe('volcanic');
    expect(newState.world.floors[2].biome).toBe('crystal');
  });

  it('should return false when validation fails', async () => {
    const result = await floorChangeBiome('floor-1', 'neutral');
    expect(result).toBe(false);
    expect(mockUpdateGamestate).not.toHaveBeenCalled();
  });
});

describe('floorCanRemove', () => {
  it('should return canRemove true when >1 floor and last is empty', () => {
    const result = floorCanRemove();
    expect(result.canRemove).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should return false when only 1 floor exists', () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: [makeFloor({ id: 'floor-1' as FloorId, depth: 1 })],
        currentFloorIndex: 0,
      },
    });

    const result = floorCanRemove();
    expect(result.canRemove).toBe(false);
    expect(result.reason).toBe('Cannot remove the only floor');
  });

  it('should return false when last floor has rooms', () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: [
          makeFloor({ id: 'floor-1' as FloorId, depth: 1 }),
          makeFloor({
            id: 'floor-2' as FloorId,
            depth: 2,
            rooms: [{ roomTypeId: 'room-1' } as Floor['rooms'][0]],
          }),
        ],
        currentFloorIndex: 0,
      },
    });

    const result = floorCanRemove();
    expect(result.canRemove).toBe(false);
    expect(result.reason).toBe('Floor must be empty before removal');
  });
});

describe('floorGetRemovalRefund', () => {
  it('should return 50% of creation cost for last floor', () => {
    // Last floor is depth 3: cost is 150 crystals, 90 gold → refund 75, 45
    const refund = floorGetRemovalRefund();
    expect(refund).toEqual({ crystals: 75, gold: 45 });
  });

  it('should floor odd values down', () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: [
          makeFloor({ id: 'floor-1' as FloorId, depth: 1 }),
        ],
        currentFloorIndex: 0,
      },
    });

    // Depth 1: cost is 50 crystals, 30 gold → refund 25, 15
    const refund = floorGetRemovalRefund();
    expect(refund).toEqual({ crystals: 25, gold: 15 });
  });

  it('should return correct refund for depth 5', () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: Array.from({ length: 5 }, (_, i) =>
          makeFloor({ id: `floor-${i + 1}` as FloorId, depth: i + 1 }),
        ),
        currentFloorIndex: 0,
      },
    });

    // Depth 5: cost is 250 crystals, 150 gold → refund 125, 75
    const refund = floorGetRemovalRefund();
    expect(refund).toEqual({ crystals: 125, gold: 75 });
  });
});

describe('floorRemove', () => {
  it('should remove last floor and refund resources', async () => {
    const result = await floorRemove();
    expect(result).toBe(true);

    // Refund for depth 3: 75 crystals, 45 gold
    expect(mockResourceAdd).toHaveBeenCalledWith('crystals', 75);
    expect(mockResourceAdd).toHaveBeenCalledWith('gold', 45);
    expect(mockUpdateGamestate).toHaveBeenCalledTimes(1);
  });

  it('should remove the last floor from state', async () => {
    await floorRemove();

    const updaterFn = mockUpdateGamestate.mock.calls[0][0];
    const state = threeFloorState();
    const newState = updaterFn(state);
    expect(newState.world.floors).toHaveLength(2);
    expect(newState.world.floors[0].id).toBe('floor-1');
    expect(newState.world.floors[1].id).toBe('floor-2');
  });

  it('should clamp currentFloorIndex when pointing at removed floor', async () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: [
          makeFloor({ id: 'floor-1' as FloorId, depth: 1 }),
          makeFloor({ id: 'floor-2' as FloorId, depth: 2 }),
        ],
        currentFloorIndex: 1,
      },
    });

    await floorRemove();

    const updaterFn = mockUpdateGamestate.mock.calls[0][0];
    const state = {
      world: {
        floors: [
          makeFloor({ id: 'floor-1' as FloorId, depth: 1 }),
          makeFloor({ id: 'floor-2' as FloorId, depth: 2 }),
        ],
        currentFloorIndex: 1,
      },
    };
    const newState = updaterFn(state);
    expect(newState.world.currentFloorIndex).toBe(0);
  });

  it('should not change currentFloorIndex when not pointing at last floor', async () => {
    await floorRemove();

    const updaterFn = mockUpdateGamestate.mock.calls[0][0];
    const state = threeFloorState(); // currentFloorIndex is 0
    const newState = updaterFn(state);
    expect(newState.world.currentFloorIndex).toBe(0);
  });

  it('should return false when only 1 floor exists', async () => {
    mockGamestate.mockReturnValue({
      world: {
        floors: [makeFloor({ id: 'floor-1' as FloorId, depth: 1 })],
        currentFloorIndex: 0,
      },
    });

    const result = await floorRemove();
    expect(result).toBe(false);
    expect(mockResourceAdd).not.toHaveBeenCalled();
    expect(mockUpdateGamestate).not.toHaveBeenCalled();
  });
});
