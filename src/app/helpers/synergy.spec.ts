import { describe, expect, it, vi } from 'vitest';

vi.mock('@helpers/content', () => {
  const entries = new Map<string, unknown>();

  entries.set('room-crystal-mine', {
    id: 'room-crystal-mine',
    name: 'Crystal Mine',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { crystals: 1.0 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });

  entries.set('room-dark-forge', {
    id: 'room-dark-forge',
    name: 'Dark Forge',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { gold: 1.2 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });

  entries.set('room-mushroom-grove', {
    id: 'room-mushroom-grove',
    name: 'Mushroom Grove',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { food: 1.6 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });

  entries.set('room-shadow-library', {
    id: 'room-shadow-library',
    name: 'Shadow Library',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { research: 0.8 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });

  entries.set('room-soul-well', {
    id: 'room-soul-well',
    name: 'Soul Well',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { essence: 0.3 },
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  entries.set('room-treasure-vault', {
    id: 'room-treasure-vault',
    name: 'Treasure Vault',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { gold: 0.8 },
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  entries.set('room-barracks', {
    id: 'room-barracks',
    name: 'Barracks',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  entries.set('def-goblin', {
    id: 'def-goblin',
    name: 'Goblin',
    __type: 'inhabitant',
    type: 'creature',
    tier: 1,
    description: '',
    cost: {},
    stats: { hp: 30, attack: 10, defense: 8, speed: 12, workerEfficiency: 1.0 },
    traits: [],
  });

  entries.set('def-myconid', {
    id: 'def-myconid',
    name: 'Myconid',
    __type: 'inhabitant',
    type: 'fungal',
    tier: 1,
    description: '',
    cost: {},
    stats: { hp: 25, attack: 5, defense: 10, speed: 8, workerEfficiency: 1.3 },
    traits: [],
  });

  entries.set('def-skeleton', {
    id: 'def-skeleton',
    name: 'Skeleton',
    __type: 'inhabitant',
    type: 'undead',
    tier: 1,
    description: '',
    cost: {},
    stats: { hp: 40, attack: 12, defense: 15, speed: 6, workerEfficiency: 0.7 },
    traits: [],
  });

  entries.set('shape-1', {
    id: 'shape-1',
    name: 'Test 2x1',
    __type: 'roomshape',
    tiles: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    width: 2,
    height: 1,
  });

  return {
    contentGetEntry: vi.fn((id: string) => entries.get(id)),
    contentGetEntriesByType: vi.fn(() => []),
    getEntries: vi.fn(),
    contentAllIdsByName: vi.fn(() => new Map()),
  };
});

vi.mock('@helpers/production', () => ({
  productionGetRoomDefinition: vi.fn((id: string) => {
    const rooms: Record<string, { name: string }> = {
      'room-dark-forge': { name: 'Dark Forge' },
      'room-soul-well': { name: 'Soul Well' },
      'room-barracks': { name: 'Barracks' },
      'room-crystal-mine': { name: 'Crystal Mine' },
      'room-mushroom-grove': { name: 'Mushroom Grove' },
      'room-shadow-library': { name: 'Shadow Library' },
      'room-treasure-vault': { name: 'Treasure Vault' },
    };
    return rooms[id] ?? undefined;
  }),
}));

import type {
  Connection,
  Floor,
  InhabitantInstance,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  SynergyDefinition,
} from '@interfaces';
import {
  synergyEvaluateCondition,
  synergyEvaluateAll,
  synergyEvaluateForRoom,
  synergyFormatEffect,
  synergyGetPotentialForRoom,
} from '@helpers/synergy';

function makeFloor(
  rooms: PlacedRoom[],
  inhabitants: InhabitantInstance[] = [],
  connections: Connection[] = [],
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
    connections,
    traps: [],
  };
}

describe('synergyEvaluateCondition', () => {
  const mine: PlacedRoom = {
    id: 'placed-mine' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1',
    anchorX: 0,
    anchorY: 0,
  };

  const forge: PlacedRoom = {
    id: 'placed-forge' as PlacedRoomId,
    roomTypeId: 'room-dark-forge' as RoomId,
    shapeId: 'shape-1',
    anchorX: 2,
    anchorY: 0,
  };

  describe('roomType condition', () => {
    it('should return true when room type matches', () => {
      const floor = makeFloor([mine]);
      expect(
        synergyEvaluateCondition(
          { type: 'roomType', roomTypeId: 'room-crystal-mine' as RoomId },
          mine,
          floor,
          [],
        ),
      ).toBe(true);
    });

    it('should return false when room type does not match', () => {
      const floor = makeFloor([mine]);
      expect(
        synergyEvaluateCondition(
          { type: 'roomType', roomTypeId: 'room-dark-forge' as RoomId },
          mine,
          floor,
          [],
        ),
      ).toBe(false);
    });
  });

  describe('adjacentRoomType condition', () => {
    it('should return true when adjacent room type matches', () => {
      const floor = makeFloor([mine, forge]);
      expect(
        synergyEvaluateCondition(
          { type: 'adjacentRoomType', roomTypeId: 'room-dark-forge' as RoomId },
          mine,
          floor,
          ['placed-forge'],
        ),
      ).toBe(true);
    });

    it('should return false when no adjacent room matches', () => {
      const floor = makeFloor([mine, forge]);
      expect(
        synergyEvaluateCondition(
          { type: 'adjacentRoomType', roomTypeId: 'room-soul-well' as RoomId },
          mine,
          floor,
          ['placed-forge'],
        ),
      ).toBe(false);
    });

    it('should return false when room is not adjacent', () => {
      const floor = makeFloor([mine, forge]);
      expect(
        synergyEvaluateCondition(
          { type: 'adjacentRoomType', roomTypeId: 'room-dark-forge' as RoomId },
          mine,
          floor,
          [],
        ),
      ).toBe(false);
    });
  });

  describe('connectedRoomType condition', () => {
    it('should return true when connected to matching room type', () => {
      const conn: Connection = {
        id: 'conn-1',
        roomAId: 'placed-mine' as PlacedRoomId,
        roomBId: 'placed-forge' as PlacedRoomId,
        edgeTiles: [],
      };
      const floor = makeFloor([mine, forge], [], [conn]);
      expect(
        synergyEvaluateCondition(
          { type: 'connectedRoomType', roomTypeId: 'room-dark-forge' as RoomId },
          mine,
          floor,
          [],
        ),
      ).toBe(true);
    });

    it('should return true for the reverse direction of connection', () => {
      const conn: Connection = {
        id: 'conn-1',
        roomAId: 'placed-mine' as PlacedRoomId,
        roomBId: 'placed-forge' as PlacedRoomId,
        edgeTiles: [],
      };
      const floor = makeFloor([mine, forge], [], [conn]);
      expect(
        synergyEvaluateCondition(
          { type: 'connectedRoomType', roomTypeId: 'room-crystal-mine' as RoomId },
          forge,
          floor,
          [],
        ),
      ).toBe(true);
    });

    it('should return false when not connected', () => {
      const floor = makeFloor([mine, forge]);
      expect(
        synergyEvaluateCondition(
          { type: 'connectedRoomType', roomTypeId: 'room-dark-forge' as RoomId },
          mine,
          floor,
          [],
        ),
      ).toBe(false);
    });
  });

  describe('inhabitantType condition', () => {
    it('should return true when assigned inhabitant matches type', () => {
      const inhabitants: InhabitantInstance[] = [
        {
          instanceId: 'inst-1',
          definitionId: 'def-goblin',
          name: 'Goblin',
          state: 'normal',
          assignedRoomId: 'placed-mine' as PlacedRoomId,
        },
      ];
      const floor = makeFloor([mine], inhabitants);
      expect(
        synergyEvaluateCondition(
          { type: 'inhabitantType', inhabitantType: 'creature' },
          mine,
          floor,
          [],
        ),
      ).toBe(true);
    });

    it('should return false when no inhabitant matches type', () => {
      const inhabitants: InhabitantInstance[] = [
        {
          instanceId: 'inst-1',
          definitionId: 'def-skeleton',
          name: 'Skeleton',
          state: 'normal',
          assignedRoomId: 'placed-mine' as PlacedRoomId,
        },
      ];
      const floor = makeFloor([mine], inhabitants);
      expect(
        synergyEvaluateCondition(
          { type: 'inhabitantType', inhabitantType: 'creature' },
          mine,
          floor,
          [],
        ),
      ).toBe(false);
    });

    it('should return false when no inhabitants are assigned', () => {
      const floor = makeFloor([mine]);
      expect(
        synergyEvaluateCondition(
          { type: 'inhabitantType', inhabitantType: 'creature' },
          mine,
          floor,
          [],
        ),
      ).toBe(false);
    });

    it('should ignore inhabitants assigned to other rooms', () => {
      const inhabitants: InhabitantInstance[] = [
        {
          instanceId: 'inst-1',
          definitionId: 'def-goblin',
          name: 'Goblin',
          state: 'normal',
          assignedRoomId: 'placed-forge' as PlacedRoomId,
        },
      ];
      const floor = makeFloor([mine, forge], inhabitants);
      expect(
        synergyEvaluateCondition(
          { type: 'inhabitantType', inhabitantType: 'creature' },
          mine,
          floor,
          [],
        ),
      ).toBe(false);
    });
  });

  describe('minInhabitants condition', () => {
    it('should return true when inhabitant count meets minimum', () => {
      const inhabitants: InhabitantInstance[] = [
        {
          instanceId: 'inst-1',
          definitionId: 'def-goblin',
          name: 'Goblin 1',
          state: 'normal',
          assignedRoomId: 'placed-mine' as PlacedRoomId,
        },
        {
          instanceId: 'inst-2',
          definitionId: 'def-goblin',
          name: 'Goblin 2',
          state: 'normal',
          assignedRoomId: 'placed-mine' as PlacedRoomId,
        },
      ];
      const floor = makeFloor([mine], inhabitants);
      expect(
        synergyEvaluateCondition(
          { type: 'minInhabitants', count: 2 },
          mine,
          floor,
          [],
        ),
      ).toBe(true);
    });

    it('should return false when inhabitant count is below minimum', () => {
      const inhabitants: InhabitantInstance[] = [
        {
          instanceId: 'inst-1',
          definitionId: 'def-goblin',
          name: 'Goblin',
          state: 'normal',
          assignedRoomId: 'placed-mine' as PlacedRoomId,
        },
      ];
      const floor = makeFloor([mine], inhabitants);
      expect(
        synergyEvaluateCondition(
          { type: 'minInhabitants', count: 2 },
          mine,
          floor,
          [],
        ),
      ).toBe(false);
    });

    it('should return false when no inhabitants assigned', () => {
      const floor = makeFloor([mine]);
      expect(
        synergyEvaluateCondition(
          { type: 'minInhabitants', count: 1 },
          mine,
          floor,
          [],
        ),
      ).toBe(false);
    });
  });
});

describe('synergyEvaluateForRoom', () => {
  const testSynergies: SynergyDefinition[] = [
    {
      id: 'test-mine-forge',
      name: 'Test Mine Forge',
      description: 'Mine near forge with creature worker',
      conditions: [
        { type: 'roomType', roomTypeId: 'room-crystal-mine' as RoomId },
        { type: 'adjacentRoomType', roomTypeId: 'room-dark-forge' as RoomId },
        { type: 'inhabitantType', inhabitantType: 'creature' },
      ],
      effects: [{ type: 'productionBonus', value: 0.15 }],
    },
    {
      id: 'test-forge-staff',
      name: 'Test Forge Staff',
      description: 'Forge with 2+ workers',
      conditions: [
        { type: 'roomType', roomTypeId: 'room-dark-forge' as RoomId },
        { type: 'minInhabitants', count: 2 },
      ],
      effects: [{ type: 'productionBonus', value: 0.1 }],
    },
  ];

  const mine: PlacedRoom = {
    id: 'placed-mine' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1',
    anchorX: 0,
    anchorY: 0,
  };

  const forge: PlacedRoom = {
    id: 'placed-forge' as PlacedRoomId,
    roomTypeId: 'room-dark-forge' as RoomId,
    shapeId: 'shape-1',
    anchorX: 2,
    anchorY: 0,
  };

  it('should activate synergy when all conditions are met', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine, forge], inhabitants);
    const active = synergyEvaluateForRoom(
      mine,
      floor,
      ['placed-forge'],
      testSynergies,
    );
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('test-mine-forge');
  });

  it('should not activate synergy when a condition is not met', () => {
    // No inhabitants — inhabitantType condition fails
    const floor = makeFloor([mine, forge]);
    const active = synergyEvaluateForRoom(
      mine,
      floor,
      ['placed-forge'],
      testSynergies,
    );
    expect(active).toHaveLength(0);
  });

  it('should not activate synergy for wrong room type', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-forge' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine, forge], inhabitants);
    // Forge doesn't match mine-forge synergy's roomType condition
    const active = synergyEvaluateForRoom(
      forge,
      floor,
      ['placed-mine'],
      testSynergies,
    );
    // Only forge-staff might match, but needs 2 inhabitants
    expect(active).toHaveLength(0);
  });

  it('should activate multiple synergies for same room when conditions met', () => {
    const mineForgeMineSynergy: SynergyDefinition = {
      id: 'test-mine-adjacent',
      name: 'Test Mine Adjacent',
      description: 'Mine near forge',
      conditions: [
        { type: 'roomType', roomTypeId: 'room-crystal-mine' as RoomId },
        { type: 'adjacentRoomType', roomTypeId: 'room-dark-forge' as RoomId },
      ],
      effects: [{ type: 'productionBonus', value: 0.05 }],
    };
    const allSynergies = [...testSynergies, mineForgeMineSynergy];
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine, forge], inhabitants);
    const active = synergyEvaluateForRoom(
      mine,
      floor,
      ['placed-forge'],
      allSynergies,
    );
    expect(active).toHaveLength(2);
  });
});

describe('synergyEvaluateAll', () => {
  const testSynergies: SynergyDefinition[] = [
    {
      id: 'test-mine-forge',
      name: 'Test Mine Forge',
      description: 'Mine near forge with creature worker',
      conditions: [
        { type: 'roomType', roomTypeId: 'room-crystal-mine' as RoomId },
        { type: 'adjacentRoomType', roomTypeId: 'room-dark-forge' as RoomId },
        { type: 'inhabitantType', inhabitantType: 'creature' },
      ],
      effects: [{ type: 'productionBonus', value: 0.15 }],
    },
  ];

  const mine: PlacedRoom = {
    id: 'placed-mine' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1',
    anchorX: 0,
    anchorY: 0,
  };

  const forge: PlacedRoom = {
    id: 'placed-forge' as PlacedRoomId,
    roomTypeId: 'room-dark-forge' as RoomId,
    shapeId: 'shape-1',
    anchorX: 2,
    anchorY: 0,
  };

  it('should return map of active synergies across all floors', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine, forge], inhabitants);
    const result = synergyEvaluateAll([floor], testSynergies);
    expect(result.get('placed-mine')).toHaveLength(1);
    expect(result.get('placed-mine')![0].id).toBe('test-mine-forge');
    expect(result.has('placed-forge')).toBe(false);
  });

  it('should return empty map when no synergies activate', () => {
    const floor = makeFloor([mine, forge]);
    const result = synergyEvaluateAll([floor], testSynergies);
    expect(result.size).toBe(0);
  });

  it('should not share synergies across floors', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    // Mine on floor 1, forge on floor 2 — adjacency not met
    const floor1 = makeFloor([mine], inhabitants);
    const floor2 = makeFloor([forge]);
    const result = synergyEvaluateAll([floor1, floor2], testSynergies);
    expect(result.size).toBe(0);
  });
});

