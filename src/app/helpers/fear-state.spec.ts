import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GameId,
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoomId,
} from '@interfaces';
import type { FearLevelBreakdown } from '@interfaces/fear';
import { fearStateProcess } from '@helpers/fear-state';

// --- Mocks ---

const mockFearMap = new Map<PlacedRoomId, FearLevelBreakdown>();

vi.mock('@helpers/fear-level', () => ({
  fearLevelCalculateAllForFloor: vi.fn(() => mockFearMap),
}));

vi.mock('@helpers/throne-room', () => ({
  throneRoomGetFearLevel: vi.fn(() => undefined),
}));

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((id: string) => mockContent.get(id)),
}));

// --- Test helpers ---

const ROOM_A = 'room-a' as PlacedRoomId;
const ROOM_B = 'room-b' as PlacedRoomId;

function makeInhabitant(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
  return {
    instanceId: overrides.instanceId ?? 'inst-1' as InhabitantInstanceId,
    definitionId: overrides.definitionId ?? 'def-goblin' as InhabitantId,
    name: overrides.name ?? 'Goblin',
    state: overrides.state ?? 'normal',
    assignedRoomId: overrides.assignedRoomId ?? undefined,
    hungerTicksWithoutFood: overrides.hungerTicksWithoutFood ?? 0,
  };
}

function makeGameState(overrides: {
  inhabitants?: InhabitantInstance[];
  floorInhabitants?: InhabitantInstance[];
} = {}): GameState {
  const inhabitants = overrides.inhabitants ?? [];
  const floorInhabitants = overrides.floorInhabitants ?? [...inhabitants];

  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameId,
    clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 0, minute: 0 },
    world: {
      grid: { tiles: [], width: 0, height: 0 },
      resources: {
        crystals: { current: 0, max: 500 },
        food: { current: 100, max: 500 },
        gold: { current: 0, max: 1000 },
        flux: { current: 0, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 0, max: 200 },
        corruption: { current: 0, max: 100 },
      },
      inhabitants,
      hallways: [],
      season: { currentSeason: 'growth', dayInSeason: 1, totalSeasonCycles: 0 },
      research: { completedNodes: [], activeResearch: undefined, activeResearchProgress: 0, activeResearchStartTick: 0, unlockedContent: { rooms: [], inhabitants: [], abilities: [], roomupgrades: [], passiveBonuses: [] } },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: [{
        id: 'floor-1',
        name: 'Floor 1',
        depth: 1,
        biome: 'neutral',
        grid: { tiles: [], width: 0, height: 0 },
        rooms: [],
        hallways: [],
        inhabitants: floorInhabitants,
        connections: [],
        traps: [],
      }],
      currentFloorIndex: 0,
      trapInventory: [],
      forgeInventory: [],
      alchemyConversions: [],
      prisoners: [],
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
    },
  } as unknown as GameState;
}

function setRoomFear(roomId: PlacedRoomId, effectiveFear: number): void {
  mockFearMap.set(roomId, {
    baseFear: effectiveFear,
    inhabitantModifier: 0,
    upgradeAdjustment: 0,
    altarAuraReduction: 0,
    featureReduction: 0,
    researchReduction: 0,
    propagatedFear: 0,
    propagationSources: [],
    effectiveFear,
  });
}

function registerDef(id: string, fearTolerance?: number): void {
  mockContent.set(id, {
    __id: id,
    id,
    name: 'Test Creature',
    type: 'creature',
    tier: 1,
    description: '',
    cost: {},
    stats: { hp: 30, attack: 10, defense: 8, speed: 12, workerEfficiency: 1.0 },
    traits: [],
    restrictionTags: [],
    rulerBonuses: {},
    rulerFearLevel: 0,
    fearTolerance,
  });
}

beforeEach(() => {
  mockFearMap.clear();
  mockContent.clear();
});

// --- fearStateProcess ---

