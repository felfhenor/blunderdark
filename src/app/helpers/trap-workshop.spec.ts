import type {
  Floor,
  GameState,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomUpgradePath,
  TrapCraftingQueue,
  TrapDefinition,
  TrapInventoryEntry,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const TRAP_WORKSHOP_ID = 'aa100001-0001-0001-0001-000000000013';
const PIT_TRAP_ID = 'aa800001-0001-0001-0001-000000000001';
const ARROW_TRAP_ID = 'aa800001-0001-0001-0001-000000000002';
const DARK_FORGE_ID = 'aa100001-0001-0001-0001-000000000006';

// --- Upgrade paths ---

const masterTrapperPath: RoomUpgradePath = {
  id: 'upgrade-master-trapper',
  name: 'Master Trapper',
  description: 'Expand workshop capacity.',
  cost: { gold: 120, crystals: 60, essence: 20 },
  effects: [
    { type: 'maxInhabitantBonus', value: 2 },
    { type: 'craftingSpeedMultiplier', value: 1.2 },
  ],
};

const efficientAssemblyPath: RoomUpgradePath = {
  id: 'upgrade-efficient-assembly',
  name: 'Efficient Assembly',
  description: 'Reduce costs and time.',
  cost: { gold: 100, crystals: 50 },
  effects: [
    { type: 'craftingCostMultiplier', value: 0.75 },
    { type: 'craftingSpeedMultiplier', value: 0.7 },
  ],
};

const enchantedTrapsPath: RoomUpgradePath = {
  id: 'upgrade-enchanted-traps',
  name: 'Enchanted Traps',
  description: 'Adds bonus damage.',
  cost: { gold: 130, crystals: 70, essence: 30 },
  effects: [{ type: 'craftingBonusDamage', value: 5 }],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
  getEntries: vi.fn(),
  contentAllIdsByName: vi.fn(() => new Map()),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'trapWorkshop') return TRAP_WORKSHOP_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

// --- Trap definitions ---

const pitTrapDef: TrapDefinition & IsContentItem = {
  id: PIT_TRAP_ID,
  name: 'Pit Trap',
  __type: 'trap',
  description: 'A concealed pit.',
  effectType: 'physical',
  damage: 15,
  duration: 1,
  charges: 3,
  craftCost: { gold: 30, crystals: 10 },
  triggerChance: 0.8,
  canBeDisarmed: true,
  sprite: 'trap-pit',
};

const arrowTrapDef: TrapDefinition & IsContentItem = {
  id: ARROW_TRAP_ID,
  name: 'Arrow Trap',
  __type: 'trap',
  description: 'Wall-mounted arrows.',
  effectType: 'physical',
  damage: 20,
  duration: 0,
  charges: 5,
  craftCost: { gold: 40, crystals: 15 },
  triggerChance: 0.7,
  canBeDisarmed: true,
  sprite: 'trap-arrow',
};

// --- Room definitions ---

const workshopDef: RoomDefinition & IsContentItem = {
  id: TRAP_WORKSHOP_ID,
  name: 'Trap Workshop',
  __type: 'room',
  description: 'Crafts traps.',
  shapeId: 'shape-2x2',
  cost: { gold: 90, crystals: 30 },
  production: {},
  requiresWorkers: false,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 2,
  fearReductionAura: 0,
  adjacencyBonuses: [
    {
      adjacentRoomType: DARK_FORGE_ID,
      bonus: 0.2,
      description: 'Dark Forge bonus.',
    },
  ],
  isUnique: false,
  removable: true,
  upgradePaths: [masterTrapperPath, efficientAssemblyPath, enchantedTrapsPath],
  autoPlace: false,
};

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'workshop-1',
    roomTypeId: TRAP_WORKSHOP_ID,
    shapeId: 'shape-2x2',
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

function makeInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inh-1',
    definitionId: 'def-1',
    name: 'Worker',
    state: 'normal',
    assignedRoomId: 'workshop-1',
    ...overrides,
  };
}

function makeFloor(
  rooms: PlacedRoom[] = [],
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
    traps: [],
  };
}

