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
    adjacencyBonuses: [
      { adjacentRoomType: 'room-dark-forge', bonus: 0.1 },
    ],
  });
  entries.set('room-throne', {
    id: 'room-throne',
    name: 'Throne Room',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { gold: 0.5 },
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

  entries.set('room-dark-forge', {
    id: 'room-dark-forge',
    name: 'Dark Forge',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { gold: 1.2 },
    requiresWorkers: true,
    adjacencyBonuses: [
      { adjacentRoomType: 'room-crystal-mine', bonus: 0.15 },
    ],
  });

  entries.set('def-goblin', {
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
    traits: [
      {
        id: 'trait-goblin-miner',
        name: 'Miner',
        description: '',
        effectType: 'production_bonus',
        effectValue: 0.2,
      },
    ],
  });
  entries.set('def-myconid', {
    id: 'def-myconid',
    name: 'Myconid',
    __type: 'inhabitant',
    type: 'fungal',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 25,
      attack: 5,
      defense: 10,
      speed: 8,
      workerEfficiency: 1.3,
    },
    traits: [
      {
        id: 'trait-myconid-farmer',
        name: 'Farmer',
        description: '',
        effectType: 'production_bonus',
        effectValue: 0.15,
      },
    ],
  });
  entries.set('def-skeleton', {
    id: 'def-skeleton',
    name: 'Skeleton',
    __type: 'inhabitant',
    type: 'undead',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 40,
      attack: 12,
      defense: 15,
      speed: 6,
      workerEfficiency: 0.7,
    },
    traits: [
      {
        id: 'trait-skeleton-guardian',
        name: 'Guardian',
        description: '',
        effectType: 'defense_bonus',
        effectValue: 0.3,
      },
    ],
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
    getEntry: vi.fn((id: string) => entries.get(id)),
    getEntriesByType: vi.fn(() => []),
    getEntries: vi.fn(),
    allIdsByName: vi.fn(() => new Map()),
  };
});

import type {
  Floor,
  GameState,
  InhabitantInstance,
  PlacedRoom,
} from '@interfaces';
import {
  calculateAdjacencyBonus,
  calculateConditionalModifiers,
  calculateInhabitantBonus,
  calculateTotalProduction,
  getBaseProduction,
  getRoomDefinition,
  processProduction,
} from '@helpers/production';

describe('getBaseProduction', () => {
  it('should return production for a room type with production', () => {
    const production = getBaseProduction('room-crystal-mine');
    expect(production).toEqual({ crystals: 1.0 });
  });

  it('should return production for throne room', () => {
    const production = getBaseProduction('room-throne');
    expect(production).toEqual({ gold: 0.5 });
  });

  it('should return empty object for room with no production', () => {
    const production = getBaseProduction('room-barracks');
    expect(production).toEqual({});
  });

  it('should return empty object for non-existent room type', () => {
    const production = getBaseProduction('room-nonexistent');
    expect(production).toEqual({});
  });
});

describe('getRoomDefinition', () => {
  it('should return room definition for valid id', () => {
    const room = getRoomDefinition('room-crystal-mine');
    expect(room).toBeDefined();
    expect(room!.name).toBe('Crystal Mine');
    expect(room!.requiresWorkers).toBe(true);
  });

  it('should return undefined for non-existent id', () => {
    const room = getRoomDefinition('room-nonexistent');
    expect(room).toBeUndefined();
  });
});

