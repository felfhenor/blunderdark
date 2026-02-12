import type {
  Floor,
  GridTile,
  IsContentItem,
  TrapDefinition,
  TrapInstance,
  TrapInventoryEntry,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Trap Definition IDs ---

const PIT_TRAP_ID = 'aa800001-0001-0001-0001-000000000001';
const ARROW_TRAP_ID = 'aa800001-0001-0001-0001-000000000002';
const RUNE_TRAP_ID = 'aa800001-0001-0001-0001-000000000003';
const MAGIC_TRAP_ID = 'aa800001-0001-0001-0001-000000000004';
const FEAR_GLYPH_ID = 'aa800001-0001-0001-0001-000000000005';

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id) ?? undefined,
  getEntriesByType: vi.fn(() => []),
  getEntries: vi.fn(),
  allIdsByName: vi.fn(() => new Map()),
}));

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'mock-uuid-' + Math.random().toString(36).slice(2, 8),
}));

// --- Trap definitions ---

function makeTrapDef(
  overrides: Partial<TrapDefinition & IsContentItem> = {},
): TrapDefinition & IsContentItem {
  return {
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
    ...overrides,
  };
}

const pitTrapDef = makeTrapDef();

const arrowTrapDef = makeTrapDef({
  id: ARROW_TRAP_ID,
  name: 'Arrow Trap',
  effectType: 'physical',
  damage: 20,
  duration: 0,
  charges: 5,
  triggerChance: 0.7,
  canBeDisarmed: true,
  sprite: 'trap-arrow',
  craftCost: { gold: 40, crystals: 15 },
});

const runeTrapDef = makeTrapDef({
  id: RUNE_TRAP_ID,
  name: 'Rune Trap',
  effectType: 'magic',
  damage: 25,
  duration: 0,
  charges: 2,
  triggerChance: 0.9,
  canBeDisarmed: false,
  sprite: 'trap-rune',
  craftCost: { gold: 50, essence: 20 },
});

const magicTrapDef = makeTrapDef({
  id: MAGIC_TRAP_ID,
  name: 'Magic Trap',
  effectType: 'debuff',
  damage: 0,
  duration: 3,
  charges: 4,
  triggerChance: 0.75,
  canBeDisarmed: true,
  sprite: 'trap-magic',
  craftCost: { gold: 35, flux: 15 },
});

const fearGlyphDef = makeTrapDef({
  id: FEAR_GLYPH_ID,
  name: 'Fear Glyph',
  effectType: 'fear',
  damage: 8,
  duration: 2,
  charges: 3,
  triggerChance: 0.85,
  canBeDisarmed: true,
  sprite: 'trap-fear',
  craftCost: { gold: 25, essence: 10 },
});

// --- Helpers ---

function makeTile(overrides: Partial<GridTile> = {}): GridTile {
  return {
    occupied: false,
    occupiedBy: 'empty',
    roomId: null,
    hallwayId: null,
    connectionType: null,
    ...overrides,
  };
}

function makeGrid(size = 5): GridTile[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => makeTile()),
  );
}

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: makeGrid(),
    rooms: [],
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
    ...overrides,
  };
}

function makeTrapInstance(
  overrides: Partial<TrapInstance> = {},
): TrapInstance {
  return {
    id: 'trap-1',
    trapTypeId: PIT_TRAP_ID,
    hallwayId: 'hallway-1',
    tileX: 2,
    tileY: 2,
    remainingCharges: 3,
    isArmed: true,
    ...overrides,
  };
}

// --- Import after mocks ---

import {
  addToTrapInventory,
  applyTrapTrigger,
  canPlaceTrap,
  getTrapAtTile,
  getTrapInventoryCount,
  getTrapsInHallway,
  getTrapsOnFloor,
  placeTrap,
  removeFromTrapInventory,
  removeTrap,
  rollTrapTrigger,
} from '@helpers/traps';

