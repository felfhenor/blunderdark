import type {
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomUpgradePath,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id) ?? undefined,
}));

const {
  getUpgradePaths,
  getAppliedUpgrade,
  getAppliedUpgradeEffects,
  canApplyUpgrade,
  applyUpgrade,
  getAvailableUpgrades,
  getEffectiveMaxInhabitants,
} = await import('@helpers/room-upgrades');

// --- Test data ---

const CRYSTAL_MINE_ID = 'aa100001-0001-0001-0001-000000000002';

const efficiencyPath: RoomUpgradePath = {
  id: 'upgrade-efficiency',
  name: 'Deep Vein Extraction',
  description: 'Increases crystal yield by 50%.',
  cost: { crystals: 75 },
  effects: [{ type: 'productionMultiplier', value: 1.5, resource: 'crystals' }],
};

const capacityPath: RoomUpgradePath = {
  id: 'upgrade-capacity',
  name: 'Expanded Tunnels',
  description: 'Increases max inhabitants from 2 to 4.',
  cost: { crystals: 60 },
  effects: [{ type: 'maxInhabitantBonus', value: 2 }],
};

const specializationPath: RoomUpgradePath = {
  id: 'upgrade-specialization',
  name: 'Crystal Resonance',
  description: 'Reduces fear and produces flux.',
  cost: { crystals: 80 },
  effects: [
    { type: 'fearReduction', value: 1 },
    { type: 'secondaryProduction', value: 0.2, resource: 'flux' },
  ],
};

const crystalMineRoom: RoomDefinition & IsContentItem = {
  id: CRYSTAL_MINE_ID,
  name: 'Crystal Mine',
  __type: 'room',
  description: 'An L-shaped excavation.',
  shapeId: 'shape-l',
  cost: { gold: 50 },
  production: { crystals: 1.0 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  maxInhabitants: 2,
  inhabitantRestriction: null,
  fearLevel: 1,
  upgradePaths: [efficiencyPath, capacityPath, specializationPath],
};

function createPlacedRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'room-001',
    roomTypeId: CRYSTAL_MINE_ID,
    shapeId: 'shape-l',
    anchorX: 5,
    anchorY: 5,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(CRYSTAL_MINE_ID, crystalMineRoom);
});

describe('getUpgradePaths', () => {
  it('should return upgrade paths for a valid room type', () => {
    const paths = getUpgradePaths(CRYSTAL_MINE_ID);
    expect(paths).toHaveLength(3);
    expect(paths[0].name).toBe('Deep Vein Extraction');
    expect(paths[1].name).toBe('Expanded Tunnels');
    expect(paths[2].name).toBe('Crystal Resonance');
  });

  it('should return empty array for unknown room type', () => {
    const paths = getUpgradePaths('nonexistent');
    expect(paths).toEqual([]);
  });

  it('should return empty array for room with no upgrades', () => {
    const noUpgradeRoom: RoomDefinition & IsContentItem = {
      ...crystalMineRoom,
      id: 'no-upgrades',
      upgradePaths: [],
    };
    mockContent.set('no-upgrades', noUpgradeRoom);

    const paths = getUpgradePaths('no-upgrades');
    expect(paths).toEqual([]);
  });
});

describe('canApplyUpgrade', () => {
  it('should allow applying a valid upgrade to a room with no upgrade', () => {
    const room = createPlacedRoom();
    const result = canApplyUpgrade(room, 'upgrade-efficiency');
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should reject if room already has an upgrade applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency',
    });
    const result = canApplyUpgrade(room, 'upgrade-capacity');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Room already has an upgrade applied');
  });

  it('should reject if upgrade path is not valid for the room type', () => {
    const room = createPlacedRoom();
    const result = canApplyUpgrade(room, 'nonexistent-path');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Invalid upgrade path for this room type');
  });

  it('should reject same upgrade that is already applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency',
    });
    const result = canApplyUpgrade(room, 'upgrade-efficiency');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Room already has an upgrade applied');
  });
});

describe('applyUpgrade', () => {
  it('should return a new PlacedRoom with the upgrade applied', () => {
    const room = createPlacedRoom();
    const upgraded = applyUpgrade(room, 'upgrade-efficiency');

    expect(upgraded.appliedUpgradePathId).toBe('upgrade-efficiency');
    expect(upgraded.id).toBe(room.id);
    expect(upgraded.roomTypeId).toBe(room.roomTypeId);
  });

  it('should not mutate the original room', () => {
    const room = createPlacedRoom();
    applyUpgrade(room, 'upgrade-efficiency');

    expect(room.appliedUpgradePathId).toBeUndefined();
  });
});