describe('calculateInhabitantBonus', () => {
  const placedRoom: PlacedRoom = {
    id: 'placed-room-1',
    roomTypeId: 'room-crystal-mine',
    shapeId: 'shape-1',
    anchorX: 0,
    anchorY: 0,
  };

  it('should return 0 bonus and hasWorkers false when no inhabitants assigned', () => {
    const result = calculateInhabitantBonus(placedRoom, []);
    expect(result.bonus).toBe(0);
    expect(result.hasWorkers).toBe(false);
  });

  it('should return 0 bonus and hasWorkers false when inhabitants are assigned to other rooms', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-other',
      },
    ];
    const result = calculateInhabitantBonus(placedRoom, inhabitants);
    expect(result.bonus).toBe(0);
    expect(result.hasWorkers).toBe(false);
  });

  it('should calculate bonus for one inhabitant with production_bonus trait', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateInhabitantBonus(placedRoom, inhabitants);
    // Goblin: workerEfficiency 1.0 → (1.0 - 1.0) = 0, plus production_bonus 0.2 = 0.2
    expect(result.bonus).toBeCloseTo(0.2);
    expect(result.hasWorkers).toBe(true);
  });

  it('should sum bonuses additively for multiple inhabitants', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
      {
        instanceId: 'inst-2',
        definitionId: 'def-goblin',
        name: 'Goblin 2',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateInhabitantBonus(placedRoom, inhabitants);
    // Two Goblins: (0 + 0.2) * 2 = 0.4
    expect(result.bonus).toBeCloseTo(0.4);
    expect(result.hasWorkers).toBe(true);
  });

  it('should handle inhabitants with different efficiency values', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
      {
        instanceId: 'inst-2',
        definitionId: 'def-myconid',
        name: 'Myconid 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateInhabitantBonus(placedRoom, inhabitants);
    // Goblin: (1.0-1.0) + 0.2 = 0.2
    // Myconid: (1.3-1.0) + 0.15 = 0.45
    // Total: 0.65
    expect(result.bonus).toBeCloseTo(0.65);
    expect(result.hasWorkers).toBe(true);
  });

  it('should include workerEfficiency below 1.0 as negative bonus', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-skeleton',
        name: 'Skeleton 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateInhabitantBonus(placedRoom, inhabitants);
    // Skeleton: (0.7-1.0) = -0.3, no production_bonus trait (defense_bonus ignored)
    expect(result.bonus).toBeCloseTo(-0.3);
    expect(result.hasWorkers).toBe(true);
  });

  it('should ignore non-production_bonus traits', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-skeleton',
        name: 'Skeleton 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateInhabitantBonus(placedRoom, inhabitants);
    // Skeleton has defense_bonus trait, not production_bonus — should be ignored
    // Only workerEfficiency contributes: (0.7 - 1.0) = -0.3
    expect(result.bonus).toBeCloseTo(-0.3);
  });

  it('should skip inhabitants with unknown definitions', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-nonexistent',
        name: 'Unknown',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateInhabitantBonus(placedRoom, inhabitants);
    // Unknown definition is skipped, but inhabitant was assigned so hasWorkers is true
    expect(result.bonus).toBe(0);
    expect(result.hasWorkers).toBe(true);
  });
});