// --- Tests ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(PIT_TRAP_ID, pitTrapDef);
  mockContent.set(ARROW_TRAP_ID, arrowTrapDef);
  mockContent.set(RUNE_TRAP_ID, runeTrapDef);
  mockContent.set(MAGIC_TRAP_ID, magicTrapDef);
  mockContent.set(FEAR_GLYPH_ID, fearGlyphDef);
});

describe('Trap Inventory', () => {
  describe('addToTrapInventory', () => {
    it('should add a new trap type to empty inventory', () => {
      const result = addToTrapInventory([], PIT_TRAP_ID, 2);
      expect(result).toEqual([{ trapTypeId: PIT_TRAP_ID, count: 2 }]);
    });

    it('should increment count for existing trap type', () => {
      const inventory: TrapInventoryEntry[] = [
        { trapTypeId: PIT_TRAP_ID, count: 3 },
      ];
      const result = addToTrapInventory(inventory, PIT_TRAP_ID, 2);
      expect(result).toEqual([{ trapTypeId: PIT_TRAP_ID, count: 5 }]);
    });

    it('should default to adding 1', () => {
      const result = addToTrapInventory([], ARROW_TRAP_ID);
      expect(result).toEqual([{ trapTypeId: ARROW_TRAP_ID, count: 1 }]);
    });

    it('should handle multiple trap types', () => {
      let inv: TrapInventoryEntry[] = [];
      inv = addToTrapInventory(inv, PIT_TRAP_ID, 2);
      inv = addToTrapInventory(inv, ARROW_TRAP_ID, 3);
      expect(inv).toHaveLength(2);
      expect(getTrapInventoryCount(inv, PIT_TRAP_ID)).toBe(2);
      expect(getTrapInventoryCount(inv, ARROW_TRAP_ID)).toBe(3);
    });
  });

  describe('removeFromTrapInventory', () => {
    it('should decrement count', () => {
      const inventory: TrapInventoryEntry[] = [
        { trapTypeId: PIT_TRAP_ID, count: 3 },
      ];
      const result = removeFromTrapInventory(inventory, PIT_TRAP_ID, 1);
      expect(result).toEqual([{ trapTypeId: PIT_TRAP_ID, count: 2 }]);
    });

    it('should remove entry when count reaches 0', () => {
      const inventory: TrapInventoryEntry[] = [
        { trapTypeId: PIT_TRAP_ID, count: 1 },
      ];
      const result = removeFromTrapInventory(inventory, PIT_TRAP_ID, 1);
      expect(result).toEqual([]);
    });

    it('should return null if insufficient count', () => {
      const inventory: TrapInventoryEntry[] = [
        { trapTypeId: PIT_TRAP_ID, count: 1 },
      ];
      const result = removeFromTrapInventory(inventory, PIT_TRAP_ID, 5);
      expect(result).toBeNull();
    });

    it('should return null if trap type not in inventory', () => {
      const result = removeFromTrapInventory([], PIT_TRAP_ID, 1);
      expect(result).toBeNull();
    });
  });

  describe('getTrapInventoryCount', () => {
    it('should return 0 for missing trap type', () => {
      expect(getTrapInventoryCount([], PIT_TRAP_ID)).toBe(0);
    });

    it('should return correct count', () => {
      const inv: TrapInventoryEntry[] = [
        { trapTypeId: RUNE_TRAP_ID, count: 7 },
      ];
      expect(getTrapInventoryCount(inv, RUNE_TRAP_ID)).toBe(7);
    });
  });
});

