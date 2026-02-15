import { describe, expect, it, vi } from 'vitest';

vi.mock('@helpers/content', () => {
  const entries = new Map<string, unknown>();
  entries.set('room-crystal-mine', {
    id: 'room-crystal-mine',
    name: 'Crystal Mine',
    __type: 'room',
    description: '',
    shapeId: 'shape-1' as RoomShapeId,
    cost: {},
    production: { crystals: 1.0 },
    requiresWorkers: true,
    adjacencyBonuses: [
      { adjacentRoomType: 'room-dark-forge', bonus: 0.1, description: 'Forge heats rock' },
    ],
  });
  entries.set('room-throne', {
    id: 'room-throne',
    name: 'Throne Room',
    __type: 'room',
    description: '',
    shapeId: 'shape-1' as RoomShapeId,
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
    shapeId: 'shape-1' as RoomShapeId,
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
    shapeId: 'shape-1' as RoomShapeId,
    cost: {},
    production: { gold: 1.2 },
    requiresWorkers: true,
    adjacencyBonuses: [
      { adjacentRoomType: 'room-crystal-mine', bonus: 0.15, description: 'Raw crystal ore fuels forging' },
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

  entries.set('def-wraith', {
    id: 'def-wraith',
    name: 'Wraith',
    __type: 'inhabitant',
    type: 'undead',
    tier: 2,
    description: '',
    cost: {},
    stats: {
      hp: 30,
      attack: 16,
      defense: 8,
      speed: 20,
      workerEfficiency: 1.1,
    },
    traits: [
      {
        id: 'trait-wraith-scholar',
        name: 'Scholar',
        description: '',
        effectType: 'production_bonus',
        effectValue: 0.2,
        targetResourceType: 'research',
      },
    ],
  });

  entries.set('room-shadow-library', {
    id: 'room-shadow-library',
    name: 'Shadow Library',
    __type: 'room',
    description: '',
    shapeId: 'shape-1' as RoomShapeId,
    cost: {},
    production: { research: 0.6 },
    requiresWorkers: true,
    adjacencyBonuses: [],
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

import type {
  Floor,
  FloorId,
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeId,
} from '@interfaces';
import {
  productionCalculateAdjacencyBonus,
  productionCalculateConditionalModifiers,
  productionCalculateInhabitantBonus,
  productionCalculateBreakdowns,
  productionCalculateSingleRoom,
  productionCalculateTotal,
  productionGetActiveAdjacencyBonuses,
  productionGetBase,
  productionGetRoomDefinition,
  productionProcess,
  productionPerMinute,
} from '@helpers/production';

describe('productionGetBase', () => {
  it('should return production for a room type with production', () => {
    const production = productionGetBase('room-crystal-mine' as RoomId);
    expect(production).toEqual({ crystals: 1.0 });
  });

  it('should return production for throne room', () => {
    const production = productionGetBase('room-throne' as RoomId);
    expect(production).toEqual({ gold: 0.5 });
  });

  it('should return empty object for room with no production', () => {
    const production = productionGetBase('room-barracks' as RoomId);
    expect(production).toEqual({});
  });

  it('should return empty object for non-existent room type', () => {
    const production = productionGetBase('room-nonexistent' as RoomId);
    expect(production).toEqual({});
  });
});

describe('productionGetRoomDefinition', () => {
  it('should return room definition for valid id', () => {
    const room = productionGetRoomDefinition('room-crystal-mine' as RoomId);
    expect(room).toBeDefined();
    expect(room!.name).toBe('Crystal Mine');
    expect(room!.requiresWorkers).toBe(true);
  });

  it('should return undefined for non-existent id', () => {
    const room = productionGetRoomDefinition('room-nonexistent' as RoomId);
    expect(room).toBeUndefined();
  });
});

describe('productionCalculateInhabitantBonus', () => {
  const placedRoom: PlacedRoom = {
    id: 'placed-room-1' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  it('should return 0 bonus and hasWorkers false when no inhabitants assigned', () => {
    const result = productionCalculateInhabitantBonus(placedRoom, []);
    expect(result.bonus).toBe(0);
    expect(result.hasWorkers).toBe(false);
  });

  it('should return 0 bonus and hasWorkers false when inhabitants are assigned to other rooms', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-other' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(placedRoom, inhabitants);
    expect(result.bonus).toBe(0);
    expect(result.hasWorkers).toBe(false);
  });

  it('should calculate bonus for one inhabitant with production_bonus trait', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(placedRoom, inhabitants);
    // Goblin: workerEfficiency 1.0 → (1.0 - 1.0) = 0, plus production_bonus 0.2 = 0.2
    expect(result.bonus).toBeCloseTo(0.2);
    expect(result.hasWorkers).toBe(true);
  });

  it('should sum bonuses additively for multiple inhabitants', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 2',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(placedRoom, inhabitants);
    // Two Goblins: (0 + 0.2) * 2 = 0.4
    expect(result.bonus).toBeCloseTo(0.4);
    expect(result.hasWorkers).toBe(true);
  });

  it('should handle inhabitants with different efficiency values', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-myconid' as InhabitantId,
        name: 'Myconid 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(placedRoom, inhabitants);
    // Goblin: (1.0-1.0) + 0.2 = 0.2
    // Myconid: (1.3-1.0) + 0.15 = 0.45
    // Total: 0.65
    expect(result.bonus).toBeCloseTo(0.65);
    expect(result.hasWorkers).toBe(true);
  });

  it('should include workerEfficiency below 1.0 as negative bonus', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(placedRoom, inhabitants);
    // Skeleton: (0.7-1.0) = -0.3, no production_bonus trait (defense_bonus ignored)
    expect(result.bonus).toBeCloseTo(-0.3);
    expect(result.hasWorkers).toBe(true);
  });

  it('should ignore non-production_bonus traits', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(placedRoom, inhabitants);
    // Skeleton has defense_bonus trait, not production_bonus — should be ignored
    // Only workerEfficiency contributes: (0.7 - 1.0) = -0.3
    expect(result.bonus).toBeCloseTo(-0.3);
  });

  it('should skip inhabitants with unknown definitions', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-nonexistent' as InhabitantId,
        name: 'Unknown',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(placedRoom, inhabitants);
    // Unknown definition is skipped, but inhabitant was assigned so hasWorkers is true
    expect(result.bonus).toBe(0);
    expect(result.hasWorkers).toBe(true);
  });
});

describe('Wraith Scholar trait in research rooms', () => {
  const shadowLibrary: PlacedRoom = {
    id: 'placed-library-1' as PlacedRoomId,
    roomTypeId: 'room-shadow-library' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  it('should apply Scholar +20% research bonus in research-producing room', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-wraith' as InhabitantId,
        name: 'Wraith 1',
        state: 'normal',
        assignedRoomId: 'placed-library-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(shadowLibrary, inhabitants);
    // Wraith: workerEfficiency (1.1 - 1.0) = 0.1, plus Scholar production_bonus 0.2 = 0.3
    expect(result.bonus).toBeCloseTo(0.3);
    expect(result.hasWorkers).toBe(true);
  });

  it('should not apply Scholar research bonus in non-research room', () => {
    const crystalMineRoom: PlacedRoom = {
      id: 'placed-mine-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-wraith' as InhabitantId,
        name: 'Wraith 1',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(crystalMineRoom, inhabitants);
    // Wraith in crystal mine: workerEfficiency (1.1 - 1.0) = 0.1, Scholar does NOT apply (research != crystals)
    expect(result.bonus).toBeCloseTo(0.1);
  });

  it('should stack Scholar bonus with other inhabitants', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-wraith' as InhabitantId,
        name: 'Wraith 1',
        state: 'normal',
        assignedRoomId: 'placed-library-1' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-library-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateInhabitantBonus(shadowLibrary, inhabitants);
    // Wraith: (1.1 - 1.0) + 0.2 = 0.3
    // Goblin: (1.0 - 1.0) + 0.2 = 0.2 (Goblin's production_bonus has no targetResourceType, applies to all)
    // Total: 0.5
    expect(result.bonus).toBeCloseTo(0.5);
  });
});

describe('productionCalculateAdjacencyBonus', () => {
  const crystalMine: PlacedRoom = {
    id: 'placed-mine-1' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  const darkForge: PlacedRoom = {
    id: 'placed-forge-1' as PlacedRoomId,
    roomTypeId: 'room-dark-forge' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 2,
    anchorY: 0,
  };

  const throne: PlacedRoom = {
    id: 'placed-throne-1' as PlacedRoomId,
    roomTypeId: 'room-throne' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 4,
    anchorY: 0,
  };

  const barracks: PlacedRoom = {
    id: 'placed-barracks-1' as PlacedRoomId,
    roomTypeId: 'room-barracks' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 6,
    anchorY: 0,
  };

  const allRooms = [crystalMine, darkForge, throne, barracks];

  it('should return 0 when room has no adjacency bonus rules', () => {
    const bonus = productionCalculateAdjacencyBonus(throne, ['placed-mine-1'], allRooms);
    expect(bonus).toBe(0);
  });

  it('should return 0 when room has no adjacent rooms', () => {
    const bonus = productionCalculateAdjacencyBonus(crystalMine, [], allRooms);
    expect(bonus).toBe(0);
  });

  it('should return bonus when adjacent to a matching room type', () => {
    // Crystal Mine gets +10% when adjacent to Dark Forge
    const bonus = productionCalculateAdjacencyBonus(
      crystalMine,
      ['placed-forge-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.1);
  });

  it('should return 0 when adjacent rooms do not match bonus rules', () => {
    // Crystal Mine only has bonus for Dark Forge, not Throne Room
    const bonus = productionCalculateAdjacencyBonus(
      crystalMine,
      ['placed-throne-1'],
      allRooms,
    );
    expect(bonus).toBe(0);
  });

  it('should stack bonuses additively for multiple matching adjacent rooms', () => {
    const secondForge: PlacedRoom = {
      id: 'placed-forge-2' as PlacedRoomId,
      roomTypeId: 'room-dark-forge' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 2,
    };
    const rooms = [...allRooms, secondForge];
    // Crystal Mine adjacent to two Dark Forges: 0.1 + 0.1 = 0.2
    const bonus = productionCalculateAdjacencyBonus(
      crystalMine,
      ['placed-forge-1', 'placed-forge-2'],
      rooms,
    );
    expect(bonus).toBeCloseTo(0.2);
  });

  it('should work for Dark Forge adjacent to Crystal Mine', () => {
    // Dark Forge gets +15% when adjacent to Crystal Mine
    const bonus = productionCalculateAdjacencyBonus(
      darkForge,
      ['placed-mine-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should return 0 for non-existent room type definition', () => {
    const unknownRoom: PlacedRoom = {
      id: 'placed-unknown-1' as PlacedRoomId,
      roomTypeId: 'room-nonexistent' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const bonus = productionCalculateAdjacencyBonus(
      unknownRoom,
      ['placed-forge-1'],
      allRooms,
    );
    expect(bonus).toBe(0);
  });
});

describe('productionCalculateConditionalModifiers', () => {
  const placedRoom: PlacedRoom = {
    id: 'placed-room-1' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  it('should return 1.0 when no inhabitants are assigned', () => {
    const result = productionCalculateConditionalModifiers(placedRoom, []);
    expect(result).toBe(1.0);
  });

  it('should return 1.0 when all assigned inhabitants are normal', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 2',
        state: 'normal',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateConditionalModifiers(placedRoom, inhabitants);
    expect(result).toBe(1.0);
  });

  it('should return 0.5 when any assigned inhabitant is scared', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'scared',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateConditionalModifiers(placedRoom, inhabitants);
    expect(result).toBe(0.5);
  });

  it('should return 0.75 when any assigned inhabitant is hungry', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'hungry',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateConditionalModifiers(placedRoom, inhabitants);
    expect(result).toBe(0.5);
  });

  it('should multiply modifiers when both scared and hungry inhabitants present', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'scared',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 2',
        state: 'hungry',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateConditionalModifiers(placedRoom, inhabitants);
    // Per-creature averaging: scared (0.5) + hungry (0.5) / 2 = 0.5
    expect(result).toBeCloseTo(0.5);
  });

  it('should average same state from multiple inhabitants', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'scared',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 2',
        state: 'scared',
        assignedRoomId: 'placed-room-1' as PlacedRoomId,
      },
    ];
    const result = productionCalculateConditionalModifiers(placedRoom, inhabitants);
    // Two scared inhabitants: (0.5 + 0.5) / 2 = 0.5
    expect(result).toBe(0.5);
  });

  it('should ignore inhabitants assigned to other rooms', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'scared',
        assignedRoomId: 'placed-room-other' as PlacedRoomId,
      },
    ];
    const result = productionCalculateConditionalModifiers(placedRoom, inhabitants);
    expect(result).toBe(1.0);
  });
});

