import type {
  Floor,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomUpgradePath,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const LEY_LINE_NEXUS_ID = 'room-ley-line-nexus';
const SHADOW_LIBRARY_ID = 'room-shadow-library';
const SOUL_WELL_ID = 'room-soul-well';

// --- Upgrade paths ---

const fluxAmplifierPath: RoomUpgradePath = {
  id: 'upgrade-flux-amplifier',
  name: 'Flux Amplifier',
  description: 'Crystalline focusing arrays amplify flux output.',
  cost: { gold: 120, crystals: 80, essence: 30 },
  effects: [{ type: 'productionMultiplier', value: 1.5, resource: 'flux' }],
};

const expandedNexusPath: RoomUpgradePath = {
  id: 'upgrade-expanded-nexus',
  name: 'Expanded Nexus',
  description: 'Widen the convergence chamber for an additional channeler.',
  cost: { gold: 100, crystals: 60 },
  effects: [{ type: 'maxInhabitantBonus', value: 1 }],
};

const arcaneOverchargePath: RoomUpgradePath = {
  id: 'upgrade-arcane-overcharge',
  name: 'Arcane Overcharge',
  description: 'Push the ley line beyond its natural limits.',
  cost: { gold: 150, crystals: 100, essence: 40 },
  effects: [
    { type: 'productionMultiplier', value: 2.0, resource: 'flux' },
    { type: 'fearIncrease', value: 1 },
    { type: 'secondaryProduction', value: 0.2, resource: 'research' },
  ],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id) ?? undefined,
  getEntriesByType: vi.fn(() => []),
  getEntries: vi.fn(),
  allIdsByName: vi.fn(() => new Map()),
}));

const leyLineNexusRoom: RoomDefinition & IsContentItem = {
  id: LEY_LINE_NEXUS_ID,
  name: 'Ley Line Nexus',
  __type: 'room',
  description: 'A mystical convergence point where underground ley lines intersect.',
  shapeId: 'shape-t',
  cost: { gold: 100, crystals: 50, essence: 20 },
  production: { flux: 2.0 },
  requiresWorkers: true,
  adjacencyBonuses: [
    { adjacentRoomType: SHADOW_LIBRARY_ID, bonus: 0.2, description: '' },
    { adjacentRoomType: SOUL_WELL_ID, bonus: 0.15, description: '' },
    { adjacentRoomType: LEY_LINE_NEXUS_ID, bonus: 0.25, description: '' },
  ],
  isUnique: false,
  removable: true,
  maxInhabitants: 2,
  inhabitantRestriction: null,
  fearLevel: 2,
  fearReductionAura: 0,
  upgradePaths: [fluxAmplifierPath, expandedNexusPath, arcaneOverchargePath],
  autoPlace: false,
};

const shadowLibraryRoom: RoomDefinition & IsContentItem = {
  id: SHADOW_LIBRARY_ID,
  name: 'Shadow Library',
  __type: 'room',
  description: '',
  shapeId: 'shape-t',
  cost: {},
  production: { research: 0.6 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 1,
  inhabitantRestriction: null,
  fearLevel: 2,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

const soulWellRoom: RoomDefinition & IsContentItem = {
  id: SOUL_WELL_ID,
  name: 'Soul Well',
  __type: 'room',
  description: '',
  shapeId: 'shape-3x3',
  cost: {},
  production: { essence: 0.3 },
  requiresWorkers: false,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 2,
  inhabitantRestriction: null,
  fearLevel: 3,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

mockContent.set('shape-t', {
  id: 'shape-t',
  name: 'T-Shape',
  __type: 'roomshape',
  width: 3,
  height: 2,
  tiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
  ],
});

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
  calculateAdjacencyBonus,
  calculateSingleRoomProduction,
  calculateTotalProduction,
  getBaseProduction,
  productionPerMinute,
} from '@helpers/production';
import {
  canApplyUpgrade,
  getEffectiveMaxInhabitants,
  getUpgradePaths,
} from '@helpers/room-upgrades';

// --- Helpers ---

function makeFloor(
  rooms: PlacedRoom[],
  inhabitants: InhabitantInstance[] = [],
): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: { tiles: [] } as unknown as Floor['grid'],
    rooms,
    hallways: [],
    inhabitants,
    connections: [],
  };
}

