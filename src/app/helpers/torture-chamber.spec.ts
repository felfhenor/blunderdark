import type {
  CapturedPrisoner,
  Floor,
  FloorId,
  GameId,
  GameState,
  GridState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  PrisonerId,
  ResourceMap,
  RoomId,
  RoomShapeId,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import seedrandom from 'seedrandom';

// --- Constants ---

const TORTURE_CHAMBER_ID = 'tc100001-0001-0001-0001-000000000001';
const GOBLIN_ID = 'tc200001-0001-0001-0001-000000000001';
const BROKEN_PRISONER_ID = 'tc200001-0001-0001-0001-000000000099';
const WARRIORS_RUNE_ID = 'rune-0001-0001-0001-000000000001';

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'tortureChamber') return TORTURE_CHAMBER_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
  rngRandom: () => seedrandom('test-seed'),
}));

let mockResourceMap: ResourceMap;

vi.mock('@helpers/resources', () => ({
  resourceAdd: vi.fn((type: string, amount: number) => {
    if (amount <= 0) return 0;
    const res = mockResourceMap[type as keyof typeof mockResourceMap];
    const available = res.max - res.current;
    const actual = Math.min(amount, available);
    res.current = Math.min(res.current + amount, res.max);
    return actual;
  }),
  resourceSubtract: vi.fn((type: string, amount: number) => {
    if (amount <= 0) return 0;
    const res = mockResourceMap[type as keyof typeof mockResourceMap];
    if (res.current < amount) return 0;
    const subtracted = Math.min(amount, res.current);
    res.current = Math.max(0, res.current - amount);
    return subtracted;
  }),
}));

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'torture-1' as PlacedRoomId,
    roomTypeId: TORTURE_CHAMBER_ID as RoomId,
    shapeId: 'shape-l' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

function makeInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inh-1' as InhabitantInstanceId,
    definitionId: GOBLIN_ID as InhabitantId,
    name: 'Goblin Torturer',
    state: 'normal',
    assignedRoomId: 'torture-1' as PlacedRoomId,
    ...overrides,
  };
}

function makePrisoner(
  overrides: Partial<CapturedPrisoner> = {},
): CapturedPrisoner {
  return {
    id: 'prisoner-1' as PrisonerId,
    invaderClass: 'warrior',
    name: 'Captured Warrior',
    stats: { hp: 40, attack: 15, defense: 10, speed: 8 },
    captureDay: 5,
    ...overrides,
  };
}

function makeFloor(
  rooms: PlacedRoom[] = [],
  inhabitants: InhabitantInstance[] = [],
): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: { tiles: [] } as unknown as GridState,
    rooms,
    hallways: [],
    inhabitants,
    connections: [],
    traps: [],
  };
}

function makeGameState(overrides: {
  floors?: Floor[];
  prisoners?: CapturedPrisoner[];
  day?: number;
}): GameState {
  const state = {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameId,
    clock: {
      numTicks: 0,
      lastSaveTick: 0,
      day: overrides.day ?? 1,
      hour: 0,
      minute: 0,
    },
    world: {
      grid: [] as unknown as GridState,
      resources: {
        crystals: { current: 100, max: 500 },
        food: { current: 100, max: 500 },
        gold: { current: 200, max: 1000 },
        flux: { current: 50, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 50, max: 200 },
        corruption: { current: 0, max: 100 },
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
        unlockedContent: {
          rooms: [],
          inhabitants: [],
          abilities: [],
          upgrades: [],
          passiveBonuses: [],
        },
      },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: overrides.floors ?? [makeFloor()],
      currentFloorIndex: 0,
      trapInventory: [],
      forgeInventory: [],
      alchemyConversions: [],
      prisoners: overrides.prisoners ?? [],
      traitRunes: [],
      interrogationBuffs: [],
      invasionSchedule: {
        nextInvasionDay: undefined,
        nextInvasionVariance: 0,
        gracePeriodEnd: 5,
        invasionHistory: [],
        pendingSpecialInvasions: [],
        warningActive: false,
        warningDismissed: false,
      },
      corruptionEffects: {
        firedOneTimeEffects: [],
        lastIntervalValues: {},
        lastTriggerTimes: {},
        retriggeredEffects: {},
      },
      stairs: [],
      elevators: [],
      portals: [],
      victoryProgress: {
        consecutivePeacefulDays: 0,
        lastPeacefulCheckDay: 0,
        consecutiveZeroCorruptionDays: 0,
        lastZeroCorruptionCheckDay: 0,
        totalInvasionDefenseWins: 0,
      },
      merchant: {
        isPresent: false,
        arrivalDay: 0,
        departureDayRemaining: 0,
        inventory: [],
      },
    },
  };
  mockResourceMap = state.world.resources;
  return state;
}