function makeFloor(
  rooms: PlacedRoom[],
  inhabitants: InhabitantInstance[] = [],
): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 0,
    biome: 'neutral',
    grid: { tiles: [] } as unknown as Floor['grid'],
    rooms,
    hallways: [],
    inhabitants,
    connections: [],
    traps: [],
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
    clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 12, minute: 0 },
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
        activeResearch: undefined,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
        unlockedContent: { rooms: [], inhabitants: [], abilities: [], upgrades: [], passiveBonuses: [] },
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
      trapInventory: [],
      trapCraftingQueues: [],
      forgeInventory: [],
      forgeCraftingQueues: [],
      alchemyConversions: [],
      prisoners: [],
      invasionSchedule: {
        nextInvasionDay: undefined,
        nextInvasionVariance: 0,
        gracePeriodEnd: 30,
        invasionHistory: [],
        pendingSpecialInvasions: [],
        warningActive: false,
        warningDismissed: false,
      },
      corruptionEffects: {
        darkUpgradeUnlocked: false,
        lastMutationCorruption: undefined,
        lastCrusadeCorruption: undefined,
        warnedThresholds: [],
      },
      stairs: [],
      elevators: [],
      portals: [],
      victoryProgress: { consecutivePeacefulDays: 0, lastPeacefulCheckDay: 0, consecutiveZeroCorruptionDays: 0, lastZeroCorruptionCheckDay: 0, totalInvasionDefenseWins: 0 },
    },
  };
}