function makeGameState(overrides: {
  floors?: Floor[];
  trapInventory?: TrapInventoryEntry[];
  trapCraftingQueues?: TrapCraftingQueue[];
}): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameState['gameId'],
    clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 0, minute: 0 },
    world: {
      grid: [] as unknown as GameState['world']['grid'],
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
      season: { currentSeason: 'growth', dayInSeason: 1, totalSeasonCycles: 0 },
      research: {
        completedNodes: [],
        activeResearch: undefined,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
        unlockedContent: { rooms: [], inhabitants: [], abilities: [], upgrades: [], passiveBonuses: [] },
      },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: overrides.floors ?? [makeFloor()],
      currentFloorIndex: 0,
      trapInventory: overrides.trapInventory ?? [],
      trapCraftingQueues: overrides.trapCraftingQueues ?? [],
      forgeInventory: [],
      forgeCraftingQueues: [],
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
    },
  };
}

// --- Import after mocks ---

import {
  trapWorkshopAddJob,
  TRAP_WORKSHOP_BASE_CRAFTING_TICKS,
  trapWorkshopCanQueue,
  trapWorkshopGetCraftingCost,
  trapWorkshopGetCraftingTicks,
  trapWorkshopGetQueue,
  trapWorkshopProcess,
  trapWorkshopRemoveJob,
} from '@helpers/trap-workshop';

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(TRAP_WORKSHOP_ID, workshopDef);
  mockContent.set(PIT_TRAP_ID, pitTrapDef);
  mockContent.set(ARROW_TRAP_ID, arrowTrapDef);
});

// --- Tests ---

describe('Trap Workshop Room Definition', () => {
  it('should have correct definition properties', () => {
    expect(workshopDef.maxInhabitants).toBe(2);
    expect(workshopDef.fearLevel).toBe(2);
    expect(workshopDef.shapeId).toBe('shape-2x2');
    expect(workshopDef.requiresWorkers).toBe(false);
    expect(workshopDef.cost).toEqual({ gold: 90, crystals: 30 });
  });

  it('should have 3 mutually exclusive upgrade paths', () => {
    expect(workshopDef.upgradePaths).toHaveLength(3);
    expect(workshopDef.upgradePaths[0].name).toBe('Master Trapper');
    expect(workshopDef.upgradePaths[1].name).toBe('Efficient Assembly');
    expect(workshopDef.upgradePaths[2].name).toBe('Enchanted Traps');
  });

  it('should have adjacency bonuses', () => {
    expect(workshopDef.adjacencyBonuses).toHaveLength(1);
    expect(workshopDef.adjacencyBonuses[0].adjacentRoomType).toBe(DARK_FORGE_ID);
    expect(workshopDef.adjacencyBonuses[0].bonus).toBe(0.2);
  });
});

describe('Crafting Cost', () => {
  it('should return base cost when no upgrade applied', () => {
    const room = makeRoom();
    const cost = trapWorkshopGetCraftingCost(room, { gold: 30, crystals: 10 });
    expect(cost).toEqual({ gold: 30, crystals: 10 });
  });

  it('should reduce cost with Efficient Assembly upgrade', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-efficient-assembly',
    });
    const cost = trapWorkshopGetCraftingCost(room, { gold: 40, crystals: 16 });
    // 0.75 multiplier: gold 40*0.75=30, crystals 16*0.75=12
    expect(cost.gold).toBe(30);
    expect(cost.crystals).toBe(12);
  });

  it('should ceil fractional costs', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-efficient-assembly',
    });
    const cost = trapWorkshopGetCraftingCost(room, { gold: 30, crystals: 10 });
    // gold 30*0.75=22.5→23, crystals 10*0.75=7.5→8
    expect(cost.gold).toBe(23);
    expect(cost.crystals).toBe(8);
  });
});

