import { defaultResources } from '@helpers/defaults';
import type {
  Floor,
  GameState,
  PlacedRoom,
  ResourceMap,
  RoomId,
  RoomUpgradeEffect,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockResources: ResourceMap;
let mockStorageMultiplier = 1;

const STORAGE_ROOM_TYPE_ID = 'test-storage-room-type' as RoomId;
const OTHER_ROOM_TYPE_ID = 'test-other-room-type' as RoomId;

let mockAppliedEffects: Map<string, RoomUpgradeEffect[]> = new Map();

vi.mock('@helpers/features', () => ({
  featureCalculateStorageBonusMultiplier: vi.fn(() => mockStorageMultiplier),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) =>
    role === 'storage' ? STORAGE_ROOM_TYPE_ID : undefined,
  ),
}));

vi.mock('@helpers/room-upgrades', () => ({
  roomUpgradeGetAppliedEffects: vi.fn((room: PlacedRoom) =>
    mockAppliedEffects.get(room.id) ?? [],
  ),
}));

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
  resourceAdd,
  resourceSubtract,
  resourceCanAfford,
  resourcePayCost,
  resourceIsLow,
  resourceIsFull,
  resourceMigrate,
  resourceEffectiveMax,
  resourceStorageProcess,
  storageRoomFlatBonus,
  STORAGE_ROOM_BASE_BONUS,
  STORAGE_ROOM_SPECIALIZED_BONUS,
} = await import('@helpers/resources');

function makeRoom(
  id: string,
  roomTypeId: RoomId,
): PlacedRoom {
  return { id, roomTypeId } as PlacedRoom;
}

function makeFloor(rooms: PlacedRoom[]): Floor {
  return { rooms } as Floor;
}

describe('resourceAdd', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should add a normal amount and return the amount added', async () => {
    mockResources.gold.current = 0;
    const added = await resourceAdd('gold', 100);
    expect(added).toBe(100);
    expect(mockResources.gold.current).toBe(100);
  });

  it('should cap at max when adding would exceed max', async () => {
    mockResources.gold.current = 950;
    const added = await resourceAdd('gold', 100);
    expect(added).toBe(50);
    expect(mockResources.gold.current).toBe(1000);
  });

  it('should return 0 and not change state when adding zero', async () => {
    mockResources.gold.current = 0;
    const added = await resourceAdd('gold', 0);
    expect(added).toBe(0);
    expect(mockResources.gold.current).toBe(0);
  });

  it('should return 0 and not change state when adding a negative amount', async () => {
    mockResources.gold.current = 500;
    const added = await resourceAdd('gold', -50);
    expect(added).toBe(0);
    expect(mockResources.gold.current).toBe(500);
  });

  it('should return 0 when resource is already at max', async () => {
    mockResources.crystals.current = 500;
    const added = await resourceAdd('crystals', 10);
    expect(added).toBe(0);
    expect(mockResources.crystals.current).toBe(500);
  });

  it('should work for different resource types', async () => {
    const added = await resourceAdd('corruption', 50);
    expect(added).toBe(50);
    expect(mockResources.corruption.current).toBe(50);
  });
});

describe('resourceSubtract', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should subtract a normal amount and return the subtracted amount', async () => {
    mockResources.gold.current = 500;
    const result = await resourceSubtract('gold', 100);
    expect(result).toBe(100);
    expect(mockResources.gold.current).toBe(400);
  });

  it('should return 0 and not change state when subtracting more than available', async () => {
    mockResources.gold.current = 50;
    const result = await resourceSubtract('gold', 100);
    expect(result).toBe(0);
    expect(mockResources.gold.current).toBe(50);
  });

  it('should return 0 when subtracting zero', async () => {
    mockResources.gold.current = 500;
    const result = await resourceSubtract('gold', 0);
    expect(result).toBe(0);
    expect(mockResources.gold.current).toBe(500);
  });

  it('should return 0 when subtracting a negative amount', async () => {
    mockResources.gold.current = 500;
    const result = await resourceSubtract('gold', -10);
    expect(result).toBe(0);
    expect(mockResources.gold.current).toBe(500);
  });

  it('should succeed when subtracting exact current amount', async () => {
    mockResources.crystals.current = 200;
    const result = await resourceSubtract('crystals', 200);
    expect(result).toBe(200);
    expect(mockResources.crystals.current).toBe(0);
  });
});