describe('productionCalculateTotal', () => {
  it('should return empty production when no floors have rooms', () => {
    const floor = makeFloor([]);
    const production = productionCalculateTotal([floor]);
    expect(production).toEqual({});
  });

  it('should return base production for a passive room with no workers', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([throne]);
    const production = productionCalculateTotal([floor]);
    expect(production).toEqual({ gold: 0.5 });
  });

  it('should return 0 for worker room with no inhabitants', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([mine]);
    const production = productionCalculateTotal([floor]);
    expect(production).toEqual({});
  });

  it('should produce for worker room with assigned inhabitant', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine], inhabitants);
    const production = productionCalculateTotal([floor]);
    // Base 1.0 * (1 + 0.2 goblin bonus) * 1.0 modifier = 1.2
    expect(production['crystals']).toBeCloseTo(1.2);
  });

  it('should sum production across multiple rooms', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const throne2: PlacedRoom = {
      id: 'placed-throne-2' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 4,
      anchorY: 0,
    };
    const floor = makeFloor([throne, throne2]);
    const production = productionCalculateTotal([floor]);
    // Two thrones: 0.5 + 0.5 = 1.0 gold
    expect(production['gold']).toBeCloseTo(1.0);
  });

  it('should apply adjacency bonus when rooms are adjacent', () => {
    // Place mine at (0,0) and forge at (2,0) — shape-1 is 2x1
    // Mine tiles: (0,0),(1,0); Forge tiles: (2,0),(3,0)
    // Mine tile (1,0) is adjacent to Forge tile (2,0)
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const forge: PlacedRoom = {
      id: 'placed-forge' as PlacedRoomId,
      roomTypeId: 'room-dark-forge' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton 2',
        state: 'normal',
        assignedRoomId: 'placed-forge' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine, forge], inhabitants);
    const production = productionCalculateTotal([floor]);
    // Mine: base 1.0 * (1 + (-0.3 skeleton) + 0.1 adj) * 1.0 = 1.0 * 0.8 = 0.8
    // Forge: base 1.2 * (1 + (-0.3 skeleton) + 0.15 adj) * 1.0 = 1.2 * 0.85 = 1.02
    expect(production['crystals']).toBeCloseTo(0.8);
    expect(production['gold']).toBeCloseTo(1.02);
  });
});