describe('Crafting Time', () => {
  it('should return base time with 1 worker and no upgrades', () => {
    const room = makeRoom();
    const ticks = trapWorkshopGetCraftingTicks(room, 1);
    expect(ticks).toBe(TRAP_WORKSHOP_BASE_CRAFTING_TICKS);
  });

  it('should reduce time with 2 workers (20% faster)', () => {
    const room = makeRoom();
    const ticks = trapWorkshopGetCraftingTicks(room, 2);
    // 1 extra worker: 1 - 0.2 = 0.8, so 15 * 0.8 = 12
    expect(ticks).toBe(Math.round(TRAP_WORKSHOP_BASE_CRAFTING_TICKS * 0.8));
  });

  it('should reduce time with 3 workers (40% faster)', () => {
    const room = makeRoom();
    const ticks = trapWorkshopGetCraftingTicks(room, 3);
    // 2 extra workers: 1 - 0.4 = 0.6, so 15 * 0.6 = 9
    expect(ticks).toBe(Math.round(TRAP_WORKSHOP_BASE_CRAFTING_TICKS * 0.6));
  });

  it('should cap worker bonus at 60% reduction (0.4 floor)', () => {
    const room = makeRoom();
    const ticks = trapWorkshopGetCraftingTicks(room, 10);
    // Many workers: capped at 0.4 multiplier, so 15 * 0.4 = 6
    expect(ticks).toBe(Math.round(TRAP_WORKSHOP_BASE_CRAFTING_TICKS * 0.4));
  });

  it('should apply Efficient Assembly speed upgrade', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-efficient-assembly',
    });
    const ticks = trapWorkshopGetCraftingTicks(room, 1);
    // 0.7 multiplier: 15 * 0.7 = 10.5 → 11
    expect(ticks).toBe(Math.round(TRAP_WORKSHOP_BASE_CRAFTING_TICKS * 0.7));
  });

  it('should apply Master Trapper speed upgrade (slower)', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-master-trapper',
    });
    const ticks = trapWorkshopGetCraftingTicks(room, 1);
    // 1.2 multiplier: 15 * 1.2 = 18
    expect(ticks).toBe(Math.round(TRAP_WORKSHOP_BASE_CRAFTING_TICKS * 1.2));
  });

  it('should combine upgrade and worker bonuses', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-efficient-assembly',
    });
    const ticks = trapWorkshopGetCraftingTicks(room, 2);
    // 0.7 upgrade * 0.8 worker: 15 * 0.7 = 10.5 → 11 (rounded from upgrade)
    // Then 11 * 0.8 = 8.8 → 9 (rounded from worker)
    const afterUpgrade = Math.round(TRAP_WORKSHOP_BASE_CRAFTING_TICKS * 0.7);
    expect(ticks).toBe(Math.round(afterUpgrade * 0.8));
  });
});

describe('Queue Management', () => {
  describe('trapWorkshopGetQueue', () => {
    it('should find queue for existing room', () => {
      const queues: TrapCraftingQueue[] = [
        { roomId: 'room-1', jobs: [] },
        { roomId: 'room-2', jobs: [] },
      ];
      expect(trapWorkshopGetQueue(queues, 'room-1')?.roomId).toBe('room-1');
    });

    it('should return undefined for missing room', () => {
      expect(trapWorkshopGetQueue([], 'nonexistent')).toBeUndefined();
    });
  });

  describe('trapWorkshopAddJob', () => {
    it('should create new queue entry for room without existing queue', () => {
      const result = trapWorkshopAddJob([], 'room-1', PIT_TRAP_ID, 15);
      expect(result).toHaveLength(1);
      expect(result[0].roomId).toBe('room-1');
      expect(result[0].jobs).toHaveLength(1);
      expect(result[0].jobs[0].trapTypeId).toBe(PIT_TRAP_ID);
      expect(result[0].jobs[0].progress).toBe(0);
      expect(result[0].jobs[0].targetTicks).toBe(15);
    });

    it('should append job to existing queue', () => {
      const queues: TrapCraftingQueue[] = [
        {
          roomId: 'room-1',
          jobs: [{ trapTypeId: PIT_TRAP_ID, progress: 5, targetTicks: 15 }],
        },
      ];
      const result = trapWorkshopAddJob(queues, 'room-1', ARROW_TRAP_ID, 20);
      expect(result[0].jobs).toHaveLength(2);
      expect(result[0].jobs[1].trapTypeId).toBe(ARROW_TRAP_ID);
    });

    it('should not modify other room queues', () => {
      const queues: TrapCraftingQueue[] = [
        {
          roomId: 'room-other',
          jobs: [{ trapTypeId: PIT_TRAP_ID, progress: 0, targetTicks: 15 }],
        },
      ];
      const result = trapWorkshopAddJob(queues, 'room-1', ARROW_TRAP_ID, 20);
      expect(result).toHaveLength(2);
      expect(result[0].roomId).toBe('room-other');
      expect(result[0].jobs).toHaveLength(1);
    });
  });

  describe('trapWorkshopRemoveJob', () => {
    it('should remove job at specified index', () => {
      const queues: TrapCraftingQueue[] = [
        {
          roomId: 'room-1',
          jobs: [
            { trapTypeId: PIT_TRAP_ID, progress: 0, targetTicks: 15 },
            { trapTypeId: ARROW_TRAP_ID, progress: 0, targetTicks: 20 },
          ],
        },
      ];
      const result = trapWorkshopRemoveJob(queues, 'room-1', 0);
      expect(result[0].jobs).toHaveLength(1);
      expect(result[0].jobs[0].trapTypeId).toBe(ARROW_TRAP_ID);
    });

    it('should remove queue entry when last job removed', () => {
      const queues: TrapCraftingQueue[] = [
        {
          roomId: 'room-1',
          jobs: [{ trapTypeId: PIT_TRAP_ID, progress: 0, targetTicks: 15 }],
        },
      ];
      const result = trapWorkshopRemoveJob(queues, 'room-1', 0);
      expect(result).toHaveLength(0);
    });
  });
});