describe('resourceCanAfford', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should return true when resources are sufficient', () => {
    mockResources.gold.current = 500;
    mockResources.crystals.current = 100;
    expect(resourceCanAfford({ gold: 200, crystals: 50 })).toBe(true);
  });

  it('should return false when any resource is insufficient', () => {
    mockResources.gold.current = 500;
    mockResources.crystals.current = 10;
    expect(resourceCanAfford({ gold: 200, crystals: 50 })).toBe(false);
  });

  it('should return true for empty costs', () => {
    expect(resourceCanAfford({})).toBe(true);
  });
});

describe('resourcePayCost', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should subtract multiple resources atomically', async () => {
    mockResources.gold.current = 500;
    mockResources.food.current = 200;
    const result = await resourcePayCost({ gold: 100, food: 50 });
    expect(result).toBe(true);
    expect(mockResources.gold.current).toBe(400);
    expect(mockResources.food.current).toBe(150);
  });

  it('should fail and not change any resource if one is insufficient', async () => {
    mockResources.gold.current = 500;
    mockResources.food.current = 10;
    const result = await resourcePayCost({ gold: 100, food: 50 });
    expect(result).toBe(false);
    expect(mockResources.gold.current).toBe(500);
    expect(mockResources.food.current).toBe(10);
  });
});

describe('resourceIsLow', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should return true when resource is below threshold percentage', () => {
    mockResources.gold.current = 50;
    // 50/1000 = 0.05, which is below 0.1 (10%)
    const low = resourceIsLow('gold', 0.1);
    expect(low()).toBe(true);
  });

  it('should return false when resource is above threshold percentage', () => {
    mockResources.gold.current = 500;
    // 500/1000 = 0.5, which is above 0.1 (10%)
    const low = resourceIsLow('gold', 0.1);
    expect(low()).toBe(false);
  });

  it('should return true when resource is at zero', () => {
    mockResources.gold.current = 0;
    const low = resourceIsLow('gold', 0.1);
    expect(low()).toBe(true);
  });

  it('should react to resource changes', async () => {
    mockResources.gold.current = 50;
    const low = resourceIsLow('gold', 0.1);
    expect(low()).toBe(true);

    mockResources.gold.current = 500;
    expect(low()).toBe(false);
  });
});

describe('resourceIsFull', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should return true when resource equals its max', () => {
    mockResources.gold.current = 1000;
    const full = resourceIsFull('gold');
    expect(full()).toBe(true);
  });

  it('should return false when resource is below max', () => {
    mockResources.gold.current = 999;
    const full = resourceIsFull('gold');
    expect(full()).toBe(false);
  });

  it('should return false when resource is at zero', () => {
    const full = resourceIsFull('gold');
    expect(full()).toBe(false);
  });

  it('should react to resource changes', async () => {
    const full = resourceIsFull('crystals');
    expect(full()).toBe(false);

    mockResources.crystals.current = 500;
    expect(full()).toBe(true);
  });
});

describe('resourceMigrate', () => {
  it('should preserve saved resource values in a round-trip', () => {
    const original = defaultResources();
    original.gold.current = 750;
    original.crystals.current = 300;
    original.corruption.current = 42;

    const migrated = resourceMigrate(original);

    expect(migrated.gold.current).toBe(750);
    expect(migrated.gold.max).toBe(1000);
    expect(migrated.crystals.current).toBe(300);
    expect(migrated.crystals.max).toBe(500);
    expect(migrated.corruption.current).toBe(42);
    expect(migrated.corruption.max).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should initialize missing resource types to defaults', () => {
    const partial = {
      gold: { current: 500, max: 1000 },
      food: { current: 100, max: 500 },
    } as Partial<ResourceMap>;

    const migrated = resourceMigrate(partial);

    expect(migrated.gold.current).toBe(500);
    expect(migrated.food.current).toBe(100);
    expect(migrated.crystals.current).toBe(0);
    expect(migrated.crystals.max).toBe(500);
    expect(migrated.flux.current).toBe(0);
    expect(migrated.flux.max).toBe(200);
    expect(migrated.research.current).toBe(0);
    expect(migrated.essence.current).toBe(0);
    expect(migrated.corruption.current).toBe(0);
  });

  it('should return full defaults when given empty object', () => {
    const migrated = resourceMigrate({});
    const defaults = defaultResources();

    for (const key of Object.keys(defaults) as Array<keyof ResourceMap>) {
      expect(migrated[key].current).toBe(defaults[key].current);
      expect(migrated[key].max).toBe(defaults[key].max);
    }
  });

  it('should not mutate the saved input', () => {
    const saved = { gold: { current: 500, max: 1000 } } as Partial<ResourceMap>;
    resourceMigrate(saved);
    expect(saved.gold!.current).toBe(500);
    expect(saved.crystals).toBeUndefined();
  });
});