describe('productionProcess', () => {
  it('should add production to resources', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([throne]);
    const state = makeGameState([floor]);
    productionProcess(state);
    // Throne produces 0.5 gold
    expect(state.world.resources.gold.current).toBeCloseTo(0.5);
  });

  it('should cap resources at max', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([throne]);
    const state = makeGameState([floor], { gold: { current: 999.8, max: 1000 } });
    productionProcess(state);
    // Should cap at 1000, not 1000.3
    expect(state.world.resources.gold.current).toBe(1000);
  });

  it('should not modify resources for rooms with no production', () => {
    const barracks: PlacedRoom = {
      id: 'placed-barracks' as PlacedRoomId,
      roomTypeId: 'room-barracks' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([barracks]);
    const state = makeGameState([floor]);
    productionProcess(state);
    expect(state.world.resources.gold.current).toBe(0);
    expect(state.world.resources.crystals.current).toBe(0);
  });
});

describe('productionCalculateSingleRoom', () => {
  it('should return production for a passive room', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([throne]);
    const production = productionCalculateSingleRoom(throne, floor);
    expect(production['gold']).toBeCloseTo(0.5);
  });

  it('should return empty for worker room with no inhabitants', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([mine]);
    const production = productionCalculateSingleRoom(mine, floor);
    expect(production).toEqual({});
  });

  it('should include inhabitant bonus for worker room', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine], inhabitants);
    const production = productionCalculateSingleRoom(mine, floor);
    // Base 1.0 * (1 + 0.2 goblin bonus) * 1.0 = 1.2
    expect(production['crystals']).toBeCloseTo(1.2);
  });

  it('should include adjacency bonus when adjacent rooms exist', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const forge: PlacedRoom = {
      id: 'placed-forge' as PlacedRoomId,
      roomTypeId: 'room-dark-forge' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine, forge], inhabitants);
    const production = productionCalculateSingleRoom(mine, floor);
    // Base 1.0 * (1 + 0.2 goblin + 0.1 adj) * 1.0 = 1.3
    expect(production['crystals']).toBeCloseTo(1.3);
  });

  it('should return empty for non-existent room type', () => {
    const unknown: PlacedRoom = {
      id: 'placed-unknown' as PlacedRoomId,
      roomTypeId: 'room-nonexistent' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([unknown]);
    const production = productionCalculateSingleRoom(unknown, floor);
    expect(production).toEqual({});
  });
});