function createPlacedNexus(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'placed-nexus-1',
    roomTypeId: LEY_LINE_NEXUS_ID,
    shapeId: 'shape-t',
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.set(LEY_LINE_NEXUS_ID, leyLineNexusRoom);
  mockContent.set(SHADOW_LIBRARY_ID, shadowLibraryRoom);
  mockContent.set(SOUL_WELL_ID, soulWellRoom);
});

describe('Ley Line Nexus: definition', () => {
  it('should use the T-shape', () => {
    expect(leyLineNexusRoom.shapeId).toBe('shape-t');
  });

  it('should have medium fear level (2)', () => {
    expect(leyLineNexusRoom.fearLevel).toBe(2);
  });

  it('should have base capacity of 2 inhabitants', () => {
    expect(leyLineNexusRoom.maxInhabitants).toBe(2);
  });

  it('should require workers', () => {
    expect(leyLineNexusRoom.requiresWorkers).toBe(true);
  });

  it('should have 3 upgrade paths', () => {
    expect(leyLineNexusRoom.upgradePaths).toHaveLength(3);
  });

  it('should have 3 adjacency bonuses', () => {
    expect(leyLineNexusRoom.adjacencyBonuses).toHaveLength(3);
  });

  it('should cost gold, crystals, and essence', () => {
    expect(leyLineNexusRoom.cost).toEqual({ gold: 100, crystals: 50, essence: 20 });
  });
});

describe('Ley Line Nexus: base production', () => {
  it('should have base production of 2.0 flux/tick (10 flux/min)', () => {
    const production = getBaseProduction(LEY_LINE_NEXUS_ID);
    expect(production).toEqual({ flux: 2.0 });
    expect(productionPerMinute(production['flux']!)).toBeCloseTo(10.0);
  });

  it('should produce 0 flux when no workers are assigned', () => {
    const nexus = createPlacedNexus();
    const floor = makeFloor([nexus]);
    const production = calculateTotalProduction([floor]);
    expect(production).toEqual({});
  });

  it('should produce flux when a worker is assigned', () => {
    const nexus = createPlacedNexus();
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-nexus-1',
      },
    ];
    const floor = makeFloor([nexus], inhabitants);
    const production = calculateTotalProduction([floor]);
    expect(production['flux']).toBeCloseTo(2.0);
  });
});