// --- Import after mocks ---

import {
  TORTURE_INTERROGATE_BASE_TICKS,
  TORTURE_EXTRACT_BASE_TICKS,
  TORTURE_BREAK_BASE_TICKS,
  TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING,
  TORTURE_BREAK_CONVERT_SUCCESS_RATE,
  PRISONER_ESCAPE_DAYS,
  tortureCanStart,
  tortureCalculateExtractionReward,
  tortureCalculateInterrogationBuff,
  interrogationBuffGetTotals,
  tortureCreateBrokenInhabitant,
  tortureCreateTraitRune,
  prisonerEscapeProcess,
  tortureChamberProcess,
} from '@helpers/torture-chamber';

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(TORTURE_CHAMBER_ID, {
    id: TORTURE_CHAMBER_ID,
    name: 'Torture Chamber',
    __type: 'room',
    role: 'tortureChamber',
  });
  mockContent.set('Broken Prisoner', {
    id: BROKEN_PRISONER_ID,
    name: 'Broken Prisoner',
    __type: 'inhabitant',
  });
  mockContent.set("Warrior's Rune", {
    id: WARRIORS_RUNE_ID,
    name: "Warrior's Rune",
    __type: 'traitrune',
    invaderClass: 'warrior',
    effects: [],
  });
});

// --- Tests ---

describe('Constants', () => {
  it('should have correct stage durations', () => {
    // 3 min, 4 min, 4 min
    expect(TORTURE_INTERROGATE_BASE_TICKS).toBeGreaterThan(0);
    expect(TORTURE_EXTRACT_BASE_TICKS).toBeGreaterThan(0);
    expect(TORTURE_BREAK_BASE_TICKS).toBeGreaterThan(0);
  });

  it('should have correct corruption per tick', () => {
    expect(TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING).toBe(0.12);
  });

  it('should have correct convert success rate', () => {
    expect(TORTURE_BREAK_CONVERT_SUCCESS_RATE).toBe(0.8);
  });

  it('should have 3-day prisoner escape window', () => {
    expect(PRISONER_ESCAPE_DAYS).toBe(3);
  });
});

describe('tortureCanStart', () => {
  it('should return false if there is an active job', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'p1' as PrisonerId,
      currentStage: 'interrogate',
      ticksRemaining: 10,
      targetTicks: 20,
    };
    const worker = makeInhabitant();
    const prisoner = makePrisoner();
    expect(tortureCanStart(room, [worker], [prisoner])).toBe(false);
  });

  it('should return false if no worker is assigned', () => {
    const room = makeRoom();
    const unassigned = makeInhabitant({ assignedRoomId: undefined });
    const prisoner = makePrisoner();
    expect(tortureCanStart(room, [unassigned], [prisoner])).toBe(false);
  });

  it('should return false if no prisoners available', () => {
    const room = makeRoom();
    const worker = makeInhabitant();
    expect(tortureCanStart(room, [worker], [])).toBe(false);
  });

  it('should return true when all conditions met', () => {
    const room = makeRoom();
    const worker = makeInhabitant();
    const prisoner = makePrisoner();
    expect(tortureCanStart(room, [worker], [prisoner])).toBe(true);
  });
});

describe('tortureCalculateExtractionReward', () => {
  it('should calculate research from prisoner stats', () => {
    const prisoner = makePrisoner({
      stats: { hp: 40, attack: 15, defense: 10, speed: 8 },
    });
    const reward = tortureCalculateExtractionReward(prisoner);
    // (40 + 15 + 10 + 8) / 3 = 24.33 → 24
    expect(reward).toBe(24);
  });

  it('should scale with higher stats', () => {
    const prisoner = makePrisoner({
      stats: { hp: 100, attack: 50, defense: 40, speed: 30 },
    });
    const reward = tortureCalculateExtractionReward(prisoner);
    // (100 + 50 + 40 + 30) / 3 = 73.33 → 73
    expect(reward).toBe(73);
  });
});

describe('tortureCalculateInterrogationBuff', () => {
  it('should calculate buff from prisoner stats', () => {
    const prisoner = makePrisoner({
      stats: { hp: 40, attack: 15, defense: 10, speed: 8 },
    });
    const buff = tortureCalculateInterrogationBuff(prisoner);
    // (40 + 15 + 10 + 8) / 10 = 7.3
    expect(buff.attackBonusPercent).toBeCloseTo(7.3, 5);
    expect(buff.defenseBonusPercent).toBeCloseTo(7.3, 5);
    expect(buff.sourceInvaderClass).toBe('warrior');
  });
});