describe('storageRoomFlatBonus', () => {
  beforeEach(() => {
    mockAppliedEffects = new Map();
  });

  it('returns 0 when no storage rooms exist', () => {
    expect(storageRoomFlatBonus([], 'gold')).toBe(0);
  });

  it('returns base bonus for one unspecialized storage room', () => {
    const room = makeRoom('s1', STORAGE_ROOM_TYPE_ID);
    const floors = [makeFloor([room])];
    expect(storageRoomFlatBonus(floors, 'gold')).toBe(STORAGE_ROOM_BASE_BONUS);
  });

  it('stacks base bonus for two unspecialized storage rooms', () => {
    const r1 = makeRoom('s1', STORAGE_ROOM_TYPE_ID);
    const r2 = makeRoom('s2', STORAGE_ROOM_TYPE_ID);
    const floors = [makeFloor([r1, r2])];
    expect(storageRoomFlatBonus(floors, 'gold')).toBe(
      STORAGE_ROOM_BASE_BONUS * 2,
    );
  });

  it('returns specialized bonus when resource matches', () => {
    const room = makeRoom('s1', STORAGE_ROOM_TYPE_ID);
    mockAppliedEffects.set('s1', [
      { type: 'storageSpecialization', value: STORAGE_ROOM_SPECIALIZED_BONUS, resource: 'crystals' },
    ]);
    const floors = [makeFloor([room])];
    expect(storageRoomFlatBonus(floors, 'crystals')).toBe(
      STORAGE_ROOM_SPECIALIZED_BONUS,
    );
  });

  it('returns 0 for non-matching resource on specialized room', () => {
    const room = makeRoom('s1', STORAGE_ROOM_TYPE_ID);
    mockAppliedEffects.set('s1', [
      { type: 'storageSpecialization', value: STORAGE_ROOM_SPECIALIZED_BONUS, resource: 'crystals' },
    ]);
    const floors = [makeFloor([room])];
    expect(storageRoomFlatBonus(floors, 'gold')).toBe(0);
  });

  it('ignores non-storage rooms', () => {
    const room = makeRoom('r1', OTHER_ROOM_TYPE_ID);
    const floors = [makeFloor([room])];
    expect(storageRoomFlatBonus(floors, 'gold')).toBe(0);
  });

  it('returns 0 for corruption regardless of storage rooms', () => {
    const room = makeRoom('s1', STORAGE_ROOM_TYPE_ID);
    const floors = [makeFloor([room])];
    expect(storageRoomFlatBonus(floors, 'corruption')).toBe(0);
  });

  it('handles mix of specialized and unspecialized rooms', () => {
    const r1 = makeRoom('s1', STORAGE_ROOM_TYPE_ID);
    const r2 = makeRoom('s2', STORAGE_ROOM_TYPE_ID);
    mockAppliedEffects.set('s2', [
      { type: 'storageSpecialization', value: STORAGE_ROOM_SPECIALIZED_BONUS, resource: 'gold' },
    ]);
    const floors = [makeFloor([r1, r2])];
    // r1 gives base bonus, r2 gives specialized bonus for gold
    expect(storageRoomFlatBonus(floors, 'gold')).toBe(
      STORAGE_ROOM_BASE_BONUS + STORAGE_ROOM_SPECIALIZED_BONUS,
    );
    // r1 gives base bonus, r2 specialized for gold so 0 for crystals
    expect(storageRoomFlatBonus(floors, 'crystals')).toBe(
      STORAGE_ROOM_BASE_BONUS,
    );
  });
});

