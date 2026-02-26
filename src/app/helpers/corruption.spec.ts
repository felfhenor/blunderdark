import { defaultResources } from '@helpers/defaults';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import type {
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoomId,
  ResourceMap,
} from '@interfaces';
import type { Floor, FloorId } from '@interfaces/floor';
import type { PlacedRoom } from '@interfaces/room-shape';
import type { RoomId } from '@interfaces/content-room';
import type { RoomShapeId } from '@interfaces/content-roomshape';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockResources: ResourceMap;

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

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn(),
}));

vi.mock('@helpers/floor-modifiers', () => ({
  floorModifierGetObjectiveCorruptionRate: vi.fn((depth: number) => {
    if (depth >= 1 && depth <= 3) return 0;
    if (depth >= 4 && depth <= 6) return 0.1;
    if (depth >= 7 && depth <= 9) return 0.2;
    if (depth === 10) return 0.5;
    return 0;
  }),
}));

const {
  corruptionAdd,
  corruptionSpend,
  corruptionCanAfford,
  corruptionGenerationCalculateInhabitantRate,
  corruptionCalculateDeepObjectiveRate,
} = await import('@helpers/corruption');

describe('corruptionAdd', () => {
  beforeEach(() => {
    mockResources = defaultResources();
  });

  it('should add corruption and return the amount added', async () => {
    const added = await corruptionAdd(50);
    expect(added).toBe(50);
    expect(mockResources.corruption.current).toBe(50);
  });

  it('should return 0 when adding zero', async () => {
    const added = await corruptionAdd(0);
    expect(added).toBe(0);
    expect(mockResources.corruption.current).toBe(0);
  });

  it('should return 0 when adding a negative amount', async () => {
    const added = await corruptionAdd(-10);
    expect(added).toBe(0);
    expect(mockResources.corruption.current).toBe(0);
  });

  it('should allow adding large amounts (no hard cap)', async () => {
    const added = await corruptionAdd(500);
    expect(added).toBe(500);
    expect(mockResources.corruption.current).toBe(500);
  });
});

describe('corruptionSpend', () => {
  beforeEach(() => {
    mockResources = defaultResources();
    mockResources.corruption.current = 100;
  });

  it('should spend corruption and return true', async () => {
    const result = await corruptionSpend(30);
    expect(result).toBe(true);
    expect(mockResources.corruption.current).toBe(70);
  });

  it('should not go below 0', async () => {
    const result = await corruptionSpend(150);
    expect(result).toBe(false);
    expect(mockResources.corruption.current).toBe(100);
  });

  it('should return false for zero amount', async () => {
    const result = await corruptionSpend(0);
    expect(result).toBe(false);
    expect(mockResources.corruption.current).toBe(100);
  });

  it('should return false for negative amount', async () => {
    const result = await corruptionSpend(-10);
    expect(result).toBe(false);
    expect(mockResources.corruption.current).toBe(100);
  });

  it('should succeed when spending exact available amount', async () => {
    const result = await corruptionSpend(100);
    expect(result).toBe(true);
    expect(mockResources.corruption.current).toBe(0);
  });
});

describe('corruptionCanAfford', () => {
  beforeEach(() => {
    mockResources = defaultResources();
    mockResources.corruption.current = 75;
  });

  it('should return true when corruption is sufficient', () => {
    expect(corruptionCanAfford(50)).toBe(true);
  });

  it('should return false when corruption is insufficient', () => {
    expect(corruptionCanAfford(100)).toBe(false);
  });

  it('should return true when checking exact amount', () => {
    expect(corruptionCanAfford(75)).toBe(true);
  });
});

describe('corruptionGenerationCalculateInhabitantRate', () => {
  function makeDef(overrides: Partial<InhabitantContent> = {}): InhabitantContent {
    return {
      id: 'def-1' as InhabitantId,
      __type: 'inhabitant',
      name: 'Test',
      type: 'creature',
      tier: 1,
      description: '',
      cost: {},
      stats: { hp: 10, attack: 5, defense: 5, speed: 5, workerEfficiency: 1.0 },
      traits: [],
      restrictionTags: [],
      rulerBonuses: {},
      rulerFearLevel: 0,
      ...overrides,
    };
  }

  function makeInst(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
    return {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-1' as InhabitantId,
      name: 'Test',
      state: 'normal',
      assignedRoomId: undefined,
      ...overrides,
    };
  }

  it('should return 0 for no inhabitants', () => {
    const rate = corruptionGenerationCalculateInhabitantRate([], () => undefined);
    expect(rate).toBe(0);
  });

  it('should return 0 for unstationed inhabitants', () => {
    const inst = makeInst({ assignedRoomId: undefined });
    const def = makeDef({ corruptionGeneration: 5 });
    const rate = corruptionGenerationCalculateInhabitantRate([inst], () => def);
    expect(rate).toBe(0);
  });

  it('should calculate rate for stationed Skeleton (1/min)', () => {
    const inst = makeInst({ assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'skeleton' as InhabitantId });
    const def = makeDef({ corruptionGeneration: 1 });
    const rate = corruptionGenerationCalculateInhabitantRate([inst], () => def);
    // 1 per minute / 1 tick per minute = 1.0 per tick
    expect(rate).toBeCloseTo(1 / GAME_TIME_TICKS_PER_MINUTE);
  });

  it('should calculate rate for stationed Demon Lord (10/min)', () => {
    const inst = makeInst({ assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'demon-lord' as InhabitantId });
    const def = makeDef({ corruptionGeneration: 10 });
    const rate = corruptionGenerationCalculateInhabitantRate([inst], () => def);
    // 10 per minute / 1 tick per minute = 10.0 per tick
    expect(rate).toBeCloseTo(10 / GAME_TIME_TICKS_PER_MINUTE);
  });

  it('should sum multiple stationed inhabitants', () => {
    const inhabitants = [
      makeInst({ instanceId: 'i1' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'skeleton' as InhabitantId }),
      makeInst({ instanceId: 'i2' as InhabitantInstanceId, assignedRoomId: 'room-2' as PlacedRoomId, definitionId: 'skeleton' as InhabitantId }),
    ];
    const def = makeDef({ corruptionGeneration: 1 });
    const rate = corruptionGenerationCalculateInhabitantRate(inhabitants, () => def);
    // 2 per minute total / 1 = 2.0 per tick
    expect(rate).toBeCloseTo(2 / GAME_TIME_TICKS_PER_MINUTE);
  });

  it('should ignore inhabitants with no corruption generation', () => {
    const inst = makeInst({ assignedRoomId: 'room-1' as PlacedRoomId });
    const def = makeDef({ corruptionGeneration: 0 });
    const rate = corruptionGenerationCalculateInhabitantRate([inst], () => def);
    expect(rate).toBe(0);
  });

  it('should ignore inhabitants with undefined corruption generation', () => {
    const inst = makeInst({ assignedRoomId: 'room-1' as PlacedRoomId });
    const def = makeDef();
    const rate = corruptionGenerationCalculateInhabitantRate([inst], () => def);
    expect(rate).toBe(0);
  });
});