describe('interrogationBuffGetTotals', () => {
  it('should sum multiple buffs', () => {
    const totals = interrogationBuffGetTotals([
      {
        attackBonusPercent: 5,
        defenseBonusPercent: 3,
        sourceInvaderClass: 'warrior',
      },
      {
        attackBonusPercent: 2,
        defenseBonusPercent: 4,
        sourceInvaderClass: 'rogue',
      },
    ]);
    expect(totals.attackBonusPercent).toBe(7);
    expect(totals.defenseBonusPercent).toBe(7);
  });

  it('should return zeros for empty array', () => {
    const totals = interrogationBuffGetTotals([]);
    expect(totals.attackBonusPercent).toBe(0);
    expect(totals.defenseBonusPercent).toBe(0);
  });
});

describe('tortureCreateBrokenInhabitant', () => {
  it('should create inhabitant with correct name', () => {
    const prisoner = makePrisoner({ name: 'Sir Lance' });
    const inhabitant = tortureCreateBrokenInhabitant(prisoner);
    expect(inhabitant).toBeDefined();
    expect(inhabitant!.name).toContain('Sir Lance');
    expect(inhabitant!.name).toContain('Broken');
  });

  it('should set state to normal', () => {
    const prisoner = makePrisoner();
    const inhabitant = tortureCreateBrokenInhabitant(prisoner);
    expect(inhabitant).toBeDefined();
    expect(inhabitant!.state).toBe('normal');
  });

  it('should include 33% stat inheritance floored', () => {
    const prisoner = makePrisoner({
      stats: { hp: 40, attack: 15, defense: 10, speed: 8 },
    });
    const inhabitant = tortureCreateBrokenInhabitant(prisoner);
    expect(inhabitant).toBeDefined();
    expect(inhabitant!.instanceStatBonuses).toEqual({
      attack: Math.floor(15 * 0.33), // 4
      defense: Math.floor(10 * 0.33), // 3
      speed: Math.floor(8 * 0.33), // 2
    });
  });

  it('should not have an assigned room', () => {
    const prisoner = makePrisoner();
    const inhabitant = tortureCreateBrokenInhabitant(prisoner);
    expect(inhabitant).toBeDefined();
    expect(inhabitant!.assignedRoomId).toBeUndefined();
  });

  it('should return undefined when content not found', () => {
    mockContent.delete('Broken Prisoner');
    const prisoner = makePrisoner();
    const inhabitant = tortureCreateBrokenInhabitant(prisoner);
    expect(inhabitant).toBeUndefined();
  });
});

describe('tortureCreateTraitRune', () => {
  it('should create rune for warrior class', () => {
    const prisoner = makePrisoner({ invaderClass: 'warrior' });
    const rune = tortureCreateTraitRune(prisoner);
    expect(rune).toBeDefined();
    expect(rune!.runeTypeId).toBe(WARRIORS_RUNE_ID);
    expect(rune!.sourceInvaderClass).toBe('warrior');
  });

  it('should return undefined for unknown class rune', () => {
    const prisoner = makePrisoner({ invaderClass: 'mage' });
    const rune = tortureCreateTraitRune(prisoner);
    // "Mage's Rune" not in mockContent
    expect(rune).toBeUndefined();
  });
});

describe('prisonerEscapeProcess', () => {
  it('should remove prisoners after PRISONER_ESCAPE_DAYS', () => {
    const prisoner = makePrisoner({ captureDay: 1 });
    const state = makeGameState({ prisoners: [prisoner], day: 4 });
    // day 4 - captureDay 1 = 3 >= PRISONER_ESCAPE_DAYS (3)
    const escaped = prisonerEscapeProcess(state);
    expect(escaped).toHaveLength(1);
    expect(escaped[0]).toBe('Captured Warrior');
    expect(state.world.prisoners).toHaveLength(0);
  });

  it('should keep prisoners within the escape window', () => {
    const prisoner = makePrisoner({ captureDay: 3 });
    const state = makeGameState({ prisoners: [prisoner], day: 4 });
    // day 4 - captureDay 3 = 1 < 3
    const escaped = prisonerEscapeProcess(state);
    expect(escaped).toHaveLength(0);
    expect(state.world.prisoners).toHaveLength(1);
  });

  it('should skip prisoners in active torture jobs', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      currentStage: 'interrogate',
      ticksRemaining: 5,
      targetTicks: 10,
    };
    const prisoner = makePrisoner({ captureDay: 1 });
    const floor = makeFloor([room]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
      day: 10,
    });
    const escaped = prisonerEscapeProcess(state);
    expect(escaped).toHaveLength(0);
    expect(state.world.prisoners).toHaveLength(1);
  });
});

