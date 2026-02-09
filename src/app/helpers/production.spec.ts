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

  return {
    getEntry: vi.fn((id: string) => entries.get(id)),
    getEntries: vi.fn(),
    allIdsByName: vi.fn(() => new Map()),
  };
});

import type { InhabitantInstance, PlacedRoom } from '@interfaces';
import {
  calculateAdjacencyBonus,
  calculateInhabitantBonus,
  getBaseProduction,
  getRoomDefinition,
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
