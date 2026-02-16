import type {
  Floor,
  FloorId,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  PlacedRoomId,
  RoomContent,
  RoomId,
  RoomShapeId,
  RoomUpgradePath,
  UpgradePathId,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const TREASURE_VAULT_ID = 'room-treasure-vault';
const DARK_FORGE_ID = 'room-dark-forge';
const ALTAR_ROOM_ID = 'room-altar';
const THRONE_ROOM_ID = 'room-throne-room';

// --- Upgrade paths ---

const reinforcedVaultPath: RoomUpgradePath = {
  id: 'upgrade-reinforced-vault' as UpgradePathId,
  name: 'Reinforced Vault',
  description: 'Reinforce walls with enchanted steel.',
  cost: { gold: 150, crystals: 80 },
  effects: [
    { type: 'productionMultiplier', value: 1.5, resource: 'gold' },
    { type: 'fearReduction', value: 1 },
  ],
};

const investmentVaultPath: RoomUpgradePath = {
  id: 'upgrade-investment-vault' as UpgradePathId,
  name: 'Investment Vault',
  description: 'Transform the vault into a financial hub.',
  cost: { gold: 200, crystals: 60 },
  effects: [
    { type: 'productionMultiplier', value: 2.0, resource: 'gold' },
    { type: 'maxInhabitantBonus', value: 1 },
  ],
};

const dragonsHoardPath: RoomUpgradePath = {
  id: 'upgrade-dragons-hoard' as UpgradePathId,
  name: "Dragon's Hoard",
  description: 'Amass a legendary treasure hoard.',
  cost: { gold: 180, crystals: 100, essence: 20 },
  effects: [
    { type: 'productionMultiplier', value: 2.5, resource: 'gold' },
    { type: 'fearIncrease', value: 2 },
  ],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
  getEntries: vi.fn(),
  contentAllIdsByName: vi.fn(() => new Map()),
}));

const treasureVaultRoom: RoomContent & IsContentItem = {
  id: TREASURE_VAULT_ID as RoomId,
  name: 'Treasure Vault',
  __type: 'room',
  description: 'A fortified 3x3 chamber for storing and growing gold.',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: { gold: 120, crystals: 40 },
  production: { gold: 0.8 },
  requiresWorkers: false,
  adjacencyBonuses: [
    { adjacentRoomType: DARK_FORGE_ID, bonus: 0.15, description: '' },
    { adjacentRoomType: ALTAR_ROOM_ID, bonus: 0.25, description: '' },
    { adjacentRoomType: THRONE_ROOM_ID, bonus: 0.2, description: '' },
    { adjacentRoomType: TREASURE_VAULT_ID, bonus: 0.1, description: '' },
  ],
  isUnique: false,
  removable: true,
  maxInhabitants: 1,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  upgradePaths: [reinforcedVaultPath, investmentVaultPath, dragonsHoardPath],
  autoPlace: false,
};

const darkForgeRoom: RoomContent & IsContentItem = {
  id: DARK_FORGE_ID as RoomId,
  name: 'Dark Forge',
  __type: 'room',
  description: '',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: {},
  production: { gold: 1.2 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 0,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

const altarRoom: RoomContent & IsContentItem = {
  id: ALTAR_ROOM_ID as RoomId,
  name: 'Altar Room',
  __type: 'room',
  description: '',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: {},
  production: { essence: 0.2 },
  requiresWorkers: false,
  adjacencyBonuses: [],
  isUnique: true,
  removable: false,
  maxInhabitants: 0,
  inhabitantRestriction: undefined,
  fearLevel: 0,
  fearReductionAura: 1,
  upgradePaths: [],
  autoPlace: true,
};

const throneRoom: RoomContent & IsContentItem = {
  id: THRONE_ROOM_ID as RoomId,
  name: 'Throne Room',
  __type: 'room',
  description: '',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: {},
  production: {},
  requiresWorkers: false,
  adjacencyBonuses: [],
  isUnique: true,
  removable: true,
  maxInhabitants: 1,
  inhabitantRestriction: 'unique',
  fearLevel: 0,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

mockContent.set('shape-3x3', {
  id: 'shape-3x3',
  name: 'Square 3x3',
  __type: 'roomshape',
  width: 3,
  height: 3,
  tiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
});

mockContent.set('def-goblin', {
  id: 'def-goblin',
  name: 'Goblin',
  __type: 'inhabitant',
  type: 'creature',
  tier: 1,
  description: '',
  cost: {},
  stats: {
    hp: 30,
    attack: 10,
    defense: 8,
    speed: 12,
    workerEfficiency: 1.0,
  },
  traits: [],
});

// --- Imports after mocks ---

import {
  productionCalculateAdjacencyBonus,
  productionCalculateSingleRoom,
  productionCalculateTotal,
  productionGetBase,
  productionPerMinute,
} from '@helpers/production';
import {
  roomUpgradeCanApply,
  roomUpgradeGetEffectiveMaxInhabitants,
  roomUpgradeGetPaths,
} from '@helpers/room-upgrades';

// --- Helpers ---

function makeFloor(
  rooms: PlacedRoom[],
  inhabitants: InhabitantInstance[] = [],
): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: { tiles: [] } as unknown as Floor['grid'],
    rooms,
    hallways: [],
    inhabitants,
    connections: [],
    traps: [],
  };
}

function createPlacedVault(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'placed-vault-1' as PlacedRoomId,
    roomTypeId: TREASURE_VAULT_ID as RoomId,
    shapeId: 'shape-3x3' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.set(TREASURE_VAULT_ID, treasureVaultRoom);
  mockContent.set(DARK_FORGE_ID, darkForgeRoom);
  mockContent.set(ALTAR_ROOM_ID, altarRoom);
  mockContent.set(THRONE_ROOM_ID, throneRoom);
});