describe('trapWorkshopCanQueue', () => {
  it('should allow queuing with assigned worker', () => {
    const workshop = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: workshop.id });
    const floor = makeFloor([workshop], [worker]);

    const result = trapWorkshopCanQueue(workshop.id, [floor]);
    expect(result.canQueue).toBe(true);
    expect(result.room).toBeDefined();
  });

  it('should reject when no workers assigned', () => {
    const workshop = makeRoom();
    const floor = makeFloor([workshop], []);

    const result = trapWorkshopCanQueue(workshop.id, [floor]);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('inhabitant');
  });

  it('should reject for non-workshop room', () => {
    const room = makeRoom({ roomTypeId: 'other-type' });
    const worker = makeInhabitant({ assignedRoomId: room.id });
    const floor = makeFloor([room], [worker]);

    const result = trapWorkshopCanQueue(room.id, [floor]);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('not a Trap Workshop');
  });

  it('should return not found for missing room', () => {
    const floor = makeFloor();
    const result = trapWorkshopCanQueue('nonexistent', [floor]);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('not found');
  });
});

describe('trapWorkshopProcess', () => {
  it('should advance progress on first job in queue', () => {
    const workshop = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: workshop.id });
    const floor = makeFloor([workshop], [worker]);
    const state = makeGameState({
      floors: [floor],
      trapCraftingQueues: [
        {
          roomId: workshop.id,
          jobs: [{ trapTypeId: PIT_TRAP_ID, progress: 0, targetTicks: 5 }],
        },
      ],
    });

    trapWorkshopProcess(state);

    const queue = state.world.trapCraftingQueues[0];
    expect(queue.jobs[0].progress).toBe(1);
  });

  it('should complete job and add to inventory when progress reaches target', () => {
    const workshop = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: workshop.id });
    const floor = makeFloor([workshop], [worker]);
    const state = makeGameState({
      floors: [floor],
      trapCraftingQueues: [
        {
          roomId: workshop.id,
          jobs: [{ trapTypeId: PIT_TRAP_ID, progress: 4, targetTicks: 5 }],
        },
      ],
    });

    trapWorkshopProcess(state);

    // Job should be removed, queue cleaned up
    expect(state.world.trapCraftingQueues).toHaveLength(0);
    // Trap added to inventory
    expect(state.world.trapInventory).toHaveLength(1);
    expect(state.world.trapInventory[0].trapTypeId).toBe(PIT_TRAP_ID);
    expect(state.world.trapInventory[0].count).toBe(1);
  });

  it('should not progress when no workers assigned', () => {
    const workshop = makeRoom();
    const floor = makeFloor([workshop], []);
    const state = makeGameState({
      floors: [floor],
      trapCraftingQueues: [
        {
          roomId: workshop.id,
          jobs: [{ trapTypeId: PIT_TRAP_ID, progress: 0, targetTicks: 5 }],
        },
      ],
    });

    trapWorkshopProcess(state);

    expect(state.world.trapCraftingQueues[0].jobs[0].progress).toBe(0);
  });

  it('should only progress the first job in queue', () => {
    const workshop = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: workshop.id });
    const floor = makeFloor([workshop], [worker]);
    const state = makeGameState({
      floors: [floor],
      trapCraftingQueues: [
        {
          roomId: workshop.id,
          jobs: [
            { trapTypeId: PIT_TRAP_ID, progress: 0, targetTicks: 5 },
            { trapTypeId: ARROW_TRAP_ID, progress: 0, targetTicks: 10 },
          ],
        },
      ],
    });

    trapWorkshopProcess(state);

    expect(state.world.trapCraftingQueues[0].jobs[0].progress).toBe(1);
    expect(state.world.trapCraftingQueues[0].jobs[1].progress).toBe(0);
  });

  it('should process multiple workshops across floors', () => {
    const ws1 = makeRoom({ id: 'ws-1' });
    const ws2 = makeRoom({ id: 'ws-2' });
    const w1 = makeInhabitant({ instanceId: 'w1', assignedRoomId: 'ws-1' });
    const w2 = makeInhabitant({ instanceId: 'w2', assignedRoomId: 'ws-2' });
    const floor1 = makeFloor([ws1], [w1]);
    const floor2 = makeFloor([ws2], [w2]);
    floor2.id = 'floor-2';

    const state = makeGameState({
      floors: [floor1, floor2],
      trapCraftingQueues: [
        {
          roomId: 'ws-1',
          jobs: [{ trapTypeId: PIT_TRAP_ID, progress: 0, targetTicks: 5 }],
        },
        {
          roomId: 'ws-2',
          jobs: [{ trapTypeId: ARROW_TRAP_ID, progress: 0, targetTicks: 10 }],
        },
      ],
    });

    trapWorkshopProcess(state);

    expect(state.world.trapCraftingQueues[0].jobs[0].progress).toBe(1);
    expect(state.world.trapCraftingQueues[1].jobs[0].progress).toBe(1);
  });

  it('should accumulate inventory across completions', () => {
    const workshop = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: workshop.id });
    const floor = makeFloor([workshop], [worker]);
    const state = makeGameState({
      floors: [floor],
      trapInventory: [{ trapTypeId: PIT_TRAP_ID, count: 2 }],
      trapCraftingQueues: [
        {
          roomId: workshop.id,
          jobs: [{ trapTypeId: PIT_TRAP_ID, progress: 14, targetTicks: 15 }],
        },
      ],
    });

    trapWorkshopProcess(state);

    expect(state.world.trapInventory[0].count).toBe(3);
  });

  it('should advance to next job after completing first', () => {
    const workshop = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: workshop.id });
    const floor = makeFloor([workshop], [worker]);
    const state = makeGameState({
      floors: [floor],
      trapCraftingQueues: [
        {
          roomId: workshop.id,
          jobs: [
            { trapTypeId: PIT_TRAP_ID, progress: 4, targetTicks: 5 },
            { trapTypeId: ARROW_TRAP_ID, progress: 0, targetTicks: 10 },
          ],
        },
      ],
    });

    trapWorkshopProcess(state);

    // First job completed and removed
    expect(state.world.trapCraftingQueues[0].jobs).toHaveLength(1);
    expect(state.world.trapCraftingQueues[0].jobs[0].trapTypeId).toBe(ARROW_TRAP_ID);
    // Inventory updated
    expect(state.world.trapInventory[0].trapTypeId).toBe(PIT_TRAP_ID);
  });
});

describe('Upgrade Effects', () => {
  it('Master Trapper: increases capacity by 2 and crafting speed 1.2x', () => {
    expect(masterTrapperPath.effects).toContainEqual({
      type: 'maxInhabitantBonus',
      value: 2,
    });
    expect(masterTrapperPath.effects).toContainEqual({
      type: 'craftingSpeedMultiplier',
      value: 1.2,
    });
  });

  it('Efficient Assembly: reduces cost 0.75x and speed 0.7x', () => {
    expect(efficientAssemblyPath.effects).toContainEqual({
      type: 'craftingCostMultiplier',
      value: 0.75,
    });
    expect(efficientAssemblyPath.effects).toContainEqual({
      type: 'craftingSpeedMultiplier',
      value: 0.7,
    });
  });

  it('Enchanted Traps: adds 5 bonus damage', () => {
    expect(enchantedTrapsPath.effects).toContainEqual({
      type: 'craftingBonusDamage',
      value: 5,
    });
  });
});
