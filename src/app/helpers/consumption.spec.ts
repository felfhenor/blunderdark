import { describe, expect, it, vi } from 'vitest';
import type {
  Floor,
  FloorId,
  InhabitantInstance,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { FeatureContent } from '@interfaces/content-feature';

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
  contentAllIdsByName: vi.fn(() => new Map()),
}));

vi.mock('@helpers/features', () => ({
  featureGetAllForRoom: (room: PlacedRoom) => {
    return (room.featureIds ?? [])
      .map((id: string) => mockContent.get(id))
      .filter(Boolean);
  },
}));

vi.mock('@helpers/room-upgrades', () => ({
  roomGetDisplayName: (room: PlacedRoom) => `Room-${room.id}`,
}));

vi.mock('@helpers/state-modifiers', () => ({
  stateModifierGetFoodConsumptionMultiplier: () => 1.0,
}));

import {
  consumptionCalculateBreakdowns,
  consumptionCalculateDetailedBreakdown,
  consumptionCalculateNonFoodTotals,
} from '@helpers/consumption';
import { HUNGER_TICKS_PER_HOUR } from '@helpers/hunger';

// --- Helpers ---

function makeInhabitant(
  id: string,
  definitionId: string,
  name = `Inhabitant-${id}`,
): InhabitantInstance {
  return {
    id,
    definitionId,
    name,
    state: 'normal' as InhabitantInstance['state'],
  } as InhabitantInstance;
}

function makeFloor(rooms: PlacedRoom[] = []): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: [],
    rooms,
    hallways: [],
    inhabitants: [],
    connections: [],
  } as Floor;
}

function makePlacedRoom(
  id: string,
  opts: Partial<PlacedRoom> = {},
): PlacedRoom {
  return {
    id: id as PlacedRoomId,
    roomTypeId: 'room-generic' as RoomId,
    shapeId: 'square-2x2' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...opts,
  } as PlacedRoom;
}

// --- Tests ---

describe('consumptionCalculateBreakdowns', () => {
  it('should return empty object for no inhabitants and no rooms', () => {
    const result = consumptionCalculateBreakdowns([], []);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should calculate food consumption for inhabitants with hunger', () => {
    mockContent.set('slime', {
      id: 'slime',
      name: 'Slime',
      foodConsumptionRate: 1.0,
    } as Partial<InhabitantContent>);

    const inhabitants = [makeInhabitant('i1', 'slime')];
    const result = consumptionCalculateBreakdowns([], inhabitants);

    expect(result['food']).toBeDefined();
    // Rate is 1.0 per hour, HUNGER_TICKS_PER_HOUR ticks per hour
    expect(result['food'].inhabitantFood).toBeCloseTo(1.0 / HUNGER_TICKS_PER_HOUR);
    expect(result['food'].total).toBeCloseTo(1.0 / HUNGER_TICKS_PER_HOUR);
    expect(result['food'].legendaryUpkeep).toBe(0);
    expect(result['food'].featureMaintenance).toBe(0);
  });

  it('should sum food consumption across multiple inhabitants', () => {
    mockContent.set('slime', {
      id: 'slime',
      name: 'Slime',
      foodConsumptionRate: 1.0,
    } as Partial<InhabitantContent>);
    mockContent.set('orc', {
      id: 'orc',
      name: 'Orc',
      foodConsumptionRate: 2.0,
    } as Partial<InhabitantContent>);

    const inhabitants = [
      makeInhabitant('i1', 'slime'),
      makeInhabitant('i2', 'orc'),
    ];
    const result = consumptionCalculateBreakdowns([], inhabitants);

    expect(result['food'].inhabitantFood).toBeCloseTo(3.0 / HUNGER_TICKS_PER_HOUR);
  });

  it('should skip inappetent inhabitants (rate 0)', () => {
    mockContent.set('ghost', {
      id: 'ghost',
      name: 'Ghost',
      foodConsumptionRate: 0,
    } as Partial<InhabitantContent>);

    const inhabitants = [makeInhabitant('i1', 'ghost')];
    const result = consumptionCalculateBreakdowns([], inhabitants);

    expect(result['food']).toBeUndefined();
  });

  it('should calculate legendary upkeep costs', () => {
    mockContent.set('dragon', {
      id: 'dragon',
      name: 'Dragon',
      foodConsumptionRate: 0,
      upkeepCost: { gold: 10, essence: 5 },
    } as Partial<InhabitantContent>);

    const inhabitants = [makeInhabitant('i1', 'dragon')];
    const result = consumptionCalculateBreakdowns([], inhabitants);

    // GAME_TIME_TICKS_PER_MINUTE = 1, so perTick = amountPerMinute / 1
    expect(result['gold']).toBeDefined();
    expect(result['gold'].legendaryUpkeep).toBe(10);
    expect(result['gold'].total).toBe(10);

    expect(result['essence']).toBeDefined();
    expect(result['essence'].legendaryUpkeep).toBe(5);
    expect(result['essence'].total).toBe(5);
  });

  it('should calculate feature maintenance costs when active', () => {
    const featureDef: Partial<FeatureContent> = {
      id: 'feat-1',
      name: 'Crystal Lamp',
      maintenanceCost: { flux: 2 },
    };
    mockContent.set('feat-1', featureDef);

    const room = makePlacedRoom('r1', {
      maintenanceActive: true,
      featureIds: ['feat-1'],
    } as Partial<PlacedRoom>);
    const floor = makeFloor([room]);

    const result = consumptionCalculateBreakdowns([floor], []);

    expect(result['flux']).toBeDefined();
    expect(result['flux'].featureMaintenance).toBe(2); // 2 / TICKS_PER_MINUTE(1)
    expect(result['flux'].total).toBe(2);
  });

  it('should skip feature maintenance when not active', () => {
    const featureDef: Partial<FeatureContent> = {
      id: 'feat-1',
      name: 'Crystal Lamp',
      maintenanceCost: { flux: 2 },
    };
    mockContent.set('feat-1', featureDef);

    const room = makePlacedRoom('r1', {
      featureIds: ['feat-1'],
    } as Partial<PlacedRoom>);
    const floor = makeFloor([room]);

    const result = consumptionCalculateBreakdowns([floor], []);

    expect(result['flux']).toBeUndefined();
  });

  it('should combine all three consumption sources', () => {
    mockContent.set('slime', {
      id: 'slime',
      name: 'Slime',
      foodConsumptionRate: 1.0,
      upkeepCost: { gold: 3 },
    } as Partial<InhabitantContent>);

    const featureDef: Partial<FeatureContent> = {
      id: 'feat-1',
      name: 'Gold Drain',
      maintenanceCost: { gold: 2 },
    };
    mockContent.set('feat-1', featureDef);

    const room = makePlacedRoom('r1', {
      maintenanceActive: true,
      featureIds: ['feat-1'],
    } as Partial<PlacedRoom>);
    const floor = makeFloor([room]);
    const inhabitants = [makeInhabitant('i1', 'slime')];

    const result = consumptionCalculateBreakdowns([floor], inhabitants);

    expect(result['gold'].legendaryUpkeep).toBe(3);
    expect(result['gold'].featureMaintenance).toBe(2);
    expect(result['gold'].total).toBe(5);
  });
});