describe('Treasure Vault: definition', () => {
  it('should use the 3x3 square shape', () => {
    expect(treasureVaultRoom.shapeId).toBe('shape-3x3');
  });

  it('should have low fear level (1)', () => {
    expect(treasureVaultRoom.fearLevel).toBe(1);
  });

  it('should have base capacity of 1 inhabitant', () => {
    expect(treasureVaultRoom.maxInhabitants).toBe(1);
  });

  it('should not require workers for passive production', () => {
    expect(treasureVaultRoom.requiresWorkers).toBe(false);
  });

  it('should have 3 upgrade paths', () => {
    expect(treasureVaultRoom.upgradePaths).toHaveLength(3);
  });

  it('should have 4 adjacency bonuses', () => {
    expect(treasureVaultRoom.adjacencyBonuses).toHaveLength(4);
  });
});

describe('Treasure Vault: base production', () => {
  it('should have base production of 0.8 gold/tick (4 gold/min)', () => {
    const production = productionGetBase(TREASURE_VAULT_ID as RoomId);
    expect(production).toEqual({ gold: 0.8 });
    expect(productionPerMinute(production['gold']!)).toBeCloseTo(4.0);
  });

  it('should produce gold even without workers (passive)', () => {
    const vault = createPlacedVault();
    const floor = makeFloor([vault]);
    const production = productionCalculateTotal([floor]);
    expect(production['gold']).toBeCloseTo(0.8);
  });
});

