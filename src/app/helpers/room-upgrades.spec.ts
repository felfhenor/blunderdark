import type {
  PlacedRoom,
  PlacedRoomId,
  RoomContent,
  RoomId,
  RoomShapeId,
  RoomUpgradeContent,
  RoomUpgradeId,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockContent = new Map<string, unknown>();
const mockResearchUnlocked = new Set<string>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
}));

vi.mock('@helpers/research-unlocks', () => ({
  researchUnlockIsUnlocked: (_type: string, id: string) =>
    mockResearchUnlocked.has(id),
  researchUnlockGetPassiveBonusWithMastery: () => 0,
}));

const {
  roomUpgradeGetPaths,
  roomUpgradeGetApplied,
  roomUpgradeGetAppliedEffects,
  roomUpgradeCanApply,
  roomUpgradeApply,
  roomUpgradeGetAvailable,
  roomUpgradeGetVisible,
  roomUpgradeGetEffectiveMaxInhabitants,
  roomUpgradeGetSecondaryProduction,
  roomUpgradeGetProductionMultiplier,
} = await import('@helpers/room-upgrades');

// --- Test data ---

const CRYSTAL_MINE_ID = 'aa100001-0001-0001-0001-000000000002';

const efficiencyPath: RoomUpgradeContent = {
  id: 'upgrade-efficiency' as RoomUpgradeId,
  name: 'Deep Vein Extraction',
  __type: 'roomupgrade',
  description: 'Increases crystal yield by 50%.',

  cost: { crystals: 75 },
  effects: [{ type: 'productionMultiplier', value: 1.5, resource: 'crystals' }],
};

const capacityPath: RoomUpgradeContent = {
  id: 'upgrade-capacity' as RoomUpgradeId,
  name: 'Expanded Tunnels',
  __type: 'roomupgrade',
  description: 'Increases max inhabitants from 2 to 4.',

  cost: { crystals: 60 },
  effects: [{ type: 'maxInhabitantBonus', value: 2 }],
};

const specializationPath: RoomUpgradeContent = {
  id: 'upgrade-specialization' as RoomUpgradeId,
  name: 'Crystal Resonance',
  __type: 'roomupgrade',
  description: 'Reduces fear and produces flux.',

  cost: { crystals: 80 },
  effects: [
    { type: 'fearReduction', value: 1 },
    { type: 'secondaryProduction', value: 0.2, resource: 'flux' },
  ],
};

const darkUpgradePath: RoomUpgradeContent = {
  id: 'upgrade-dark' as RoomUpgradeId,
  name: 'Corrupted Vein',
  __type: 'roomupgrade',
  description: 'Dark corruption doubles crystal output.',

  cost: { crystals: 100, essence: 30 },
  effects: [{ type: 'productionMultiplier', value: 2.0, resource: 'crystals' }],
  requiresDarkUpgrade: true,
};

const allUpgrades = [
  efficiencyPath,
  capacityPath,
  specializationPath,
  darkUpgradePath,
];

const crystalMineRoom: RoomContent = {
  id: CRYSTAL_MINE_ID as RoomId,
  name: 'Crystal Mine',
  __type: 'room',
  description: 'An L-shaped excavation.',
  shapeId: 'shape-l' as RoomShapeId,
  cost: { gold: 50 },
  production: { crystals: 1.0 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 2,
  maxFeatures: 1,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  autoPlace: false,
  roomUpgradeIds: [
    'upgrade-efficiency' as RoomUpgradeId,
    'upgrade-capacity' as RoomUpgradeId,
    'upgrade-specialization' as RoomUpgradeId,
    'upgrade-dark' as RoomUpgradeId,
  ],
};

function createPlacedRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'room-001' as PlacedRoomId,
    roomTypeId: CRYSTAL_MINE_ID as RoomId,
    shapeId: 'shape-l' as RoomShapeId,
    anchorX: 5,
    anchorY: 5,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.clear();
  mockResearchUnlocked.clear();
  mockContent.set(CRYSTAL_MINE_ID, crystalMineRoom);
  // Register each upgrade in mockContent for direct lookup
  for (const u of allUpgrades) {
    mockContent.set(u.id, u);
  }
  // By default, all upgrades are research-unlocked
  for (const u of allUpgrades) {
    mockResearchUnlocked.add(u.id);
  }
});

