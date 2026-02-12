import { getEntry } from '@helpers/content';
import { rngUuid } from '@helpers/rng';
import type {
  Floor,
  GameState,
  IsContentItem,
  TrapDefinition,
  TrapInstance,
  TrapInventoryEntry,
} from '@interfaces';

// --- Trap Definition IDs ---

export const PIT_TRAP_ID = 'aa800001-0001-0001-0001-000000000001';
export const ARROW_TRAP_ID = 'aa800001-0001-0001-0001-000000000002';
export const RUNE_TRAP_ID = 'aa800001-0001-0001-0001-000000000003';
export const MAGIC_TRAP_ID = 'aa800001-0001-0001-0001-000000000004';
export const FEAR_GLYPH_ID = 'aa800001-0001-0001-0001-000000000005';

// --- Trap Definition Lookup ---

export function getTrapDefinition(
  trapTypeId: string,
): (TrapDefinition & IsContentItem) | undefined {
  return getEntry<TrapDefinition & IsContentItem>(trapTypeId);
}

// --- Trap Inventory ---

export function addToTrapInventory(
  inventory: TrapInventoryEntry[],
  trapTypeId: string,
  count = 1,
): TrapInventoryEntry[] {
  const updated = [...inventory];
  const existing = updated.find((e) => e.trapTypeId === trapTypeId);
  if (existing) {
    existing.count += count;
  } else {
    updated.push({ trapTypeId, count });
  }
  return updated;
}

export function removeFromTrapInventory(
  inventory: TrapInventoryEntry[],
  trapTypeId: string,
  count = 1,
): TrapInventoryEntry[] | null {
  const existing = inventory.find((e) => e.trapTypeId === trapTypeId);
  if (!existing || existing.count < count) return null;

  return inventory
    .map((e) =>
      e.trapTypeId === trapTypeId ? { ...e, count: e.count - count } : e,
    )
    .filter((e) => e.count > 0);
}

export function getTrapInventoryCount(
  inventory: TrapInventoryEntry[],
  trapTypeId: string,
): number {
  return inventory.find((e) => e.trapTypeId === trapTypeId)?.count ?? 0;
}

// --- Trap Placement ---

export function canPlaceTrap(
  floor: Floor,
  tileX: number,
  tileY: number,
): { canPlace: boolean; reason?: string } {
  const tile = floor.grid[tileY]?.[tileX];
  if (!tile) {
    return { canPlace: false, reason: 'Invalid tile coordinates' };
  }

  if (!tile.hallwayId) {
    return { canPlace: false, reason: 'Traps can only be placed in hallway tiles' };
  }

  const existingTrap = floor.traps?.find(
    (t) => t.tileX === tileX && t.tileY === tileY,
  );
  if (existingTrap) {
    return { canPlace: false, reason: 'A trap already exists on this tile' };
  }

  return { canPlace: true };
}

export function placeTrap(
  floor: Floor,
  trapTypeId: string,
  tileX: number,
  tileY: number,
): { floor: Floor; trap: TrapInstance } | null {
  const { canPlace } = canPlaceTrap(floor, tileX, tileY);
  if (!canPlace) return null;

  const def = getTrapDefinition(trapTypeId);
  if (!def) return null;

  const tile = floor.grid[tileY]?.[tileX];
  if (!tile?.hallwayId) return null;

  const trap: TrapInstance = {
    id: rngUuid(),
    trapTypeId,
    hallwayId: tile.hallwayId,
    tileX,
    tileY,
    remainingCharges: def.charges,
    isArmed: true,
  };

  return {
    floor: {
      ...floor,
      traps: [...(floor.traps ?? []), trap],
    },
    trap,
  };
}

export function removeTrap(
  floor: Floor,
  trapId: string,
): { floor: Floor; trap: TrapInstance } | null {
  const trap = (floor.traps ?? []).find((t) => t.id === trapId);
  if (!trap) return null;

  return {
    floor: {
      ...floor,
      traps: (floor.traps ?? []).filter((t) => t.id !== trapId),
    },
    trap,
  };
}

// --- Trap Trigger Logic ---

export type TrapTriggerResult = {
  triggered: boolean;
  disarmed: boolean;
  damage: number;
  effectType: string;
  duration: number;
  trapDestroyed: boolean;
  trapName: string;
  moralePenalty: number;
};

export function rollTrapTrigger(
  trap: TrapInstance,
  isRogue: boolean,
  roll: number,
): TrapTriggerResult {
  const def = getTrapDefinition(trap.trapTypeId);
  if (!def || !trap.isArmed || trap.remainingCharges <= 0) {
    return {
      triggered: false,
      disarmed: false,
      damage: 0,
      effectType: '',
      duration: 0,
      trapDestroyed: false,
      trapName: def?.name ?? 'Unknown',
      moralePenalty: 0,
    };
  }

  // Rogues attempt disarm (60% chance) unless trap cannot be disarmed
  if (isRogue && def.canBeDisarmed) {
    const disarmChance = 0.6;
    if (roll < disarmChance) {
      return {
        triggered: false,
        disarmed: true,
        damage: 0,
        effectType: '',
        duration: 0,
        trapDestroyed: false,
        trapName: def.name,
        moralePenalty: 0,
      };
    }
  }

  // Check trigger chance
  if (roll >= def.triggerChance) {
    return {
      triggered: false,
      disarmed: false,
      damage: 0,
      effectType: '',
      duration: 0,
      trapDestroyed: false,
      trapName: def.name,
      moralePenalty: 0,
    };
  }

  // Trap triggers
  const moralePenalty = def.effectType === 'fear' ? 10 : 0;
  const chargesAfter = trap.remainingCharges - 1;

  return {
    triggered: true,
    disarmed: false,
    damage: def.damage,
    effectType: def.effectType,
    duration: def.duration,
    trapDestroyed: chargesAfter <= 0,
    trapName: def.name,
    moralePenalty,
  };
}

export function applyTrapTrigger(
  floor: Floor,
  trapId: string,
  result: TrapTriggerResult,
): Floor {
  if (!result.triggered && !result.disarmed) return floor;

  const traps = [...(floor.traps ?? [])];
  const trapIndex = traps.findIndex((t) => t.id === trapId);
  if (trapIndex === -1) return floor;

  if (result.disarmed) {
    // Disarmed: remove the trap
    traps.splice(trapIndex, 1);
    return { ...floor, traps };
  }

  if (result.trapDestroyed) {
    // Charges exhausted: remove the trap
    traps.splice(trapIndex, 1);
    return { ...floor, traps };
  }

  // Decrement charges
  traps[trapIndex] = {
    ...traps[trapIndex],
    remainingCharges: traps[trapIndex].remainingCharges - 1,
  };

  return { ...floor, traps };
}

// --- Query Helpers ---

export function getTrapsOnFloor(floor: Floor): TrapInstance[] {
  return floor.traps ?? [];
}

export function getTrapAtTile(
  floor: Floor,
  tileX: number,
  tileY: number,
): TrapInstance | undefined {
  return (floor.traps ?? []).find(
    (t) => t.tileX === tileX && t.tileY === tileY,
  );
}

export function getTrapsInHallway(
  floor: Floor,
  hallwayId: string,
): TrapInstance[] {
  return (floor.traps ?? []).filter((t) => t.hallwayId === hallwayId);
}

// --- State Mutation (for gameloop integration) ---

export function processTraps(state: GameState): void {
  // Currently a no-op: traps are event-driven (triggered during invasions).
  // This hook exists for future tick-based trap mechanics (e.g., trap decay, recharging).
  void state;
}