describe('corruptionCalculateDeepObjectiveRate', () => {
  function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
    return {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-type-1' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
      ...overrides,
    };
  }

  function makeFloor(overrides: Partial<Floor> = {}): Floor {
    return {
      id: 'floor-1' as FloorId,
      name: 'Floor 1',
      depth: 1,
      biome: 'neutral',
      grid: [],
      rooms: [],
      hallways: [],
      inhabitants: [],
      connections: [],
      traps: [],
      ...overrides,
    };
  }

  it('should return 0 for objective rooms on floors 1-3', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockReturnValue({
      id: 'room-type-1',
      objectiveTypes: ['StealTreasure'],
    } as ReturnType<typeof contentGetEntry>);

    const floors = [
      makeFloor({ depth: 1, rooms: [makeRoom()] }),
      makeFloor({ id: 'f2' as FloorId, depth: 2, rooms: [makeRoom({ id: 'r2' as PlacedRoomId })] }),
      makeFloor({ id: 'f3' as FloorId, depth: 3, rooms: [makeRoom({ id: 'r3' as PlacedRoomId })] }),
    ];

    expect(corruptionCalculateDeepObjectiveRate(floors)).toBe(0);
  });

  it('should return correct rate for objective rooms on floor 5', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockReturnValue({
      id: 'room-type-1',
      objectiveTypes: ['StealTreasure'],
    } as ReturnType<typeof contentGetEntry>);

    const floors = [
      makeFloor({ depth: 5, rooms: [makeRoom()] }),
    ];

    // 0.1 per minute / GAME_TIME_TICKS_PER_MINUTE
    expect(corruptionCalculateDeepObjectiveRate(floors)).toBeCloseTo(0.1 / GAME_TIME_TICKS_PER_MINUTE);
  });

  it('should return correct rate for objective rooms on floor 10', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockReturnValue({
      id: 'room-type-1',
      objectiveTypes: ['StealTreasure'],
    } as ReturnType<typeof contentGetEntry>);

    const floors = [
      makeFloor({ depth: 10, rooms: [makeRoom()] }),
    ];

    // 0.5 per minute / GAME_TIME_TICKS_PER_MINUTE
    expect(corruptionCalculateDeepObjectiveRate(floors)).toBeCloseTo(0.5 / GAME_TIME_TICKS_PER_MINUTE);
  });

  it('should return 0 for non-objective rooms on any floor', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockReturnValue({
      id: 'room-type-1',
      objectiveTypes: [],
    } as ReturnType<typeof contentGetEntry>);

    const floors = [
      makeFloor({ depth: 10, rooms: [makeRoom()] }),
    ];

    expect(corruptionCalculateDeepObjectiveRate(floors)).toBe(0);
  });

  it('should return 0 for rooms with no objectiveTypes defined', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockReturnValue({
      id: 'room-type-1',
    } as ReturnType<typeof contentGetEntry>);

    const floors = [
      makeFloor({ depth: 10, rooms: [makeRoom()] }),
    ];

    expect(corruptionCalculateDeepObjectiveRate(floors)).toBe(0);
  });

  it('should sum rates across multiple objective rooms on different floors', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockReturnValue({
      id: 'room-type-1',
      objectiveTypes: ['StealTreasure'],
    } as ReturnType<typeof contentGetEntry>);

    const floors = [
      makeFloor({ depth: 5, rooms: [makeRoom()] }),
      makeFloor({ id: 'f2' as FloorId, depth: 10, rooms: [makeRoom({ id: 'r2' as PlacedRoomId })] }),
    ];

    // 0.1 + 0.5 = 0.6 per minute / GAME_TIME_TICKS_PER_MINUTE
    expect(corruptionCalculateDeepObjectiveRate(floors)).toBeCloseTo(0.6 / GAME_TIME_TICKS_PER_MINUTE);
  });

  it('should return 0 for empty floors', () => {
    expect(corruptionCalculateDeepObjectiveRate([])).toBe(0);
  });
});