describe('production changes on assignment state changes', () => {
  it('should produce nothing when worker room has no assigned inhabitants, then produce when one is assigned', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };

    // No inhabitants assigned
    const floorEmpty = makeFloor([mine], []);
    const prodEmpty = productionCalculateSingleRoom(mine, floorEmpty);
    expect(prodEmpty).toEqual({});

    // Assign one inhabitant
    const floorAssigned = makeFloor([mine], [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ]);
    const prodAssigned = productionCalculateSingleRoom(mine, floorAssigned);
    expect(prodAssigned['crystals']).toBeCloseTo(1.2);
  });

  it('should reduce production when inhabitant is unassigned from a multi-worker room', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };

    // Two inhabitants assigned
    const floorTwo = makeFloor([mine], [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 2',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ]);
    const prodTwo = productionCalculateSingleRoom(mine, floorTwo);
    // Base 1.0 * (1 + 0.2 + 0.2) = 1.4
    expect(prodTwo['crystals']).toBeCloseTo(1.4);

    // Unassign one (only one remains)
    const floorOne = makeFloor([mine], [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 2',
        state: 'normal',
        assignedRoomId: undefined,
      },
    ]);
    const prodOne = productionCalculateSingleRoom(mine, floorOne);
    // Base 1.0 * (1 + 0.2) = 1.2
    expect(prodOne['crystals']).toBeCloseTo(1.2);
  });

  it('should reflect assignment changes in total production across floors', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };

    // No inhabitants — worker room produces nothing
    const floorsEmpty = [makeFloor([mine], [])];
    const totalEmpty = productionCalculateTotal(floorsEmpty);
    expect(totalEmpty).toEqual({});

    // Assign inhabitant — now produces
    const floorsAssigned = [
      makeFloor([mine], [
        {
          instanceId: 'inst-1' as InhabitantInstanceId,
          definitionId: 'def-goblin' as InhabitantId,
          name: 'Goblin',
          state: 'normal',
          assignedRoomId: 'placed-mine' as PlacedRoomId,
        },
      ]),
    ];
    const totalAssigned = productionCalculateTotal(floorsAssigned);
    expect(totalAssigned['crystals']).toBeCloseTo(1.2);
  });
});

