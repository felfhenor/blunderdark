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
import type { FeatureContent, FeatureId } from '@interfaces/content-feature';
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

vi.mock('@helpers/day-night-modifiers', () => ({
  dayNightGetResourceModifier: vi.fn(() => 1.0),
}));

const {
  corruptionAdd,
  corruptionSpend,
  corruptionCanAfford,
  corruptionGetLevel,
  corruptionGetLevelDescription,
  corruptionGenerationCalculateInhabitantRate,
  corruptionGenerationProcess,
  corruptionGenerationCalculateTotalPerMinute,
  CORRUPTION_THRESHOLD_MEDIUM,
  CORRUPTION_THRESHOLD_HIGH,
  CORRUPTION_THRESHOLD_CRITICAL,
} = await import('@helpers/corruption');

const { dayNightGetResourceModifier } = await import(
  '@helpers/day-night-modifiers'
);

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

describe('corruptionGetLevel', () => {
  it('should return low for 0-49', () => {
    expect(corruptionGetLevel(0)).toBe('low');
    expect(corruptionGetLevel(25)).toBe('low');
    expect(corruptionGetLevel(49)).toBe('low');
  });

  it('should return medium for 50-99', () => {
    expect(corruptionGetLevel(CORRUPTION_THRESHOLD_MEDIUM)).toBe('medium');
    expect(corruptionGetLevel(75)).toBe('medium');
    expect(corruptionGetLevel(99)).toBe('medium');
  });

  it('should return high for 100-199', () => {
    expect(corruptionGetLevel(CORRUPTION_THRESHOLD_HIGH)).toBe('high');
    expect(corruptionGetLevel(150)).toBe('high');
    expect(corruptionGetLevel(199)).toBe('high');
  });

  it('should return critical for 200+', () => {
    expect(corruptionGetLevel(CORRUPTION_THRESHOLD_CRITICAL)).toBe('critical');
    expect(corruptionGetLevel(300)).toBe('critical');
    expect(corruptionGetLevel(1000)).toBe('critical');
  });
});