describe('fearStateProcess', () => {
  it('should set inhabitant to scared when room fear exceeds tolerance', () => {
    registerDef('def-goblin', 2);
    setRoomFear(ROOM_A, 3);
    const inhabitant = makeInhabitant({ assignedRoomId: ROOM_A });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('scared');
  });

  it('should not scare inhabitant when room fear equals tolerance', () => {
    registerDef('def-goblin', 2);
    setRoomFear(ROOM_A, 2);
    const inhabitant = makeInhabitant({ assignedRoomId: ROOM_A });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('normal');
  });

  it('should not scare inhabitant when room fear is below tolerance', () => {
    registerDef('def-goblin', 3);
    setRoomFear(ROOM_A, 1);
    const inhabitant = makeInhabitant({ assignedRoomId: ROOM_A });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('normal');
  });

  it('should not override starving state with scared', () => {
    registerDef('def-goblin', 1);
    setRoomFear(ROOM_A, 4);
    const inhabitant = makeInhabitant({
      assignedRoomId: ROOM_A,
      state: 'starving',
      hungerTicksWithoutFood: 500,
    });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('starving');
  });

  it('should override hungry state with scared', () => {
    registerDef('def-goblin', 1);
    setRoomFear(ROOM_A, 3);
    const inhabitant = makeInhabitant({
      assignedRoomId: ROOM_A,
      state: 'hungry',
      hungerTicksWithoutFood: 200,
    });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('scared');
  });

  it('should clear scared state and restore normal when fear drops', () => {
    registerDef('def-goblin', 2);
    setRoomFear(ROOM_A, 1);
    const inhabitant = makeInhabitant({
      assignedRoomId: ROOM_A,
      state: 'scared',
      hungerTicksWithoutFood: 0,
    });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('normal');
  });

  it('should clear scared state and restore hungry when fear drops and hunger ticks are high', () => {
    registerDef('def-goblin', 2);
    setRoomFear(ROOM_A, 1);
    const inhabitant = makeInhabitant({
      assignedRoomId: ROOM_A,
      state: 'scared',
      hungerTicksWithoutFood: 40,
    });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('hungry');
  });

  it('should not scare unassigned inhabitants', () => {
    registerDef('def-goblin', 1);
    setRoomFear(ROOM_A, 4);
    const inhabitant = makeInhabitant({ assignedRoomId: undefined });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('normal');
  });

  it('should clear scared state from unassigned inhabitants', () => {
    registerDef('def-goblin', 1);
    const inhabitant = makeInhabitant({
      assignedRoomId: undefined,
      state: 'scared',
    });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('normal');
  });

  it('should handle multiple inhabitants in different rooms', () => {
    registerDef('def-goblin', 2);
    setRoomFear(ROOM_A, 3); // scary
    setRoomFear(ROOM_B, 1); // safe
    const scared = makeInhabitant({
      instanceId: 'i1' as InhabitantInstanceId,
      assignedRoomId: ROOM_A,
    });
    const safe = makeInhabitant({
      instanceId: 'i2' as InhabitantInstanceId,
      assignedRoomId: ROOM_B,
    });
    const state = makeGameState({ inhabitants: [scared, safe] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('scared');
    expect(state.world.inhabitants[1].state).toBe('normal');
  });

  it('should use default fear tolerance when not defined on creature', () => {
    // Default tolerance is 2, so fear 3 should scare
    registerDef('def-goblin');
    setRoomFear(ROOM_A, 3);
    const inhabitant = makeInhabitant({ assignedRoomId: ROOM_A });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    expect(state.world.inhabitants[0].state).toBe('scared');
  });

  it('should sync state changes to floor inhabitants', () => {
    registerDef('def-goblin', 1);
    setRoomFear(ROOM_A, 3);
    const worldInhabitant = makeInhabitant({ assignedRoomId: ROOM_A });
    const floorInhabitant = makeInhabitant({ assignedRoomId: ROOM_A });
    const state = makeGameState({
      inhabitants: [worldInhabitant],
      floorInhabitants: [floorInhabitant],
    });

    fearStateProcess(state);

    expect(state.world.floors[0].inhabitants[0].state).toBe('scared');
  });

  it('should not change state when inhabitant has no fear and is not scared', () => {
    registerDef('def-goblin', 2);
    setRoomFear(ROOM_A, 0);
    const inhabitant = makeInhabitant({
      assignedRoomId: ROOM_A,
      state: 'hungry',
      hungerTicksWithoutFood: 200,
    });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    // Should remain hungry — fear process doesn't touch non-scared states when fear is low
    expect(state.world.inhabitants[0].state).toBe('hungry');
  });

  it('should do nothing with empty inhabitants list', () => {
    const state = makeGameState({ inhabitants: [] });
    // Should not throw
    fearStateProcess(state);
  });

  it('should handle room with no fear data (defaults to 0)', () => {
    registerDef('def-goblin', 0); // tolerance 0 = scared at fear > 0
    // Don't set any room fear — roomFearMap is empty
    const inhabitant = makeInhabitant({ assignedRoomId: ROOM_A });
    const state = makeGameState({ inhabitants: [inhabitant] });

    fearStateProcess(state);

    // No fear data → defaults to 0, tolerance is 0, 0 > 0 is false → not scared
    expect(state.world.inhabitants[0].state).toBe('normal');
  });
});