describe('roomUpgradeGetPaths', () => {
  it('should return upgrade paths for a valid room type', () => {
    const paths = roomUpgradeGetPaths(CRYSTAL_MINE_ID as RoomId);
    expect(paths).toHaveLength(4);
    expect(paths[0].name).toBe('Deep Vein Extraction');
    expect(paths[1].name).toBe('Expanded Tunnels');
    expect(paths[2].name).toBe('Crystal Resonance');
    expect(paths[3].name).toBe('Corrupted Vein');
  });

  it('should return empty array for unknown room type', () => {
    const paths = roomUpgradeGetPaths('nonexistent' as RoomId);
    expect(paths).toEqual([]);
  });

  it('should return empty array for room with no upgrades', () => {
    const noUpgradeRoom: RoomContent = {
      ...crystalMineRoom,
      roomUpgradeIds: [],
    };
    mockContent.set(CRYSTAL_MINE_ID, noUpgradeRoom);

    const paths = roomUpgradeGetPaths(CRYSTAL_MINE_ID as RoomId);
    expect(paths).toEqual([]);
  });
});

describe('roomUpgradeCanApply', () => {
  it('should allow applying a valid upgrade to a room with no upgrade', () => {
    const room = createPlacedRoom();
    const result = roomUpgradeCanApply(room, 'upgrade-efficiency');
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should reject if room already has an upgrade applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-capacity');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Room already has an upgrade applied');
  });

  it('should reject if upgrade path is not valid for the room type', () => {
    const room = createPlacedRoom();
    const result = roomUpgradeCanApply(room, 'nonexistent-path');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Invalid upgrade path for this room type');
  });

  it('should reject same upgrade that is already applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-efficiency');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Room already has an upgrade applied');
  });
});

describe('roomUpgradeApply', () => {
  it('should return a new PlacedRoom with the upgrade applied', () => {
    const room = createPlacedRoom();
    const upgraded = roomUpgradeApply(
      room,
      'upgrade-efficiency' as RoomUpgradeId,
    );

    expect(upgraded.appliedUpgradePathId).toBe('upgrade-efficiency');
    expect(upgraded.id).toBe(room.id);
    expect(upgraded.roomTypeId).toBe(room.roomTypeId);
  });

  it('should not mutate the original room', () => {
    const room = createPlacedRoom();
    roomUpgradeApply(room, 'upgrade-efficiency' as RoomUpgradeId);

    expect(room.appliedUpgradePathId).toBeUndefined();
  });
});

describe('roomUpgradeGetApplied', () => {
  it('should return null for a room with no upgrade', () => {
    const room = createPlacedRoom();
    expect(roomUpgradeGetApplied(room)).toBeUndefined();
  });

  it('should return the applied upgrade path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const upgrade = roomUpgradeGetApplied(room);
    expect(upgrade).toBeDefined();
    expect(upgrade!.name).toBe('Deep Vein Extraction');
  });

  it('should return null if applied upgrade ID does not match any path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'nonexistent' as RoomUpgradeId,
    });
    expect(roomUpgradeGetApplied(room)).toBeUndefined();
  });
});

describe('roomUpgradeGetAppliedEffects', () => {
  it('should return empty array for room with no upgrade', () => {
    const room = createPlacedRoom();
    expect(roomUpgradeGetAppliedEffects(room)).toEqual([]);
  });

  it('should return effects for efficiency upgrade', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const effects = roomUpgradeGetAppliedEffects(room);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('productionMultiplier');
    expect(effects[0].value).toBe(1.5);
    expect(effects[0].resource).toBe('crystals');
  });

  it('should return multiple effects for specialization upgrade', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-specialization' as RoomUpgradeId,
    });
    const effects = roomUpgradeGetAppliedEffects(room);
    expect(effects).toHaveLength(2);
    expect(effects[0].type).toBe('fearReduction');
    expect(effects[1].type).toBe('secondaryProduction');
  });
});

describe('roomUpgradeGetAvailable', () => {
  it('should return non-dark paths when dark upgrades not unlocked', () => {
    const room = createPlacedRoom();
    const available = roomUpgradeGetAvailable(room);
    expect(available).toHaveLength(3);
    expect(available.every((p) => !p.requiresDarkUpgrade)).toBe(true);
  });

  it('should return all paths when dark upgrades are unlocked', () => {
    const room = createPlacedRoom();
    const available = roomUpgradeGetAvailable(room, true);
    expect(available).toHaveLength(4);
  });

  it('should exclude dark upgrades by default', () => {
    const room = createPlacedRoom();
    const available = roomUpgradeGetAvailable(room);
    expect(available.find((p) => p.id === 'upgrade-dark')).toBeUndefined();
  });

  it('should include dark upgrades when unlocked', () => {
    const room = createPlacedRoom();
    const available = roomUpgradeGetAvailable(room, true);
    expect(available.find((p) => p.id === 'upgrade-dark')).toBeDefined();
  });

  it('should return empty array for a room with an upgrade applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const available = roomUpgradeGetAvailable(room);
    expect(available).toEqual([]);
  });

  it('should return empty array for unknown room type', () => {
    const room = createPlacedRoom({ roomTypeId: 'nonexistent' as RoomId });
    const available = roomUpgradeGetAvailable(room);
    expect(available).toEqual([]);
  });

  it('should exclude upgrades not yet researched', () => {
    mockResearchUnlocked.delete('upgrade-efficiency');
    const room = createPlacedRoom();
    const available = roomUpgradeGetAvailable(room);
    expect(
      available.find((p) => p.id === 'upgrade-efficiency'),
    ).toBeUndefined();
    expect(available).toHaveLength(2); // capacity + specialization (dark excluded by default)
  });
});