describe('synergy re-evaluation scenarios', () => {
  const testSynergies: SynergyDefinition[] = [
    {
      id: 'test-mine-forge-creature',
      name: 'Test',
      description: 'Test',
      conditions: [
        { type: 'roomType', roomTypeId: 'room-crystal-mine' as RoomId },
        { type: 'adjacentRoomType', roomTypeId: 'room-dark-forge' as RoomId },
        { type: 'inhabitantType', inhabitantType: 'creature' },
      ],
      effects: [{ type: 'productionBonus', value: 0.15 }],
    },
    {
      id: 'test-connected',
      name: 'Test Connected',
      description: 'Test',
      conditions: [
        { type: 'roomType', roomTypeId: 'room-crystal-mine' as RoomId },
        { type: 'connectedRoomType', roomTypeId: 'room-dark-forge' as RoomId },
      ],
      effects: [{ type: 'productionBonus', value: 0.1 }],
    },
  ];

  const mine: PlacedRoom = {
    id: 'placed-mine' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1',
    anchorX: 0,
    anchorY: 0,
  };

  const forge: PlacedRoom = {
    id: 'placed-forge' as PlacedRoomId,
    roomTypeId: 'room-dark-forge' as RoomId,
    shapeId: 'shape-1',
    anchorX: 2,
    anchorY: 0,
  };

  it('should activate on room placement when conditions are met', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    // Before forge placed: no adjacency synergy
    const beforePlacement = synergyEvaluateAll(
      [makeFloor([mine], inhabitants)],
      testSynergies,
    );
    expect(beforePlacement.size).toBe(0);

    // After forge placed: synergy activates
    const afterPlacement = synergyEvaluateAll(
      [makeFloor([mine, forge], inhabitants)],
      testSynergies,
    );
    expect(afterPlacement.get('placed-mine')).toHaveLength(1);
    expect(afterPlacement.get('placed-mine')![0].id).toBe(
      'test-mine-forge-creature',
    );
  });

  it('should activate on inhabitant assignment', () => {
    const floor = makeFloor([mine, forge]);
    const before = synergyEvaluateAll([floor], testSynergies);
    expect(before.size).toBe(0);

    // Assign goblin (creature type)
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const after = synergyEvaluateAll(
      [makeFloor([mine, forge], inhabitants)],
      testSynergies,
    );
    expect(after.get('placed-mine')).toHaveLength(1);
  });

  it('should deactivate on inhabitant removal', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const active = synergyEvaluateAll(
      [makeFloor([mine, forge], inhabitants)],
      testSynergies,
    );
    expect(active.get('placed-mine')).toHaveLength(1);

    // Unassign inhabitant
    const unassigned: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: undefined,
      },
    ];
    const inactive = synergyEvaluateAll(
      [makeFloor([mine, forge], unassigned)],
      testSynergies,
    );
    expect(inactive.has('placed-mine')).toBe(false);
  });

  it('should activate connection-based synergy when rooms are connected', () => {
    const before = synergyEvaluateAll(
      [makeFloor([mine, forge])],
      testSynergies,
    );
    expect(before.size).toBe(0);

    const conn: Connection = {
      id: 'conn-1',
      roomAId: 'placed-mine' as PlacedRoomId,
      roomBId: 'placed-forge' as PlacedRoomId,
      edgeTiles: [],
    };
    const after = synergyEvaluateAll(
      [makeFloor([mine, forge], [], [conn])],
      testSynergies,
    );
    expect(after.get('placed-mine')).toHaveLength(1);
    expect(after.get('placed-mine')![0].id).toBe('test-connected');
  });

  it('should deactivate connection-based synergy when disconnected', () => {
    const conn: Connection = {
      id: 'conn-1',
      roomAId: 'placed-mine' as PlacedRoomId,
      roomBId: 'placed-forge' as PlacedRoomId,
      edgeTiles: [],
    };
    const connected = synergyEvaluateAll(
      [makeFloor([mine, forge], [], [conn])],
      testSynergies,
    );
    expect(connected.get('placed-mine')).toHaveLength(1);

    // Remove connection
    const disconnected = synergyEvaluateAll(
      [makeFloor([mine, forge])],
      testSynergies,
    );
    expect(disconnected.has('placed-mine')).toBe(false);
  });

  it('should deactivate synergy when adjacent room is removed', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const withForge = synergyEvaluateAll(
      [makeFloor([mine, forge], inhabitants)],
      testSynergies,
    );
    expect(withForge.get('placed-mine')).toHaveLength(1);

    // Remove forge
    const withoutForge = synergyEvaluateAll(
      [makeFloor([mine], inhabitants)],
      testSynergies,
    );
    expect(withoutForge.has('placed-mine')).toBe(false);
  });
});