describe('Ley Line Nexus: adjacency bonuses', () => {
  it('should apply +20% when adjacent to Shadow Library', () => {
    const nexus = createPlacedNexus({ anchorX: 0, anchorY: 0 });
    const library: PlacedRoom = {
      id: 'placed-library-1',
      roomTypeId: SHADOW_LIBRARY_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [nexus, library];
    const bonus = calculateAdjacencyBonus(
      nexus,
      ['placed-library-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.2);
  });

  it('should apply +15% when adjacent to Soul Well', () => {
    const nexus = createPlacedNexus({ anchorX: 0, anchorY: 0 });
    const well: PlacedRoom = {
      id: 'placed-well-1',
      roomTypeId: SOUL_WELL_ID,
      shapeId: 'shape-3x3',
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [nexus, well];
    const bonus = calculateAdjacencyBonus(
      nexus,
      ['placed-well-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should apply +25% when adjacent to another Ley Line Nexus', () => {
    const nexus1 = createPlacedNexus({ anchorX: 0, anchorY: 0 });
    const nexus2: PlacedRoom = {
      id: 'placed-nexus-2',
      roomTypeId: LEY_LINE_NEXUS_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [nexus1, nexus2];
    const bonus = calculateAdjacencyBonus(
      nexus1,
      ['placed-nexus-2'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.25);
  });

  it('should combine multiple adjacency bonuses', () => {
    const nexus = createPlacedNexus({ anchorX: 0, anchorY: 0 });
    const library: PlacedRoom = {
      id: 'placed-library-1',
      roomTypeId: SHADOW_LIBRARY_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const well: PlacedRoom = {
      id: 'placed-well-1',
      roomTypeId: SOUL_WELL_ID,
      shapeId: 'shape-3x3',
      anchorX: 0,
      anchorY: 2,
    };
    const allRooms = [nexus, library, well];
    const bonus = calculateAdjacencyBonus(
      nexus,
      ['placed-library-1', 'placed-well-1'],
      allRooms,
    );
    // 0.2 (Shadow Library) + 0.15 (Soul Well) = 0.35
    expect(bonus).toBeCloseTo(0.35);
  });
});

describe('Ley Line Nexus: Flux Amplifier upgrade', () => {
  it('should have productionMultiplier 1.5 for flux', () => {
    const paths = getUpgradePaths(LEY_LINE_NEXUS_ID);
    const amplifier = paths.find((p) => p.name === 'Flux Amplifier');
    expect(amplifier).toBeDefined();
    expect(amplifier!.effects).toHaveLength(1);
    expect(amplifier!.effects[0].type).toBe('productionMultiplier');
    expect(amplifier!.effects[0].value).toBe(1.5);
    expect(amplifier!.effects[0].resource).toBe('flux');
  });
});

describe('Ley Line Nexus: Expanded Nexus upgrade', () => {
  it('should change capacity from 2 to 3', () => {
    const room = createPlacedNexus({
      appliedUpgradePathId: 'upgrade-expanded-nexus',
    });
    const effective = getEffectiveMaxInhabitants(room, leyLineNexusRoom);
    expect(effective).toBe(3);
  });

  it('should keep capacity at 2 without upgrade', () => {
    const room = createPlacedNexus();
    const effective = getEffectiveMaxInhabitants(room, leyLineNexusRoom);
    expect(effective).toBe(2);
  });
});

describe('Ley Line Nexus: Arcane Overcharge upgrade', () => {
  it('should have productionMultiplier, fearIncrease, and secondaryProduction', () => {
    const paths = getUpgradePaths(LEY_LINE_NEXUS_ID);
    const overcharge = paths.find((p) => p.name === 'Arcane Overcharge');
    expect(overcharge).toBeDefined();
    expect(overcharge!.effects).toHaveLength(3);

    const prodEffect = overcharge!.effects.find(
      (e) => e.type === 'productionMultiplier',
    );
    expect(prodEffect!.value).toBe(2.0);
    expect(prodEffect!.resource).toBe('flux');

    const fearEffect = overcharge!.effects.find((e) => e.type === 'fearIncrease');
    expect(fearEffect!.value).toBe(1);

    const secEffect = overcharge!.effects.find(
      (e) => e.type === 'secondaryProduction',
    );
    expect(secEffect!.value).toBe(0.2);
    expect(secEffect!.resource).toBe('research');
  });
});

describe('Ley Line Nexus: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade', () => {
    const room = createPlacedNexus({
      appliedUpgradePathId: 'upgrade-flux-amplifier',
    });
    const result = canApplyUpgrade(room, 'upgrade-expanded-nexus');
    expect(result.valid).toBe(false);
  });

  it('should allow applying an upgrade to an un-upgraded room', () => {
    const room = createPlacedNexus();
    const result = canApplyUpgrade(room, 'upgrade-flux-amplifier');
    expect(result.valid).toBe(true);
  });
});

describe('Ley Line Nexus: full production with adjacency', () => {
  it('should apply adjacency bonus to flux production with worker', () => {
    const nexus = createPlacedNexus({ anchorX: 0, anchorY: 0 });
    const library: PlacedRoom = {
      id: 'placed-library-1',
      roomTypeId: SHADOW_LIBRARY_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-nexus-1',
      },
    ];
    const floor = makeFloor([nexus, library], inhabitants);
    const production = calculateSingleRoomProduction(nexus, floor);
    // Base 2.0 * (1 + 0 goblin + 0.2 adjacency) * 1.0 = 2.0 * 1.2 = 2.4
    expect(production['flux']).toBeCloseTo(2.4);
  });
});