describe('calculateAdjacencyBonus', () => {
  const crystalMine: PlacedRoom = {
    id: 'placed-mine-1',
    roomTypeId: 'room-crystal-mine',
    shapeId: 'shape-1',
    anchorX: 0,
    anchorY: 0,
  };

  const darkForge: PlacedRoom = {
    id: 'placed-forge-1',
    roomTypeId: 'room-dark-forge',
    shapeId: 'shape-1',
    anchorX: 2,
    anchorY: 0,
  };

  const throne: PlacedRoom = {
    id: 'placed-throne-1',
    roomTypeId: 'room-throne',
    shapeId: 'shape-1',
    anchorX: 4,
    anchorY: 0,
  };

  const barracks: PlacedRoom = {
    id: 'placed-barracks-1',
    roomTypeId: 'room-barracks',
    shapeId: 'shape-1',
    anchorX: 6,
    anchorY: 0,
  };

  const allRooms = [crystalMine, darkForge, throne, barracks];

  it('should return 0 when room has no adjacency bonus rules', () => {
    const bonus = calculateAdjacencyBonus(throne, ['placed-mine-1'], allRooms);
    expect(bonus).toBe(0);
  });

  it('should return 0 when room has no adjacent rooms', () => {
    const bonus = calculateAdjacencyBonus(crystalMine, [], allRooms);
    expect(bonus).toBe(0);
  });

  it('should return bonus when adjacent to a matching room type', () => {
    // Crystal Mine gets +10% when adjacent to Dark Forge
    const bonus = calculateAdjacencyBonus(
      crystalMine,
      ['placed-forge-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.1);
  });

  it('should return 0 when adjacent rooms do not match bonus rules', () => {
    // Crystal Mine only has bonus for Dark Forge, not Throne Room
    const bonus = calculateAdjacencyBonus(
      crystalMine,
      ['placed-throne-1'],
      allRooms,
    );
    expect(bonus).toBe(0);
  });

  it('should stack bonuses additively for multiple matching adjacent rooms', () => {
    const secondForge: PlacedRoom = {
      id: 'placed-forge-2',
      roomTypeId: 'room-dark-forge',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 2,
    };
    const rooms = [...allRooms, secondForge];
    // Crystal Mine adjacent to two Dark Forges: 0.1 + 0.1 = 0.2
    const bonus = calculateAdjacencyBonus(
      crystalMine,
      ['placed-forge-1', 'placed-forge-2'],
      rooms,
    );
    expect(bonus).toBeCloseTo(0.2);
  });

  it('should work for Dark Forge adjacent to Crystal Mine', () => {
    // Dark Forge gets +15% when adjacent to Crystal Mine
    const bonus = calculateAdjacencyBonus(
      darkForge,
      ['placed-mine-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should return 0 for non-existent room type definition', () => {
    const unknownRoom: PlacedRoom = {
      id: 'placed-unknown-1',
      roomTypeId: 'room-nonexistent',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const bonus = calculateAdjacencyBonus(
      unknownRoom,
      ['placed-forge-1'],
      allRooms,
    );
    expect(bonus).toBe(0);
  });
});

describe('calculateConditionalModifiers', () => {
  const placedRoom: PlacedRoom = {
    id: 'placed-room-1',
    roomTypeId: 'room-crystal-mine',
    shapeId: 'shape-1',
    anchorX: 0,
    anchorY: 0,
  };

  it('should return 1.0 when no inhabitants are assigned', () => {
    const result = calculateConditionalModifiers(placedRoom, []);
    expect(result).toBe(1.0);
  });

  it('should return 1.0 when all assigned inhabitants are normal', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
      {
        instanceId: 'inst-2',
        definitionId: 'def-goblin',
        name: 'Goblin 2',
        state: 'normal',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateConditionalModifiers(placedRoom, inhabitants);
    expect(result).toBe(1.0);
  });

  it('should return 0.5 when any assigned inhabitant is scared', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'scared',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateConditionalModifiers(placedRoom, inhabitants);
    expect(result).toBe(0.5);
  });

  it('should return 0.75 when any assigned inhabitant is hungry', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'hungry',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateConditionalModifiers(placedRoom, inhabitants);
    expect(result).toBe(0.75);
  });

  it('should multiply modifiers when both scared and hungry inhabitants present', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'scared',
        assignedRoomId: 'placed-room-1',
      },
      {
        instanceId: 'inst-2',
        definitionId: 'def-goblin',
        name: 'Goblin 2',
        state: 'hungry',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateConditionalModifiers(placedRoom, inhabitants);
    // scared (0.5) * hungry (0.75) = 0.375
    expect(result).toBeCloseTo(0.375);
  });

  it('should not double-count the same state from multiple inhabitants', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'scared',
        assignedRoomId: 'placed-room-1',
      },
      {
        instanceId: 'inst-2',
        definitionId: 'def-goblin',
        name: 'Goblin 2',
        state: 'scared',
        assignedRoomId: 'placed-room-1',
      },
    ];
    const result = calculateConditionalModifiers(placedRoom, inhabitants);
    // Two scared inhabitants, but scared modifier only applies once: 0.5
    expect(result).toBe(0.5);
  });

  it('should ignore inhabitants assigned to other rooms', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'scared',
        assignedRoomId: 'placed-room-other',
      },
    ];
    const result = calculateConditionalModifiers(placedRoom, inhabitants);
    expect(result).toBe(1.0);
  });
});

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
  };
}

function makeGameState(
  floors: Floor[],
  resources?: Partial<GameState['world']['resources']>,
): GameState {
  const defaultResource = { current: 0, max: 1000 };
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test' as GameState['gameId'],
    clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 0, minute: 0 },
    world: {
      grid: { tiles: [] } as unknown as GameState['world']['grid'],
      resources: {
        crystals: { ...defaultResource },
        food: { ...defaultResource },
        gold: { ...defaultResource },
        flux: { ...defaultResource },
        research: { ...defaultResource },
        essence: { ...defaultResource },
        corruption: { ...defaultResource },
        ...resources,
      },
      inhabitants: [],
      hallways: [],
      season: {
        currentSeason: 'growth',
        dayInSeason: 1,
        totalSeasonCycles: 0,
      },
      research: {
        completedNodes: [],
        activeResearch: null,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
      },
      reputation: {
        terror: 0,
        wealth: 0,
        knowledge: 0,
        harmony: 0,
        chaos: 0,
      },
      floors,
      currentFloorIndex: 0,
    },
  };
}