describe('consumptionCalculateDetailedBreakdown', () => {
  it('should return empty array for no sources', () => {
    const result = consumptionCalculateDetailedBreakdown([], [], 'food');
    expect(result).toHaveLength(0);
  });

  it('should list food consumption per inhabitant', () => {
    mockContent.set('slime', {
      id: 'slime',
      name: 'Slime',
      foodConsumptionRate: 1.0,
    } as Partial<InhabitantContent>);

    const inhabitants = [
      makeInhabitant('i1', 'slime', 'Slime Alpha'),
      makeInhabitant('i2', 'slime', 'Slime Beta'),
    ];
    const result = consumptionCalculateDetailedBreakdown([], inhabitants, 'food');

    expect(result).toHaveLength(2);
    expect(result[0].sourceName).toBe('Slime Alpha');
    expect(result[0].category).toBe('feeding');
    expect(result[0].amount).toBeCloseTo(1.0 / HUNGER_TICKS_PER_HOUR);
    expect(result[1].sourceName).toBe('Slime Beta');
  });

  it('should not include food details for non-food resource type', () => {
    mockContent.set('slime', {
      id: 'slime',
      name: 'Slime',
      foodConsumptionRate: 1.0,
    } as Partial<InhabitantContent>);

    const inhabitants = [makeInhabitant('i1', 'slime')];
    const result = consumptionCalculateDetailedBreakdown([], inhabitants, 'gold');

    expect(result).toHaveLength(0);
  });

  it('should list legendary upkeep for matching resource type', () => {
    mockContent.set('dragon', {
      id: 'dragon',
      name: 'Dragon',
      foodConsumptionRate: 0,
      upkeepCost: { gold: 10, essence: 5 },
    } as Partial<InhabitantContent>);

    const inhabitants = [makeInhabitant('i1', 'dragon')];
    const goldResult = consumptionCalculateDetailedBreakdown(
      [],
      inhabitants,
      'gold',
    );

    expect(goldResult).toHaveLength(1);
    expect(goldResult[0].sourceName).toBe('Dragon');
    expect(goldResult[0].category).toBe('legendary_upkeep');
    expect(goldResult[0].amount).toBe(10);

    const essenceResult = consumptionCalculateDetailedBreakdown(
      [],
      inhabitants,
      'essence',
    );
    expect(essenceResult).toHaveLength(1);
    expect(essenceResult[0].amount).toBe(5);
  });

  it('should list feature maintenance for matching resource type', () => {
    const featureDef: Partial<FeatureContent> = {
      id: 'feat-1',
      name: 'Crystal Lamp',
      maintenanceCost: { flux: 2, gold: 1 },
    };
    mockContent.set('feat-1', featureDef);

    const room = makePlacedRoom('r1', {
      maintenanceActive: true,
      featureIds: ['feat-1'],
    } as Partial<PlacedRoom>);
    const floor = makeFloor([room]);

    const fluxResult = consumptionCalculateDetailedBreakdown(
      [floor],
      [],
      'flux',
    );
    expect(fluxResult).toHaveLength(1);
    expect(fluxResult[0].sourceName).toBe('Crystal Lamp');
    expect(fluxResult[0].category).toBe('feature_maintenance');
    expect(fluxResult[0].amount).toBe(2);
    expect(fluxResult[0].roomName).toBe('Room-r1');
  });
});