describe('corruptionGetLevelDescription', () => {
  it('should return a description for each level', () => {
    expect(corruptionGetLevelDescription('low')).toBeTruthy();
    expect(corruptionGetLevelDescription('medium')).toBeTruthy();
    expect(corruptionGetLevelDescription('high')).toBeTruthy();
    expect(corruptionGetLevelDescription('critical')).toBeTruthy();
  });

  it('should return different descriptions for different levels', () => {
    const low = corruptionGetLevelDescription('low');
    const medium = corruptionGetLevelDescription('medium');
    const high = corruptionGetLevelDescription('high');
    const critical = corruptionGetLevelDescription('critical');
    expect(new Set([low, medium, high, critical]).size).toBe(4);
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
    // 1 per minute / 5 ticks per minute = 0.2 per tick
    expect(rate).toBeCloseTo(1 / GAME_TIME_TICKS_PER_MINUTE);
  });

  it('should calculate rate for stationed Demon Lord (10/min)', () => {
    const inst = makeInst({ assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'demon-lord' as InhabitantId });
    const def = makeDef({ corruptionGeneration: 10 });
    const rate = corruptionGenerationCalculateInhabitantRate([inst], () => def);
    // 10 per minute / 5 ticks per minute = 2.0 per tick
    expect(rate).toBeCloseTo(10 / GAME_TIME_TICKS_PER_MINUTE);
  });

  it('should sum multiple stationed inhabitants', () => {
    const inhabitants = [
      makeInst({ instanceId: 'i1' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'skeleton' as InhabitantId }),
      makeInst({ instanceId: 'i2' as InhabitantInstanceId, assignedRoomId: 'room-2' as PlacedRoomId, definitionId: 'skeleton' as InhabitantId }),
    ];
    const def = makeDef({ corruptionGeneration: 1 });
    const rate = corruptionGenerationCalculateInhabitantRate(inhabitants, () => def);
    // 2 per minute total / 5 = 0.4 per tick
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

describe('corruptionGenerationProcess', () => {
  function makeState(
    inhabitants: InhabitantInstance[],
    hour = 12,
    corruptionCurrent = 0,
  ): GameState {
    return {
      clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour, minute: 0 },
      world: {
        resources: {
          ...defaultResources(),
          corruption: { current: corruptionCurrent, max: Number.MAX_SAFE_INTEGER },
        },
        inhabitants,
      },
    } as unknown as GameState;
  }

  function makeInst(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
    return {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'skeleton-def' as InhabitantId,
      name: 'Skeleton',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(dayNightGetResourceModifier).mockReturnValue(1.0);
  });

  it('should do nothing with no inhabitants', () => {
    const state = makeState([]);
    corruptionGenerationProcess(state);
    expect(state.world.resources.corruption.current).toBe(0);
  });

  it('should add corruption from stationed Skeleton (1/min)', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockReturnValue({
      id: 'skeleton-def',
      name: 'Skeleton',
      __type: 'inhabitant',
      type: 'undead',
      tier: 1,
      description: '',
      cost: {},
      stats: { hp: 40, attack: 12, defense: 15, speed: 6, workerEfficiency: 0.7 },
      traits: [],
      restrictionTags: [],
      rulerBonuses: {},
      rulerFearLevel: 0,
      corruptionGeneration: 1,
    } as unknown as ReturnType<typeof contentGetEntry>);

    const state = makeState([makeInst()]);
    corruptionGenerationProcess(state);
    // 1/min / 5 ticks/min = 0.2 per tick
    expect(state.world.resources.corruption.current).toBeCloseTo(0.2);
  });

  it('should apply night modifier (+50%)', async () => {
    vi.mocked(dayNightGetResourceModifier).mockReturnValue(1.5);

    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockReturnValue({
      id: 'skeleton-def',
      name: 'Skeleton',
      __type: 'inhabitant',
      type: 'undead',
      tier: 1,
      description: '',
      cost: {},
      stats: { hp: 40, attack: 12, defense: 15, speed: 6, workerEfficiency: 0.7 },
      traits: [],
      restrictionTags: [],
      rulerBonuses: {},
      rulerFearLevel: 0,
      corruptionGeneration: 1,
    } as unknown as ReturnType<typeof contentGetEntry>);

    const state = makeState([makeInst()], 22);
    corruptionGenerationProcess(state);
    // 0.2 per tick * 1.5 night = 0.3
    expect(state.world.resources.corruption.current).toBeCloseTo(0.3);
  });

  it('should not add corruption from unstationed inhabitants', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockReturnValue({
      id: 'skeleton-def',
      name: 'Skeleton',
      __type: 'inhabitant',
      corruptionGeneration: 1,
    } as unknown as ReturnType<typeof contentGetEntry>);

    const state = makeState([makeInst({ assignedRoomId: undefined })]);
    corruptionGenerationProcess(state);
    expect(state.world.resources.corruption.current).toBe(0);
  });
});

describe('corruptionGenerationCalculateTotalPerMinute', () => {
  it('should combine inhabitant and room rates into per-minute', () => {
    // 0.2 per tick (inhabitant) + 0.4 per tick (room) = 0.6 per tick
    // 0.6 * 5 = 3.0 per minute
    const total = corruptionGenerationCalculateTotalPerMinute(0.2, 0.4);
    expect(total).toBeCloseTo(3.0);
  });

  it('should return 0 when both rates are 0', () => {
    expect(corruptionGenerationCalculateTotalPerMinute(0, 0)).toBe(0);
  });
});

describe('Corruption Seal', () => {
  const BLOOD_ALTAR_FID = 'blood-altar-fid' as FeatureId;
  const SEAL_FID = 'seal-fid' as FeatureId;

  const bloodAltarFeature: FeatureContent = {
    id: BLOOD_ALTAR_FID,
    name: 'Blood Altar',
    __type: 'feature',
    description: '',
    category: 'environmental',
    cost: {},
    bonuses: [
      { type: 'corruption_generation', value: 2, description: '' },
    ],
  };

  const corruptionSealFeature: FeatureContent = {
    id: SEAL_FID,
    name: 'Corruption Seal',
    __type: 'feature',
    description: '',
    category: 'functional',
    cost: {},
    bonuses: [
      { type: 'corruption_seal', value: 1, description: '' },
    ],
  };

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
      depth: 0,
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

  beforeEach(() => {
    vi.mocked(dayNightGetResourceModifier).mockReturnValue(1.0);
  });

  it('should prevent corruption generation from features in sealed rooms', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockImplementation((id) => {
      if (id === BLOOD_ALTAR_FID) return bloodAltarFeature as ReturnType<typeof contentGetEntry>;
      if (id === SEAL_FID) return corruptionSealFeature as ReturnType<typeof contentGetEntry>;
      return undefined;
    });

    // Room has both Blood Altar (generates corruption) and Corruption Seal (blocks it)
    const room = makeRoom({ featureIds: [BLOOD_ALTAR_FID, SEAL_FID] });
    const floor = makeFloor({ rooms: [room] });

    const state = {
      clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 12, minute: 0 },
      world: {
        resources: {
          ...defaultResources(),
          corruption: { current: 10, max: Number.MAX_SAFE_INTEGER },
        },
        inhabitants: [],
        floors: [floor],
      },
    } as unknown as GameState;

    corruptionGenerationProcess(state);
    // Sealed room should not generate corruption — existing value preserved
    expect(state.world.resources.corruption.current).toBe(10);
  });

  it('should still allow corruption from unsealed rooms', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockImplementation((id) => {
      if (id === BLOOD_ALTAR_FID) return bloodAltarFeature as ReturnType<typeof contentGetEntry>;
      if (id === SEAL_FID) return corruptionSealFeature as ReturnType<typeof contentGetEntry>;
      return undefined;
    });

    const sealedRoom = makeRoom({ id: 'sealed' as PlacedRoomId, featureIds: [BLOOD_ALTAR_FID, SEAL_FID] });
    const unsealedRoom = makeRoom({ id: 'unsealed' as PlacedRoomId, featureIds: [BLOOD_ALTAR_FID] });
    const floor = makeFloor({ rooms: [sealedRoom, unsealedRoom] });

    const state = {
      clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 12, minute: 0 },
      world: {
        resources: {
          ...defaultResources(),
          corruption: { current: 0, max: Number.MAX_SAFE_INTEGER },
        },
        inhabitants: [],
        floors: [floor],
      },
    } as unknown as GameState;

    corruptionGenerationProcess(state);
    // Only unsealed room generates: 2/min / 5 = 0.4/tick
    expect(state.world.resources.corruption.current).toBeCloseTo(0.4);
  });

  it('should not remove existing corruption, only prevent new generation', async () => {
    const { contentGetEntry } = vi.mocked(await import('@helpers/content'));
    contentGetEntry.mockImplementation((id) => {
      if (id === SEAL_FID) return corruptionSealFeature as ReturnType<typeof contentGetEntry>;
      return undefined;
    });

    const room = makeRoom({ featureIds: [SEAL_FID] });
    const floor = makeFloor({ rooms: [room] });

    const state = {
      clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 12, minute: 0 },
      world: {
        resources: {
          ...defaultResources(),
          corruption: { current: 50, max: Number.MAX_SAFE_INTEGER },
        },
        inhabitants: [],
        floors: [floor],
      },
    } as unknown as GameState;

    corruptionGenerationProcess(state);
    // Existing corruption preserved
    expect(state.world.resources.corruption.current).toBe(50);
  });
});