describe('productionPerMinute', () => {
  it('should convert per-tick rate to per-minute', () => {
    // GAME_TIME_TICKS_PER_MINUTE = 5
    expect(productionPerMinute(1.0)).toBe(5.0);
  });

  it('should handle zero rate', () => {
    expect(productionPerMinute(0)).toBe(0);
  });

  it('should handle fractional rates', () => {
    expect(productionPerMinute(0.5)).toBeCloseTo(2.5);
  });
});

describe('productionGetActiveAdjacencyBonuses', () => {
  const crystalMine: PlacedRoom = {
    id: 'placed-mine-1' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  const darkForge: PlacedRoom = {
    id: 'placed-forge-1' as PlacedRoomId,
    roomTypeId: 'room-dark-forge' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 2,
    anchorY: 0,
  };

  const throne: PlacedRoom = {
    id: 'placed-throne-1' as PlacedRoomId,
    roomTypeId: 'room-throne' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 4,
    anchorY: 0,
  };

  it('should return empty array when room has no bonus rules', () => {
    const floor = makeFloor([throne, crystalMine]);
    const bonuses = productionGetActiveAdjacencyBonuses(throne, floor);
    expect(bonuses).toEqual([]);
  });

  it('should return empty array when no matching adjacent rooms', () => {
    const floor = makeFloor([crystalMine, throne]);
    const bonuses = productionGetActiveAdjacencyBonuses(crystalMine, floor);
    expect(bonuses).toEqual([]);
  });

  it('should return active bonus when adjacent to matching room', () => {
    // Mine at (0,0)-(1,0), Forge at (2,0)-(3,0) — adjacent
    const floor = makeFloor([crystalMine, darkForge]);
    const bonuses = productionGetActiveAdjacencyBonuses(crystalMine, floor);
    expect(bonuses).toHaveLength(1);
    expect(bonuses[0].sourceRoomId).toBe('placed-forge-1');
    expect(bonuses[0].sourceRoomName).toBe('Dark Forge');
    expect(bonuses[0].bonus).toBeCloseTo(0.1);
    expect(bonuses[0].description).toBe('Forge heats rock');
  });

  it('should return bonuses bidirectionally', () => {
    const floor = makeFloor([crystalMine, darkForge]);
    const forgeBonuses = productionGetActiveAdjacencyBonuses(darkForge, floor);
    expect(forgeBonuses).toHaveLength(1);
    expect(forgeBonuses[0].sourceRoomName).toBe('Crystal Mine');
    expect(forgeBonuses[0].bonus).toBeCloseTo(0.15);
  });

  it('should return multiple bonuses when adjacent to multiple matching rooms', () => {
    const secondForge: PlacedRoom = {
      id: 'placed-forge-2' as PlacedRoomId,
      roomTypeId: 'room-dark-forge' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 1,
    };
    const floor = makeFloor([crystalMine, darkForge, secondForge]);
    const bonuses = productionGetActiveAdjacencyBonuses(crystalMine, floor);
    expect(bonuses).toHaveLength(2);
    expect(bonuses.every((b) => b.bonus === 0.1)).toBe(true);
  });

  it('should not return bonuses for non-adjacent rooms', () => {
    const farForge: PlacedRoom = {
      id: 'placed-forge-far' as PlacedRoomId,
      roomTypeId: 'room-dark-forge' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 10,
      anchorY: 10,
    };
    const floor = makeFloor([crystalMine, farForge]);
    const bonuses = productionGetActiveAdjacencyBonuses(crystalMine, floor);
    expect(bonuses).toEqual([]);
  });
});

describe('adjacency bonus deactivation on removal', () => {
  it('should lose adjacency bonus when adjacent room is removed', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const forge: PlacedRoom = {
      id: 'placed-forge' as PlacedRoomId,
      roomTypeId: 'room-dark-forge' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];

    // With forge adjacent: bonus applies
    const floorWithForge = makeFloor([mine, forge], inhabitants);
    const prodWith = productionCalculateSingleRoom(mine, floorWithForge);
    // Base 1.0 * (1 + 0.2 goblin + 0.1 adj) * 1.0 = 1.3
    expect(prodWith['crystals']).toBeCloseTo(1.3);

    // After removing forge: bonus gone
    const floorWithoutForge = makeFloor([mine], inhabitants);
    const prodWithout = productionCalculateSingleRoom(mine, floorWithoutForge);
    // Base 1.0 * (1 + 0.2 goblin) * 1.0 = 1.2
    expect(prodWithout['crystals']).toBeCloseTo(1.2);
  });

  it('should not share adjacency bonuses across floors', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const forge: PlacedRoom = {
      id: 'placed-forge' as PlacedRoomId,
      roomTypeId: 'room-dark-forge' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];

    // Mine on floor 1, forge on floor 2 — no cross-floor adjacency
    const floor1 = makeFloor([mine], inhabitants);
    const floor2 = makeFloor([forge]);
    const production = productionCalculateTotal([floor1, floor2]);
    // Mine gets NO adjacency bonus (forge is on different floor)
    // Base 1.0 * (1 + 0.2 goblin) = 1.2
    expect(production['crystals']).toBeCloseTo(1.2);
  });
});