describe('getAppliedUpgrade', () => {
  it('should return null for a room with no upgrade', () => {
    const room = createPlacedRoom();
    expect(getAppliedUpgrade(room)).toBeNull();
  });

  it('should return the applied upgrade path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency',
    });
    const upgrade = getAppliedUpgrade(room);
    expect(upgrade).not.toBeNull();
    expect(upgrade!.name).toBe('Deep Vein Extraction');
  });

  it('should return null if applied upgrade ID does not match any path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'nonexistent',
    });
    expect(getAppliedUpgrade(room)).toBeNull();
  });
});

describe('getAppliedUpgradeEffects', () => {
  it('should return empty array for room with no upgrade', () => {
    const room = createPlacedRoom();
    expect(getAppliedUpgradeEffects(room)).toEqual([]);
  });

  it('should return effects for efficiency upgrade', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency',
    });
    const effects = getAppliedUpgradeEffects(room);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('productionMultiplier');
    expect(effects[0].value).toBe(1.5);
    expect(effects[0].resource).toBe('crystals');
  });

  it('should return multiple effects for specialization upgrade', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-specialization',
    });
    const effects = getAppliedUpgradeEffects(room);
    expect(effects).toHaveLength(2);
    expect(effects[0].type).toBe('fearReduction');
    expect(effects[1].type).toBe('secondaryProduction');
  });
});

describe('getAvailableUpgrades', () => {
  it('should return all paths for a room with no upgrade', () => {
    const room = createPlacedRoom();
    const available = getAvailableUpgrades(room);
    expect(available).toHaveLength(3);
  });

  it('should return empty array for a room with an upgrade applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency',
    });
    const available = getAvailableUpgrades(room);
    expect(available).toEqual([]);
  });

  it('should return empty array for unknown room type', () => {
    const room = createPlacedRoom({ roomTypeId: 'nonexistent' });
    const available = getAvailableUpgrades(room);
    expect(available).toEqual([]);
  });
});

describe('mutual exclusivity', () => {
  it('should prevent applying efficiency path after capacity path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-capacity',
    });
    const result = canApplyUpgrade(room, 'upgrade-efficiency');
    expect(result.valid).toBe(false);
  });

  it('should prevent applying capacity path after specialization path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-specialization',
    });
    const result = canApplyUpgrade(room, 'upgrade-capacity');
    expect(result.valid).toBe(false);
  });

  it('should prevent applying specialization path after efficiency path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency',
    });
    const result = canApplyUpgrade(room, 'upgrade-specialization');
    expect(result.valid).toBe(false);
  });

  it('should show no available upgrades after any path is chosen', () => {
    const room = applyUpgrade(createPlacedRoom(), 'upgrade-capacity');
    expect(getAvailableUpgrades(room)).toEqual([]);
  });
});

describe('getEffectiveMaxInhabitants', () => {
  it('should return base maxInhabitants when no upgrade applied', () => {
    const room = createPlacedRoom();
    const result = getEffectiveMaxInhabitants(room, crystalMineRoom);
    expect(result).toBe(2);
  });

  it('should return base + bonus when capacity upgrade is applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-capacity',
    });
    const result = getEffectiveMaxInhabitants(room, crystalMineRoom);
    expect(result).toBe(4);
  });

  it('should return base when non-capacity upgrade is applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency',
    });
    const result = getEffectiveMaxInhabitants(room, crystalMineRoom);
    expect(result).toBe(2);
  });

  it('should return -1 for unlimited capacity rooms regardless of upgrades', () => {
    const unlimitedRoom: RoomDefinition & IsContentItem = {
      ...crystalMineRoom,
      id: 'unlimited-room',
      maxInhabitants: -1,
    };
    mockContent.set('unlimited-room', unlimitedRoom);

    const room = createPlacedRoom({ roomTypeId: 'unlimited-room' });
    const result = getEffectiveMaxInhabitants(room, unlimitedRoom);
    expect(result).toBe(-1);
  });

  it('should return base when upgrade path ID does not match any path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'nonexistent',
    });
    const result = getEffectiveMaxInhabitants(room, crystalMineRoom);
    expect(result).toBe(2);
  });
});