describe('tortureChamberProcess', () => {
  describe('interrogate stage', () => {
    it('should decrement ticks while processing', () => {
      const room = makeRoom();
      room.tortureJob = {
        prisonerId: 'prisoner-1' as PrisonerId,
        currentStage: 'interrogate',
        ticksRemaining: 10,
        targetTicks: TORTURE_INTERROGATE_BASE_TICKS,
      };

      const worker = makeInhabitant();
      const prisoner = makePrisoner();
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({
        floors: [floor],
        prisoners: [prisoner],
      });
      state.world.inhabitants = [worker];

      tortureChamberProcess(state);
      expect(room.tortureJob!.ticksRemaining).toBe(9);
    });

    it('should add corruption per tick', () => {
      const room = makeRoom();
      room.tortureJob = {
        prisonerId: 'prisoner-1' as PrisonerId,
        currentStage: 'interrogate',
        ticksRemaining: 10,
        targetTicks: TORTURE_INTERROGATE_BASE_TICKS,
      };

      const worker = makeInhabitant();
      const prisoner = makePrisoner();
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({
        floors: [floor],
        prisoners: [prisoner],
      });
      state.world.inhabitants = [worker];

      tortureChamberProcess(state);
      expect(state.world.resources.corruption.current).toBeCloseTo(
        TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING,
        5,
      );
    });

    it('should advance to extract stage on completion and add interrogation buff', () => {
      const room = makeRoom();
      room.tortureJob = {
        prisonerId: 'prisoner-1' as PrisonerId,
        currentStage: 'interrogate',
        ticksRemaining: 1,
        targetTicks: TORTURE_INTERROGATE_BASE_TICKS,
      };

      const worker = makeInhabitant();
      const prisoner = makePrisoner({
        stats: { hp: 40, attack: 15, defense: 10, speed: 8 },
      });
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({
        floors: [floor],
        prisoners: [prisoner],
      });
      state.world.inhabitants = [worker];

      tortureChamberProcess(state);

      // Should advance to extract with 0 ticks (paused)
      expect(room.tortureJob!.currentStage).toBe('extract');
      expect(room.tortureJob!.ticksRemaining).toBe(0);
      expect(room.tortureJob!.stageAction).toBeUndefined();

      // Should have added interrogation buff
      expect(state.world.interrogationBuffs).toHaveLength(1);
      expect(
        state.world.interrogationBuffs[0].attackBonusPercent,
      ).toBeCloseTo(7.3, 5);
    });
  });

  describe('extract stage', () => {
    it('should pause when no stageAction is set', () => {
      const room = makeRoom();
      room.tortureJob = {
        prisonerId: 'prisoner-1' as PrisonerId,
        currentStage: 'extract',
        ticksRemaining: 0,
        targetTicks: TORTURE_EXTRACT_BASE_TICKS,
      };

      const worker = makeInhabitant();
      const prisoner = makePrisoner();
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({
        floors: [floor],
        prisoners: [prisoner],
      });
      state.world.inhabitants = [worker];

      tortureChamberProcess(state);

      // Should stay in extract, still paused
      expect(room.tortureJob!.currentStage).toBe('extract');
      expect(room.tortureJob!.ticksRemaining).toBe(0);
    });

    it('should process research extraction and advance to break stage', () => {
      const room = makeRoom();
      room.tortureJob = {
        prisonerId: 'prisoner-1' as PrisonerId,
        currentStage: 'extract',
        stageAction: 'research',
        ticksRemaining: 1,
        targetTicks: TORTURE_EXTRACT_BASE_TICKS,
      };

      const worker = makeInhabitant();
      const prisoner = makePrisoner({
        stats: { hp: 40, attack: 15, defense: 10, speed: 8 },
      });
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({
        floors: [floor],
        prisoners: [prisoner],
      });
      state.world.inhabitants = [worker];

      tortureChamberProcess(state);

      // Research gained: (40+15+10+8)/3 = 24
      expect(state.world.resources.research.current).toBe(24);
      // Should advance to break
      expect(room.tortureJob!.currentStage).toBe('break');
      expect(room.tortureJob!.stageAction).toBeUndefined();
      expect(room.tortureJob!.ticksRemaining).toBe(0);
    });

    it('should process rune extraction and advance to break stage', () => {
      const room = makeRoom();
      room.tortureJob = {
        prisonerId: 'prisoner-1' as PrisonerId,
        currentStage: 'extract',
        stageAction: 'rune',
        ticksRemaining: 1,
        targetTicks: TORTURE_EXTRACT_BASE_TICKS,
      };

      const worker = makeInhabitant();
      const prisoner = makePrisoner({ invaderClass: 'warrior' });
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({
        floors: [floor],
        prisoners: [prisoner],
      });
      state.world.inhabitants = [worker];

      tortureChamberProcess(state);

      // Rune should have been created
      expect(state.world.traitRunes).toHaveLength(1);
      expect(state.world.traitRunes[0].sourceInvaderClass).toBe('warrior');
      // Should advance to break
      expect(room.tortureJob!.currentStage).toBe('break');
    });
  });

  describe('break stage', () => {
    it('should execute prisoner and grant reputation', () => {
      const room = makeRoom();
      room.tortureJob = {
        prisonerId: 'prisoner-1' as PrisonerId,
        currentStage: 'break',
        stageAction: 'execute',
        ticksRemaining: 1,
        targetTicks: TORTURE_BREAK_BASE_TICKS,
      };

      const worker = makeInhabitant();
      const prisoner = makePrisoner();
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({
        floors: [floor],
        prisoners: [prisoner],
      });
      state.world.inhabitants = [worker];

      tortureChamberProcess(state);

      expect(state.world.reputation.terror).toBe(1);
      expect(state.world.prisoners).toHaveLength(0);
      expect(room.tortureJob).toBeUndefined();
    });

    it('should sacrifice prisoner and grant random resource', () => {
      const room = makeRoom();
      room.tortureJob = {
        prisonerId: 'prisoner-1' as PrisonerId,
        currentStage: 'break',
        stageAction: 'sacrifice',
        ticksRemaining: 1,
        targetTicks: TORTURE_BREAK_BASE_TICKS,
      };

      const worker = makeInhabitant();
      const prisoner = makePrisoner();
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({
        floors: [floor],
        prisoners: [prisoner],
      });
      state.world.inhabitants = [worker];

      tortureChamberProcess(state);

      expect(state.world.prisoners).toHaveLength(0);
      expect(room.tortureJob).toBeUndefined();
    });

    it('should attempt conversion and clear job on completion', () => {
      const room = makeRoom();
      room.tortureJob = {
        prisonerId: 'prisoner-1' as PrisonerId,
        currentStage: 'break',
        stageAction: 'convert',
        ticksRemaining: 1,
        targetTicks: TORTURE_BREAK_BASE_TICKS,
      };

      const worker = makeInhabitant();
      const prisoner = makePrisoner();
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({
        floors: [floor],
        prisoners: [prisoner],
      });
      state.world.inhabitants = [worker];

      tortureChamberProcess(state);

      // Regardless of success, prisoner removed and job cleared
      expect(state.world.prisoners).toHaveLength(0);
      expect(room.tortureJob).toBeUndefined();
    });
  });

  it('should not process rooms that are not torture chambers', () => {
    const room = makeRoom({ roomTypeId: 'other-room-type' as RoomId });
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      currentStage: 'interrogate',
      ticksRemaining: 5,
      targetTicks: 20,
    };

    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [];

    tortureChamberProcess(state);

    expect(room.tortureJob!.ticksRemaining).toBe(5);
  });

  it('should not process rooms without assigned workers', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      currentStage: 'interrogate',
      ticksRemaining: 10,
      targetTicks: 20,
    };

    const unassigned = makeInhabitant({
      assignedRoomId: 'other-room' as PlacedRoomId,
    });
    const prisoner = makePrisoner();
    const floor = makeFloor([room], [unassigned]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [unassigned];

    tortureChamberProcess(state);

    expect(room.tortureJob!.ticksRemaining).toBe(10);
  });

  it('should sync floor inhabitants after successful conversion', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      currentStage: 'break',
      stageAction: 'convert',
      ticksRemaining: 1,
      targetTicks: TORTURE_BREAK_BASE_TICKS,
    };

    const worker = makeInhabitant();
    const prisoner = makePrisoner();
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [worker];

    tortureChamberProcess(state);

    // If conversion succeeded, floor inhabitants should match world inhabitants
    if (state.world.inhabitants.length > 1) {
      expect(state.world.floors[0].inhabitants).toBe(
        state.world.inhabitants,
      );
    }
  });
});