describe('roomUpgradeGetVisible', () => {
  it('should return all paths including dark ones with lock status', () => {
    const room = createPlacedRoom();
    const visible = roomUpgradeGetVisible(room);
    expect(visible).toHaveLength(4);
  });

  it('should mark dark upgrades as locked when not unlocked', () => {
    const room = createPlacedRoom();
    const visible = roomUpgradeGetVisible(room);
    const darkEntry = visible.find((v) => v.path.id === 'upgrade-dark');
    expect(darkEntry).toBeDefined();
    expect(darkEntry!.locked).toBe(true);
    expect(darkEntry!.lockReason).toBe('Requires 50 Corruption');
  });

  it('should mark dark upgrades as unlocked when dark upgrades enabled', () => {
    const room = createPlacedRoom();
    const visible = roomUpgradeGetVisible(room, true);
    const darkEntry = visible.find((v) => v.path.id === 'upgrade-dark');
    expect(darkEntry).toBeDefined();
    expect(darkEntry!.locked).toBe(false);
    expect(darkEntry!.lockReason).toBeUndefined();
  });

  it('should mark non-dark upgrades as unlocked when researched', () => {
    const room = createPlacedRoom();
    const visible = roomUpgradeGetVisible(room);
    const normalEntries = visible.filter((v) => !v.path.requiresDarkUpgrade);
    expect(normalEntries.every((v) => !v.locked)).toBe(true);
  });

  it('should mark upgrades as locked when not researched', () => {
    mockResearchUnlocked.clear();
    const room = createPlacedRoom();
    const visible = roomUpgradeGetVisible(room);
    expect(visible.every((v) => v.locked)).toBe(true);
    expect(visible.every((v) => v.lockReason === 'Requires research')).toBe(
      true,
    );
  });

  it('should return empty array for room with upgrade applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const visible = roomUpgradeGetVisible(room);
    expect(visible).toEqual([]);
  });
});

describe('dark upgrade gating in roomUpgradeCanApply', () => {
  it('should reject dark upgrade when not unlocked', () => {
    const room = createPlacedRoom();
    const result = roomUpgradeCanApply(room, 'upgrade-dark');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Requires dark upgrades (50 Corruption)');
  });

  it('should allow dark upgrade when unlocked', () => {
    const room = createPlacedRoom();
    const result = roomUpgradeCanApply(room, 'upgrade-dark', true);
    expect(result.valid).toBe(true);
  });

  it('should still allow normal upgrades without dark flag', () => {
    const room = createPlacedRoom();
    const result = roomUpgradeCanApply(room, 'upgrade-efficiency');
    expect(result.valid).toBe(true);
  });
});

describe('mutual exclusivity', () => {
  it('should prevent applying efficiency path after capacity path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-capacity' as RoomUpgradeId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-efficiency');
    expect(result.valid).toBe(false);
  });

  it('should prevent applying capacity path after specialization path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-specialization' as RoomUpgradeId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-capacity');
    expect(result.valid).toBe(false);
  });

  it('should prevent applying specialization path after efficiency path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-specialization');
    expect(result.valid).toBe(false);
  });

  it('should show no available upgrades after any path is chosen', () => {
    const room = roomUpgradeApply(
      createPlacedRoom(),
      'upgrade-capacity' as RoomUpgradeId,
    );
    expect(roomUpgradeGetAvailable(room)).toEqual([]);
  });
});