describe('Trap Placement', () => {
  describe('canPlaceTrap', () => {
    it('should allow placement on hallway tile', () => {
      const grid = makeGrid();
      grid[2][2] = makeTile({
        occupied: true,
        occupiedBy: 'hallway',
        hallwayId: 'h-1',
      });
      const floor = makeFloor({ grid });

      const result = canPlaceTrap(floor, 2, 2);
      expect(result.canPlace).toBe(true);
    });

    it('should reject placement on empty tile', () => {
      const floor = makeFloor();
      const result = canPlaceTrap(floor, 2, 2);
      expect(result.canPlace).toBe(false);
      expect(result.reason).toContain('hallway');
    });

    it('should reject placement on room tile', () => {
      const grid = makeGrid();
      grid[2][2] = makeTile({
        occupied: true,
        occupiedBy: 'room',
        roomId: 'room-1',
      });
      const floor = makeFloor({ grid });

      const result = canPlaceTrap(floor, 2, 2);
      expect(result.canPlace).toBe(false);
      expect(result.reason).toContain('hallway');
    });

    it('should reject placement on tile with existing trap', () => {
      const grid = makeGrid();
      grid[2][2] = makeTile({
        occupied: true,
        occupiedBy: 'hallway',
        hallwayId: 'h-1',
      });
      const existingTrap = makeTrapInstance({ tileX: 2, tileY: 2 });
      const floor = makeFloor({ grid, traps: [existingTrap] });

      const result = canPlaceTrap(floor, 2, 2);
      expect(result.canPlace).toBe(false);
      expect(result.reason).toContain('already exists');
    });

    it('should reject out-of-bounds coordinates', () => {
      const floor = makeFloor();
      const result = canPlaceTrap(floor, 99, 99);
      expect(result.canPlace).toBe(false);
      expect(result.reason).toContain('Invalid');
    });
  });

  describe('placeTrap', () => {
    it('should place a trap on a valid hallway tile', () => {
      const grid = makeGrid();
      grid[3][1] = makeTile({
        occupied: true,
        occupiedBy: 'hallway',
        hallwayId: 'h-1',
      });
      const floor = makeFloor({ grid });

      const result = placeTrap(floor, PIT_TRAP_ID, 1, 3);
      expect(result).not.toBeNull();
      expect(result!.trap.trapTypeId).toBe(PIT_TRAP_ID);
      expect(result!.trap.hallwayId).toBe('h-1');
      expect(result!.trap.tileX).toBe(1);
      expect(result!.trap.tileY).toBe(3);
      expect(result!.trap.remainingCharges).toBe(3);
      expect(result!.trap.isArmed).toBe(true);
      expect(result!.floor.traps).toHaveLength(1);
    });

    it('should return null for invalid placement', () => {
      const floor = makeFloor();
      const result = placeTrap(floor, PIT_TRAP_ID, 0, 0);
      expect(result).toBeNull();
    });

    it('should return null for unknown trap type', () => {
      const grid = makeGrid();
      grid[0][0] = makeTile({
        occupied: true,
        occupiedBy: 'hallway',
        hallwayId: 'h-1',
      });
      const floor = makeFloor({ grid });

      const result = placeTrap(floor, 'nonexistent-id', 0, 0);
      expect(result).toBeNull();
    });

    it('should set charges from trap definition', () => {
      const grid = makeGrid();
      grid[0][0] = makeTile({
        occupied: true,
        occupiedBy: 'hallway',
        hallwayId: 'h-1',
      });
      const floor = makeFloor({ grid });

      const result = placeTrap(floor, ARROW_TRAP_ID, 0, 0);
      expect(result!.trap.remainingCharges).toBe(5); // Arrow Trap has 5 charges
    });
  });

  describe('removeTrap', () => {
    it('should remove a trap and return it', () => {
      const trap = makeTrapInstance({ id: 'trap-to-remove' });
      const floor = makeFloor({ traps: [trap] });

      const result = removeTrap(floor, 'trap-to-remove');
      expect(result).not.toBeNull();
      expect(result!.trap.id).toBe('trap-to-remove');
      expect(result!.floor.traps).toHaveLength(0);
    });

    it('should return null for non-existent trap', () => {
      const floor = makeFloor();
      const result = removeTrap(floor, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should only remove the specified trap', () => {
      const trap1 = makeTrapInstance({ id: 'trap-1', tileX: 0, tileY: 0 });
      const trap2 = makeTrapInstance({ id: 'trap-2', tileX: 1, tileY: 1 });
      const floor = makeFloor({ traps: [trap1, trap2] });

      const result = removeTrap(floor, 'trap-1');
      expect(result!.floor.traps).toHaveLength(1);
      expect(result!.floor.traps[0].id).toBe('trap-2');
    });
  });
});

describe('Trap Trigger', () => {
  describe('rollTrapTrigger', () => {
    it('should trigger when roll is below trigger chance', () => {
      const trap = makeTrapInstance({ trapTypeId: PIT_TRAP_ID });
      // Pit Trap has 80% trigger chance; roll 0.5 < 0.8 → triggers
      const result = rollTrapTrigger(trap, false, 0.5);
      expect(result.triggered).toBe(true);
      expect(result.damage).toBe(15);
      expect(result.effectType).toBe('physical');
      expect(result.duration).toBe(1);
      expect(result.trapName).toBe('Pit Trap');
    });

    it('should not trigger when roll exceeds trigger chance', () => {
      const trap = makeTrapInstance({ trapTypeId: PIT_TRAP_ID });
      // Pit Trap has 80% trigger chance; roll 0.9 >= 0.8 → fails
      const result = rollTrapTrigger(trap, false, 0.9);
      expect(result.triggered).toBe(false);
      expect(result.damage).toBe(0);
    });

    it('should not trigger when trap is disarmed', () => {
      const trap = makeTrapInstance({ isArmed: false });
      const result = rollTrapTrigger(trap, false, 0.1);
      expect(result.triggered).toBe(false);
    });

    it('should not trigger when no charges remain', () => {
      const trap = makeTrapInstance({ remainingCharges: 0 });
      const result = rollTrapTrigger(trap, false, 0.1);
      expect(result.triggered).toBe(false);
    });

    it('should mark trap as destroyed when it was on last charge', () => {
      const trap = makeTrapInstance({
        trapTypeId: PIT_TRAP_ID,
        remainingCharges: 1,
      });
      const result = rollTrapTrigger(trap, false, 0.1);
      expect(result.triggered).toBe(true);
      expect(result.trapDestroyed).toBe(true);
    });

    it('should not mark trap as destroyed when charges remain', () => {
      const trap = makeTrapInstance({
        trapTypeId: PIT_TRAP_ID,
        remainingCharges: 3,
      });
      const result = rollTrapTrigger(trap, false, 0.1);
      expect(result.triggered).toBe(true);
      expect(result.trapDestroyed).toBe(false);
    });

    describe('Rogue disarm', () => {
      it('should allow rogue to disarm with low roll', () => {
        const trap = makeTrapInstance({ trapTypeId: PIT_TRAP_ID });
        // Rogue disarm chance is 60%; roll 0.3 < 0.6 → disarmed
        const result = rollTrapTrigger(trap, true, 0.3);
        expect(result.triggered).toBe(false);
        expect(result.disarmed).toBe(true);
      });

      it('should still trigger for rogue when roll exceeds disarm chance but within trigger chance', () => {
        const trap = makeTrapInstance({ trapTypeId: PIT_TRAP_ID });
        // Rogue disarm: roll 0.65 >= 0.6 → not disarmed
        // Trigger: roll 0.65 < 0.8 → triggers
        const result = rollTrapTrigger(trap, true, 0.65);
        expect(result.triggered).toBe(true);
        expect(result.disarmed).toBe(false);
      });

      it('should NOT allow rogue to disarm Rune Trap (canBeDisarmed: false)', () => {
        const trap = makeTrapInstance({ trapTypeId: RUNE_TRAP_ID });
        // Rune Trap has canBeDisarmed: false; roll 0.1 should still trigger
        const result = rollTrapTrigger(trap, true, 0.1);
        expect(result.triggered).toBe(true);
        expect(result.disarmed).toBe(false);
        expect(result.effectType).toBe('magic');
      });
    });

    describe('Fear Glyph morale penalty', () => {
      it('should apply morale penalty for Fear Glyph', () => {
        const trap = makeTrapInstance({ trapTypeId: FEAR_GLYPH_ID });
        const result = rollTrapTrigger(trap, false, 0.1);
        expect(result.triggered).toBe(true);
        expect(result.moralePenalty).toBe(10);
        expect(result.damage).toBe(8);
      });

      it('should not apply morale penalty for non-fear traps', () => {
        const trap = makeTrapInstance({ trapTypeId: PIT_TRAP_ID });
        const result = rollTrapTrigger(trap, false, 0.1);
        expect(result.moralePenalty).toBe(0);
      });
    });

    describe('Trap effect types', () => {
      it('Arrow Trap: physical damage, no duration', () => {
        const trap = makeTrapInstance({ trapTypeId: ARROW_TRAP_ID });
        const result = rollTrapTrigger(trap, false, 0.1);
        expect(result.triggered).toBe(true);
        expect(result.damage).toBe(20);
        expect(result.effectType).toBe('physical');
        expect(result.duration).toBe(0);
      });

      it('Rune Trap: magic damage', () => {
        const trap = makeTrapInstance({ trapTypeId: RUNE_TRAP_ID });
        const result = rollTrapTrigger(trap, false, 0.1);
        expect(result.triggered).toBe(true);
        expect(result.damage).toBe(25);
        expect(result.effectType).toBe('magic');
      });

      it('Magic Trap: debuff with duration', () => {
        const trap = makeTrapInstance({ trapTypeId: MAGIC_TRAP_ID });
        const result = rollTrapTrigger(trap, false, 0.1);
        expect(result.triggered).toBe(true);
        expect(result.damage).toBe(0);
        expect(result.effectType).toBe('debuff');
        expect(result.duration).toBe(3);
      });
    });
  });

  describe('applyTrapTrigger', () => {
    it('should decrement charges on trigger', () => {
      const trap = makeTrapInstance({ id: 'trap-1', remainingCharges: 3 });
      const floor = makeFloor({ traps: [trap] });
      const result = { triggered: true, disarmed: false, trapDestroyed: false } as ReturnType<typeof rollTrapTrigger>;

      const updated = applyTrapTrigger(floor, 'trap-1', result);
      expect(updated.traps[0].remainingCharges).toBe(2);
    });

    it('should remove trap when destroyed', () => {
      const trap = makeTrapInstance({ id: 'trap-1', remainingCharges: 1 });
      const floor = makeFloor({ traps: [trap] });
      const result = { triggered: true, disarmed: false, trapDestroyed: true } as ReturnType<typeof rollTrapTrigger>;

      const updated = applyTrapTrigger(floor, 'trap-1', result);
      expect(updated.traps).toHaveLength(0);
    });

    it('should remove trap when disarmed', () => {
      const trap = makeTrapInstance({ id: 'trap-1' });
      const floor = makeFloor({ traps: [trap] });
      const result = { triggered: false, disarmed: true, trapDestroyed: false } as ReturnType<typeof rollTrapTrigger>;

      const updated = applyTrapTrigger(floor, 'trap-1', result);
      expect(updated.traps).toHaveLength(0);
    });

    it('should not modify floor when trigger failed', () => {
      const trap = makeTrapInstance({ id: 'trap-1' });
      const floor = makeFloor({ traps: [trap] });
      const result = { triggered: false, disarmed: false, trapDestroyed: false } as ReturnType<typeof rollTrapTrigger>;

      const updated = applyTrapTrigger(floor, 'trap-1', result);
      expect(updated).toBe(floor); // Same reference, no changes
    });

    it('should not modify floor for non-existent trap', () => {
      const floor = makeFloor();
      const result = { triggered: true, disarmed: false, trapDestroyed: false } as ReturnType<typeof rollTrapTrigger>;

      const updated = applyTrapTrigger(floor, 'nonexistent', result);
      expect(updated).toBe(floor);
    });
  });
});

describe('Query Helpers', () => {
  describe('getTrapsOnFloor', () => {
    it('should return all traps on the floor', () => {
      const traps = [
        makeTrapInstance({ id: 'trap-1' }),
        makeTrapInstance({ id: 'trap-2' }),
      ];
      const floor = makeFloor({ traps });
      expect(getTrapsOnFloor(floor)).toHaveLength(2);
    });

    it('should return empty array for floor with no traps', () => {
      const floor = makeFloor();
      expect(getTrapsOnFloor(floor)).toHaveLength(0);
    });
  });

  describe('getTrapAtTile', () => {
    it('should find trap at specific tile', () => {
      const trap = makeTrapInstance({ tileX: 3, tileY: 4 });
      const floor = makeFloor({ traps: [trap] });
      const found = getTrapAtTile(floor, 3, 4);
      expect(found).toBeDefined();
      expect(found!.tileX).toBe(3);
    });

    it('should return undefined for empty tile', () => {
      const floor = makeFloor();
      expect(getTrapAtTile(floor, 0, 0)).toBeUndefined();
    });
  });

  describe('getTrapsInHallway', () => {
    it('should return traps for specific hallway', () => {
      const trap1 = makeTrapInstance({ id: 'trap-1', hallwayId: 'h-1' });
      const trap2 = makeTrapInstance({ id: 'trap-2', hallwayId: 'h-2' });
      const trap3 = makeTrapInstance({ id: 'trap-3', hallwayId: 'h-1' });
      const floor = makeFloor({ traps: [trap1, trap2, trap3] });

      const result = getTrapsInHallway(floor, 'h-1');
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(['trap-1', 'trap-3']);
    });

    it('should return empty array for hallway with no traps', () => {
      const floor = makeFloor();
      expect(getTrapsInHallway(floor, 'h-1')).toHaveLength(0);
    });
  });
});

describe('Trap Definitions', () => {
  it('Pit Trap: 80% trigger, 3 charges, physical, slows 1 turn', () => {
    expect(pitTrapDef.triggerChance).toBe(0.8);
    expect(pitTrapDef.charges).toBe(3);
    expect(pitTrapDef.effectType).toBe('physical');
    expect(pitTrapDef.duration).toBe(1);
    expect(pitTrapDef.damage).toBe(15);
    expect(pitTrapDef.canBeDisarmed).toBe(true);
  });

  it('Arrow Trap: 70% trigger, 5 charges, physical', () => {
    expect(arrowTrapDef.triggerChance).toBe(0.7);
    expect(arrowTrapDef.charges).toBe(5);
    expect(arrowTrapDef.effectType).toBe('physical');
    expect(arrowTrapDef.damage).toBe(20);
    expect(arrowTrapDef.canBeDisarmed).toBe(true);
  });

  it('Rune Trap: 90% trigger, 2 charges, magic, cannot be disarmed', () => {
    expect(runeTrapDef.triggerChance).toBe(0.9);
    expect(runeTrapDef.charges).toBe(2);
    expect(runeTrapDef.effectType).toBe('magic');
    expect(runeTrapDef.damage).toBe(25);
    expect(runeTrapDef.canBeDisarmed).toBe(false);
  });

  it('Magic Trap: 75% trigger, 4 charges, debuff 3 turns', () => {
    expect(magicTrapDef.triggerChance).toBe(0.75);
    expect(magicTrapDef.charges).toBe(4);
    expect(magicTrapDef.effectType).toBe('debuff');
    expect(magicTrapDef.duration).toBe(3);
    expect(magicTrapDef.canBeDisarmed).toBe(true);
  });

  it('Fear Glyph: 85% trigger, 3 charges, fear effect', () => {
    expect(fearGlyphDef.triggerChance).toBe(0.85);
    expect(fearGlyphDef.charges).toBe(3);
    expect(fearGlyphDef.effectType).toBe('fear');
    expect(fearGlyphDef.damage).toBe(8);
    expect(fearGlyphDef.canBeDisarmed).toBe(true);
  });
});