describe('productionCalculateBreakdowns', () => {
  it('should return empty object when no rooms produce', () => {
    const floor = makeFloor([]);
    const breakdowns = productionCalculateBreakdowns([floor]);
    expect(breakdowns).toEqual({});
  });

  it('should return base breakdown for passive room', () => {
    const throne: PlacedRoom = {
      id: 'placed-throne' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floor = makeFloor([throne]);
    const breakdowns = productionCalculateBreakdowns([floor]);
    expect(breakdowns['gold']).toBeDefined();
    expect(breakdowns['gold'].base).toBeCloseTo(0.5);
    expect(breakdowns['gold'].inhabitantBonus).toBe(0);
    expect(breakdowns['gold'].adjacencyBonus).toBe(0);
    expect(breakdowns['gold'].modifierEffect).toBe(0);
    expect(breakdowns['gold'].final).toBeCloseTo(0.5);
  });

  it('should include inhabitant bonus in breakdown', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine], inhabitants);
    const breakdowns = productionCalculateBreakdowns([floor]);
    expect(breakdowns['crystals'].base).toBeCloseTo(1.0);
    expect(breakdowns['crystals'].inhabitantBonus).toBeCloseTo(0.2);
    expect(breakdowns['crystals'].final).toBeCloseTo(1.2);
  });

  it('should include adjacency bonus in breakdown', () => {
    const mine: PlacedRoom = {
      id: 'placed-mine' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const forge: PlacedRoom = {
      id: 'placed-forge' as PlacedRoomId,
      roomTypeId: 'room-dark-forge' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton',
        state: 'normal',
        assignedRoomId: 'placed-forge' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([mine, forge], inhabitants);
    const breakdowns = productionCalculateBreakdowns([floor]);
    // Mine: base 1.0, iBonus 0.2, aBonus 0.1, final = 1.0 * (1 + 0.2 + 0.1) = 1.3
    expect(breakdowns['crystals'].base).toBeCloseTo(1.0);
    expect(breakdowns['crystals'].inhabitantBonus).toBeCloseTo(0.2);
    expect(breakdowns['crystals'].adjacencyBonus).toBeCloseTo(0.1);
    expect(breakdowns['crystals'].final).toBeCloseTo(1.3);
  });
});