describe('roomUpgradeGetEffectiveMaxInhabitants', () => {
  it('should return base maxInhabitants when no upgrade applied', () => {
    const room = createPlacedRoom();
    const result = roomUpgradeGetEffectiveMaxInhabitants(room, crystalMineRoom);
    expect(result).toBe(2);
  });

  it('should return base + bonus when capacity upgrade is applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-capacity' as RoomUpgradeId,
    });
    const result = roomUpgradeGetEffectiveMaxInhabitants(room, crystalMineRoom);
    expect(result).toBe(4);
  });

  it('should return base when non-capacity upgrade is applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const result = roomUpgradeGetEffectiveMaxInhabitants(room, crystalMineRoom);
    expect(result).toBe(2);
  });

  it('should return -1 for unlimited capacity rooms regardless of upgrades', () => {
    const unlimitedRoom: RoomContent = {
      ...crystalMineRoom,
      id: 'unlimited-room' as RoomId,
      maxInhabitants: -1,
    };
    mockContent.set('unlimited-room', unlimitedRoom);

    const room = createPlacedRoom({ roomTypeId: 'unlimited-room' as RoomId });
    const result = roomUpgradeGetEffectiveMaxInhabitants(room, unlimitedRoom);
    expect(result).toBe(-1);
  });

  it('should return base when upgrade path ID does not match any path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'nonexistent' as RoomUpgradeId,
    });
    const result = roomUpgradeGetEffectiveMaxInhabitants(room, crystalMineRoom);
    expect(result).toBe(2);
  });
});

describe('roomUpgradeGetSecondaryProduction', () => {
  it('should return empty object when no upgrade is applied', () => {
    const room = createPlacedRoom();
    const result = roomUpgradeGetSecondaryProduction(room);
    expect(result).toEqual({});
  });

  it('should return secondary production from specialization upgrade', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-specialization' as RoomUpgradeId,
    });
    const result = roomUpgradeGetSecondaryProduction(room);
    expect(result).toEqual({ flux: 0.2 });
  });

  it('should return empty object for upgrade with no secondary production', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-capacity' as RoomUpgradeId,
    });
    const result = roomUpgradeGetSecondaryProduction(room);
    expect(result).toEqual({});
  });

  it('should return empty object for nonexistent upgrade path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'nonexistent' as RoomUpgradeId,
    });
    const result = roomUpgradeGetSecondaryProduction(room);
    expect(result).toEqual({});
  });
});

describe('roomUpgradeGetProductionMultiplier', () => {
  it('should return 1.0 when no upgrade is applied', () => {
    const room = createPlacedRoom();
    const result = roomUpgradeGetProductionMultiplier(room);
    expect(result).toBe(1.0);
  });

  it('should return 1.5 for efficiency upgrade when matching resource', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const result = roomUpgradeGetProductionMultiplier(room, 'crystals');
    expect(result).toBe(1.5);
  });

  it('should return 1.0 for efficiency upgrade when resource does not match', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-efficiency' as RoomUpgradeId,
    });
    const result = roomUpgradeGetProductionMultiplier(room, 'corruption');
    expect(result).toBe(1.0);
  });

  it('should return 2.0 for dark upgrade when matching resource', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-dark' as RoomUpgradeId,
    });
    const result = roomUpgradeGetProductionMultiplier(room, 'crystals');
    expect(result).toBe(2.0);
  });

  it('should return 1.0 for dark upgrade when resource does not match', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-dark' as RoomUpgradeId,
    });
    const result = roomUpgradeGetProductionMultiplier(room, 'gold');
    expect(result).toBe(1.0);
  });

  it('should return 1.0 for upgrade with no production multiplier', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-capacity' as RoomUpgradeId,
    });
    const result = roomUpgradeGetProductionMultiplier(room);
    expect(result).toBe(1.0);
  });

  it('should return 1.0 for nonexistent upgrade path', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'nonexistent' as RoomUpgradeId,
    });
    const result = roomUpgradeGetProductionMultiplier(room);
    expect(result).toBe(1.0);
  });

  it('should apply global multiplier (no resource) to any resource type', () => {
    // Create a global multiplier upgrade (no resource field)
    const globalUpgrade: RoomUpgradeContent = {
      id: 'upgrade-global' as RoomUpgradeId,
      name: 'Global Boost',
      __type: 'roomupgrade',
      description: 'Boosts all production.',
      cost: {},
      effects: [{ type: 'productionMultiplier', value: 1.5 }],
    };
    mockContent.set('upgrade-global', globalUpgrade);
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-global' as RoomUpgradeId,
    });
    expect(roomUpgradeGetProductionMultiplier(room, 'crystals')).toBe(1.5);
    expect(roomUpgradeGetProductionMultiplier(room, 'corruption')).toBe(1.5);
    expect(roomUpgradeGetProductionMultiplier(room, 'essence')).toBe(1.5);
  });
});