describe('consumptionCalculateNonFoodTotals', () => {
  it('should return empty object for no sources', () => {
    const result = consumptionCalculateNonFoodTotals([], []);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should aggregate legendary upkeep per resource type', () => {
    mockContent.set('dragon', {
      id: 'dragon',
      name: 'Dragon',
      foodConsumptionRate: 0,
      upkeepCost: { gold: 10, essence: 5 },
    } as Partial<InhabitantContent>);
    mockContent.set('phoenix', {
      id: 'phoenix',
      name: 'Phoenix',
      foodConsumptionRate: 0,
      upkeepCost: { gold: 3 },
    } as Partial<InhabitantContent>);

    const inhabitants = [
      makeInhabitant('i1', 'dragon'),
      makeInhabitant('i2', 'phoenix'),
    ];
    const result = consumptionCalculateNonFoodTotals([], inhabitants);

    expect(result['gold']).toBe(13);
    expect(result['essence']).toBe(5);
  });

  it('should aggregate feature maintenance per resource type', () => {
    const feat1: Partial<FeatureContent> = {
      id: 'feat-1',
      name: 'Crystal Lamp',
      maintenanceCost: { flux: 2 },
    };
    const feat2: Partial<FeatureContent> = {
      id: 'feat-2',
      name: 'Gold Drain',
      maintenanceCost: { flux: 1, gold: 3 },
    };
    mockContent.set('feat-1', feat1);
    mockContent.set('feat-2', feat2);

    const room1 = makePlacedRoom('r1', {
      maintenanceActive: true,
      featureIds: ['feat-1'],
    } as Partial<PlacedRoom>);
    const room2 = makePlacedRoom('r2', {
      maintenanceActive: true,
      featureIds: ['feat-2'],
    } as Partial<PlacedRoom>);
    const floor = makeFloor([room1, room2]);

    const result = consumptionCalculateNonFoodTotals([floor], []);

    expect(result['flux']).toBe(3);
    expect(result['gold']).toBe(3);
  });

  it('should combine upkeep and maintenance', () => {
    mockContent.set('dragon', {
      id: 'dragon',
      name: 'Dragon',
      foodConsumptionRate: 0,
      upkeepCost: { gold: 5 },
    } as Partial<InhabitantContent>);
    const feat: Partial<FeatureContent> = {
      id: 'feat-1',
      name: 'Gold Drain',
      maintenanceCost: { gold: 3 },
    };
    mockContent.set('feat-1', feat);

    const room = makePlacedRoom('r1', {
      maintenanceActive: true,
      featureIds: ['feat-1'],
    } as Partial<PlacedRoom>);
    const floor = makeFloor([room]);
    const inhabitants = [makeInhabitant('i1', 'dragon')];

    const result = consumptionCalculateNonFoodTotals([floor], inhabitants);

    expect(result['gold']).toBe(8);
  });

  it('should skip inactive maintenance rooms', () => {
    const feat: Partial<FeatureContent> = {
      id: 'feat-1',
      name: 'Crystal Lamp',
      maintenanceCost: { flux: 5 },
    };
    mockContent.set('feat-1', feat);

    const room = makePlacedRoom('r1', {
      featureIds: ['feat-1'],
      // maintenanceActive is NOT set (undefined/false)
    } as Partial<PlacedRoom>);
    const floor = makeFloor([room]);

    const result = consumptionCalculateNonFoodTotals([floor], []);

    expect(result['flux']).toBeUndefined();
  });
});