describe('Treasure Vault: adjacency bonuses', () => {
  it('should apply +15% when adjacent to Dark Forge', () => {
    const vault = createPlacedVault({ anchorX: 0, anchorY: 0 });
    const forge: PlacedRoom = {
      id: 'placed-forge-1' as PlacedRoomId,
      roomTypeId: DARK_FORGE_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [vault, forge];
    const bonus = productionCalculateAdjacencyBonus(
      vault,
      ['placed-forge-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should apply +25% when adjacent to Altar Room', () => {
    const vault = createPlacedVault({ anchorX: 0, anchorY: 0 });
    const altar: PlacedRoom = {
      id: 'placed-altar-1' as PlacedRoomId,
      roomTypeId: ALTAR_ROOM_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [vault, altar];
    const bonus = productionCalculateAdjacencyBonus(
      vault,
      ['placed-altar-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.25);
  });

  it('should apply +20% when adjacent to Throne Room', () => {
    const vault = createPlacedVault({ anchorX: 0, anchorY: 0 });
    const throne: PlacedRoom = {
      id: 'placed-throne-1' as PlacedRoomId,
      roomTypeId: THRONE_ROOM_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [vault, throne];
    const bonus = productionCalculateAdjacencyBonus(
      vault,
      ['placed-throne-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.2);
  });

  it('should apply +10% when adjacent to another Treasure Vault', () => {
    const vault1 = createPlacedVault({ anchorX: 0, anchorY: 0 });
    const vault2: PlacedRoom = {
      id: 'placed-vault-2' as PlacedRoomId,
      roomTypeId: TREASURE_VAULT_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [vault1, vault2];
    const bonus = productionCalculateAdjacencyBonus(
      vault1,
      ['placed-vault-2'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.1);
  });

  it('should combine multiple adjacency bonuses', () => {
    const vault = createPlacedVault({ anchorX: 0, anchorY: 0 });
    const forge: PlacedRoom = {
      id: 'placed-forge-1' as PlacedRoomId,
      roomTypeId: DARK_FORGE_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const altar: PlacedRoom = {
      id: 'placed-altar-1' as PlacedRoomId,
      roomTypeId: ALTAR_ROOM_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 0,
      anchorY: 3,
    };
    const allRooms = [vault, forge, altar];
    const bonus = productionCalculateAdjacencyBonus(
      vault,
      ['placed-forge-1', 'placed-altar-1'],
      allRooms,
    );
    // 0.15 (Dark Forge) + 0.25 (Altar) = 0.40
    expect(bonus).toBeCloseTo(0.4);
  });
});

describe('Treasure Vault: Reinforced Vault upgrade', () => {
  it('should have productionMultiplier 1.5 and fearReduction 1', () => {
    const paths = roomUpgradeGetPaths(TREASURE_VAULT_ID as RoomId);
    const reinforced = paths.find((p) => p.name === 'Reinforced Vault');
    expect(reinforced).toBeDefined();
    expect(reinforced!.effects).toHaveLength(2);

    const prodEffect = reinforced!.effects.find(
      (e) => e.type === 'productionMultiplier',
    );
    expect(prodEffect!.value).toBe(1.5);
    expect(prodEffect!.resource).toBe('gold');

    const fearEffect = reinforced!.effects.find(
      (e) => e.type === 'fearReduction',
    );
    expect(fearEffect!.value).toBe(1);
  });
});

describe('Treasure Vault: Investment Vault upgrade', () => {
  it('should have productionMultiplier 2.0 and maxInhabitantBonus 1', () => {
    const paths = roomUpgradeGetPaths(TREASURE_VAULT_ID as RoomId);
    const investment = paths.find((p) => p.name === 'Investment Vault');
    expect(investment).toBeDefined();
    expect(investment!.effects).toHaveLength(2);

    const prodEffect = investment!.effects.find(
      (e) => e.type === 'productionMultiplier',
    );
    expect(prodEffect!.value).toBe(2.0);

    const capEffect = investment!.effects.find(
      (e) => e.type === 'maxInhabitantBonus',
    );
    expect(capEffect!.value).toBe(1);
  });

  it('should change capacity from 1 to 2', () => {
    const room = createPlacedVault({
      appliedUpgradePathId: 'upgrade-investment-vault' as UpgradePathId,
    });
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, treasureVaultRoom);
    expect(effective).toBe(2);
  });
});

describe("Treasure Vault: Dragon's Hoard upgrade", () => {
  it('should have productionMultiplier 2.5 and fearIncrease 2', () => {
    const paths = roomUpgradeGetPaths(TREASURE_VAULT_ID as RoomId);
    const hoard = paths.find((p) => p.name === "Dragon's Hoard");
    expect(hoard).toBeDefined();
    expect(hoard!.effects).toHaveLength(2);

    const prodEffect = hoard!.effects.find(
      (e) => e.type === 'productionMultiplier',
    );
    expect(prodEffect!.value).toBe(2.5);

    const fearEffect = hoard!.effects.find(
      (e) => e.type === 'fearIncrease',
    );
    expect(fearEffect!.value).toBe(2);
  });

  it('should not change capacity', () => {
    const room = createPlacedVault({
      appliedUpgradePathId: 'upgrade-dragons-hoard' as UpgradePathId,
    });
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, treasureVaultRoom);
    expect(effective).toBe(1);
  });
});

describe('Treasure Vault: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade', () => {
    const room = createPlacedVault({
      appliedUpgradePathId: 'upgrade-reinforced-vault' as UpgradePathId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-investment-vault');
    expect(result.valid).toBe(false);
  });

  it('should allow applying an upgrade to an un-upgraded room', () => {
    const room = createPlacedVault();
    const result = roomUpgradeCanApply(room, 'upgrade-reinforced-vault');
    expect(result.valid).toBe(true);
  });
});

describe('Treasure Vault: full production with adjacency', () => {
  it('should apply adjacency bonus to passive gold production', () => {
    const vault = createPlacedVault({ anchorX: 0, anchorY: 0 });
    const altar: PlacedRoom = {
      id: 'placed-altar-1' as PlacedRoomId,
      roomTypeId: ALTAR_ROOM_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const floor = makeFloor([vault, altar]);
    const production = productionCalculateSingleRoom(vault, floor);
    // Base 0.8 * (1 + 0.25 adjacency) * 1.0 = 0.8 * 1.25 = 1.0
    expect(production['gold']).toBeCloseTo(1.0);
  });
});