describe('calculateTotalProduction', () => {
  it('should return empty production when no floors have rooms', () => {
    const floor = makeFloor([]);
    const production = calculateTotalProduction([floor]);
    expect(production).toEqual({});
  });

  it('should return base production for a passive room with no workers', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne',
      roomTypeId: 'room-throne',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([throne]);
    const production = calculateTotalProduction([floor]);
    expect(production).toEqual({ gold: 0.5 });
  });

  it('should return 0 for worker room with no inhabitants', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([mine]);
    const production = calculateTotalProduction([floor]);
    expect(production).toEqual({});
  });

  it('should produce for worker room with assigned inhabitant', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine',
      },
    ];
    const floor = makeFloor([mine], inhabitants);
    const production = calculateTotalProduction([floor]);
    // Base 1.0 * (1 + 0.2 goblin bonus) * 1.0 modifier = 1.2
    expect(production['crystals']).toBeCloseTo(1.2);
  });

  it('should sum production across multiple rooms', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne',
      roomTypeId: 'room-throne',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const throne2: PlacedRoom = {
      id: 'placed-throne-2',
      roomTypeId: 'room-throne',
      shapeId: 'shape-1',
      anchorX: 4,
      anchorY: 0,
    };
    const floor = makeFloor([throne, throne2]);
    const production = calculateTotalProduction([floor]);
    // Two thrones: 0.5 + 0.5 = 1.0 gold
    expect(production['gold']).toBeCloseTo(1.0);
  });

  it('should apply adjacency bonus when rooms are adjacent', () => {
    // Place mine at (0,0) and forge at (2,0) — shape-1 is 2x1
    // Mine tiles: (0,0),(1,0); Forge tiles: (2,0),(3,0)
    // Mine tile (1,0) is adjacent to Forge tile (2,0)
    const mine: PlacedRoom = {
      id: 'placed-mine',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const forge: PlacedRoom = {
      id: 'placed-forge',
      roomTypeId: 'room-dark-forge',
      shapeId: 'shape-1',
      anchorX: 2,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-skeleton',
        name: 'Skeleton',
        state: 'normal',
        assignedRoomId: 'placed-mine',
      },
      {
        instanceId: 'inst-2',
        definitionId: 'def-skeleton',
        name: 'Skeleton 2',
        state: 'normal',
        assignedRoomId: 'placed-forge',
      },
    ];
    const floor = makeFloor([mine, forge], inhabitants);
    const production = calculateTotalProduction([floor]);
    // Mine: base 1.0 * (1 + (-0.3 skeleton) + 0.1 adj) * 1.0 = 1.0 * 0.8 = 0.8
    // Forge: base 1.2 * (1 + (-0.3 skeleton) + 0.15 adj) * 1.0 = 1.2 * 0.85 = 1.02
    expect(production['crystals']).toBeCloseTo(0.8);
    expect(production['gold']).toBeCloseTo(1.02);
  });
});

describe('processProduction', () => {
  it('should add production to resources', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne',
      roomTypeId: 'room-throne',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([throne]);
    const state = makeGameState([floor]);
    processProduction(state);
    // Throne produces 0.5 gold
    expect(state.world.resources.gold.current).toBeCloseTo(0.5);
  });

  it('should cap resources at max', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne',
      roomTypeId: 'room-throne',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([throne]);
    const state = makeGameState([floor], { gold: { current: 999.8, max: 1000 } });
    processProduction(state);
    // Should cap at 1000, not 1000.3
    expect(state.world.resources.gold.current).toBe(1000);
  });

  it('should not modify resources for rooms with no production', () => {
    const barracks: PlacedRoom = {
      id: 'placed-barracks',
      roomTypeId: 'room-barracks',
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([barracks]);
    const state = makeGameState([floor]);
    processProduction(state);
    expect(state.world.resources.gold.current).toBe(0);
    expect(state.world.resources.crystals.current).toBe(0);
  });
});