describe('synergyFormatEffect', () => {
  it('should format production bonus with resource', () => {
    const result = synergyFormatEffect({
      type: 'productionBonus',
      value: 0.15,
      resource: 'crystals',
    });
    expect(result).toBe('+15% crystals production');
  });

  it('should format production bonus without resource', () => {
    const result = synergyFormatEffect({
      type: 'productionBonus',
      value: 0.2,
    });
    expect(result).toBe('+20% production');
  });

  it('should format fear reduction', () => {
    const result = synergyFormatEffect({
      type: 'fearReduction',
      value: 5,
    });
    expect(result).toBe('-5 fear');
  });

  it('should round percentage correctly', () => {
    const result = synergyFormatEffect({
      type: 'productionBonus',
      value: 0.333,
      resource: 'gold',
    });
    expect(result).toBe('+33% gold production');
  });
});

describe('synergyGetPotentialForRoom', () => {
  const testSynergies: SynergyDefinition[] = [
    {
      id: 'test-mine-forge',
      name: 'Test Mine Forge',
      description: 'Mine near forge with creature worker',
      conditions: [
        { type: 'roomType', roomTypeId: 'room-crystal-mine' as RoomId },
        { type: 'adjacentRoomType', roomTypeId: 'room-dark-forge' as RoomId },
        { type: 'inhabitantType', inhabitantType: 'creature' },
      ],
      effects: [{ type: 'productionBonus', value: 0.15 }],
    },
    {
      id: 'test-forge-staff',
      name: 'Test Forge Staff',
      description: 'Forge with 2+ workers',
      conditions: [
        { type: 'roomType', roomTypeId: 'room-dark-forge' as RoomId },
        { type: 'minInhabitants', count: 2 },
      ],
      effects: [{ type: 'productionBonus', value: 0.1 }],
    },
    {
      id: 'test-library-well',
      name: 'Test Library Well',
      description: 'Library connected to well',
      conditions: [
        { type: 'roomType', roomTypeId: 'room-shadow-library' as RoomId },
        { type: 'connectedRoomType', roomTypeId: 'room-soul-well' as RoomId },
      ],
      effects: [{ type: 'productionBonus', value: 0.15, resource: 'research' }],
    },
  ];

  const mine: PlacedRoom = {
    id: 'placed-mine' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1',
    anchorX: 0,
    anchorY: 0,
  };

  const forge: PlacedRoom = {
    id: 'placed-forge' as PlacedRoomId,
    roomTypeId: 'room-dark-forge' as RoomId,
    shapeId: 'shape-1',
    anchorX: 2,
    anchorY: 0,
  };

  it('should return potential synergies with missing conditions', () => {
    // Mine exists but no forge adjacent and no creature worker
    const floor = makeFloor([mine]);
    const potentials = synergyGetPotentialForRoom(
      mine,
      floor,
      [],
      testSynergies,
    );
    expect(potentials).toHaveLength(1);
    expect(potentials[0].synergy.id).toBe('test-mine-forge');
    expect(potentials[0].missingConditions).toHaveLength(2);
    expect(potentials[0].missingConditions).toContain(
      'Place Dark Forge adjacent',
    );
    expect(potentials[0].missingConditions).toContain(
      'Assign a creature worker',
    );
  });

  it('should not return synergies for non-matching room types', () => {
    // Mine doesn't match forge-staff or library-well synergies
    const floor = makeFloor([mine]);
    const potentials = synergyGetPotentialForRoom(
      mine,
      floor,
      [],
      testSynergies,
    );
    const ids = potentials.map((p) => p.synergy.id);
    expect(ids).not.toContain('test-forge-staff');
    expect(ids).not.toContain('test-library-well');
  });

  it('should not return fully active synergies as potential', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine, forge], inhabitants);
    const potentials = synergyGetPotentialForRoom(
      mine,
      floor,
      ['placed-forge'],
      testSynergies,
    );
    const ids = potentials.map((p) => p.synergy.id);
    expect(ids).not.toContain('test-mine-forge');
  });

  it('should show remaining missing conditions when some are met', () => {
    // Mine with forge adjacent but no creature worker
    const floor = makeFloor([mine, forge]);
    const potentials = synergyGetPotentialForRoom(
      mine,
      floor,
      ['placed-forge'],
      testSynergies,
    );
    expect(potentials).toHaveLength(1);
    expect(potentials[0].synergy.id).toBe('test-mine-forge');
    expect(potentials[0].missingConditions).toHaveLength(1);
    expect(potentials[0].missingConditions[0]).toBe(
      'Assign a creature worker',
    );
  });

  it('should describe connected room type conditions', () => {
    const library: PlacedRoom = {
      id: 'placed-library' as PlacedRoomId,
      roomTypeId: 'room-shadow-library' as RoomId,
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([library]);
    const potentials = synergyGetPotentialForRoom(
      library,
      floor,
      [],
      testSynergies,
    );
    expect(potentials).toHaveLength(1);
    expect(potentials[0].synergy.id).toBe('test-library-well');
    expect(potentials[0].missingConditions[0]).toBe(
      'Connect to Soul Well',
    );
  });

  it('should describe minInhabitants conditions', () => {
    const floor = makeFloor([forge]);
    const potentials = synergyGetPotentialForRoom(
      forge,
      floor,
      [],
      testSynergies,
    );
    expect(potentials).toHaveLength(1);
    expect(potentials[0].synergy.id).toBe('test-forge-staff');
    expect(potentials[0].missingConditions[0]).toBe(
      'Assign 2+ inhabitants',
    );
  });
});