describe('resourceEffectiveMax', () => {
  beforeEach(() => {
    mockStorageMultiplier = 1;
    mockAppliedEffects = new Map();
  });

  it('returns base max when no storage bonus (multiplier 1)', () => {
    mockStorageMultiplier = 1;
    expect(resourceEffectiveMax(1000, 'gold', [])).toBe(1000);
  });

  it('doubles max when storage bonus multiplier is 2', () => {
    mockStorageMultiplier = 2;
    expect(resourceEffectiveMax(500, 'crystals', [])).toBe(1000);
  });

  it('triples max when storage bonus multiplier is 3', () => {
    mockStorageMultiplier = 3;
    expect(resourceEffectiveMax(200, 'flux', [])).toBe(600);
  });

  it('always returns base max for corruption regardless of bonus', () => {
    mockStorageMultiplier = 5;
    expect(resourceEffectiveMax(Number.MAX_SAFE_INTEGER, 'corruption', [])).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('floors the result to integer', () => {
    mockStorageMultiplier = 1.5;
    // 200 * 1.5 = 300
    expect(resourceEffectiveMax(200, 'essence', [])).toBe(300);
  });

  it('applies flat bonus before multiplier: (base + flat) * multiplier', () => {
    const room = makeRoom('s1', STORAGE_ROOM_TYPE_ID);
    const floors = [makeFloor([room])];
    mockStorageMultiplier = 2;
    // (1000 + 200) * 2 = 2400
    expect(resourceEffectiveMax(1000, 'gold', floors)).toBe(2400);
  });
});

describe('resourceStorageProcess', () => {
  beforeEach(() => {
    mockResources = defaultResources();
    mockStorageMultiplier = 1;
  });

  it('leaves maxes at defaults when no storage bonus', () => {
    const state = { world: { resources: mockResources, floors: [] } } as GameState;
    resourceStorageProcess(state);
    expect(state.world.resources.gold.max).toBe(1000);
    expect(state.world.resources.crystals.max).toBe(500);
    expect(state.world.resources.food.max).toBe(500);
    expect(state.world.resources.flux.max).toBe(200);
    expect(state.world.resources.research.max).toBe(300);
    expect(state.world.resources.essence.max).toBe(200);
  });

  it('doubles all maxes when storage multiplier is 2', () => {
    mockStorageMultiplier = 2;
    const state = { world: { resources: mockResources, floors: [] } } as GameState;
    resourceStorageProcess(state);
    expect(state.world.resources.gold.max).toBe(2000);
    expect(state.world.resources.crystals.max).toBe(1000);
    expect(state.world.resources.food.max).toBe(1000);
    expect(state.world.resources.flux.max).toBe(400);
    expect(state.world.resources.research.max).toBe(600);
    expect(state.world.resources.essence.max).toBe(400);
  });

  it('does not change corruption max regardless of multiplier', () => {
    mockStorageMultiplier = 3;
    const state = { world: { resources: mockResources, floors: [] } } as GameState;
    resourceStorageProcess(state);
    expect(state.world.resources.corruption.max).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('clamps current to new max when max decreases', () => {
    mockResources.gold.current = 900;
    mockResources.gold.max = 2000;
    mockStorageMultiplier = 1; // back to base: 1000
    const state = { world: { resources: mockResources, floors: [] } } as GameState;
    resourceStorageProcess(state);
    expect(state.world.resources.gold.max).toBe(1000);
    expect(state.world.resources.gold.current).toBe(900);
  });

  it('clamps current when it exceeds new reduced max', () => {
    mockResources.gold.current = 1500;
    mockResources.gold.max = 2000;
    mockStorageMultiplier = 1; // back to base: 1000
    const state = { world: { resources: mockResources, floors: [] } } as GameState;
    resourceStorageProcess(state);
    expect(state.world.resources.gold.max).toBe(1000);
    expect(state.world.resources.gold.current).toBe(1000);
  });

  it('preserves current when below new max', () => {
    mockResources.gold.current = 500;
    mockStorageMultiplier = 2;
    const state = { world: { resources: mockResources, floors: [] } } as GameState;
    resourceStorageProcess(state);
    expect(state.world.resources.gold.max).toBe(2000);
    expect(state.world.resources.gold.current).toBe(500);
  });
});
