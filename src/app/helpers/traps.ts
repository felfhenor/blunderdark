import { contentGetEntry } from '@helpers/content';
import { rngUuid } from '@helpers/rng';
import type {
  Floor,
  GameState,
  IsContentItem,
  TrapDefinition,
  TrapInstance,
  TrapInventoryEntry,
} from '@interfaces';
import type { TrapTriggerResult } from '@interfaces/trap';

// --- Trap Definition Lookup ---

export function trapGetDefinition(
  trapTypeId: string,
): (TrapDefinition & IsContentItem) | undefined {
  return contentGetEntry<TrapDefinition & IsContentItem>(trapTypeId);
}

// --- Trap Inventory ---

export function trapAddToInventory(
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

export function trapRemoveFromInventory(
  inventory: TrapInventoryEntry[],
  trapTypeId: string,
  count = 1,
): TrapInventoryEntry[] | undefined {
  const existing = inventory.find((e) => e.trapTypeId === trapTypeId);
  if (!existing || existing.count < count) return undefined;

  return inventory
    .map((e) =>
      e.trapTypeId === trapTypeId ? { ...e, count: e.count - count } : e,
    )
    .filter((e) => e.count > 0);
}

export function trapGetInventoryCount(
  inventory: TrapInventoryEntry[],
  trapTypeId: string,
): number {
  return inventory.find((e) => e.trapTypeId === trapTypeId)?.count ?? 0;
}

// --- Trap Placement ---

export function trapCanPlace(
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

export function trapPlace(
  floor: Floor,
  trapTypeId: string,
  tileX: number,
  tileY: number,
): { floor: Floor; trap: TrapInstance } | undefined {
  const { canPlace } = trapCanPlace(floor, tileX, tileY);
  if (!canPlace) return undefined;

  const def = trapGetDefinition(trapTypeId);
  if (!def) return undefined;

  const tile = floor.grid[tileY]?.[tileX];
  if (!tile?.hallwayId) return undefined;

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

export function trapRemove(
  floor: Floor,
  trapId: string,
): { floor: Floor; trap: TrapInstance } | undefined {
  const trap = (floor.traps ?? []).find((t) => t.id === trapId);
  if (!trap) return undefined;

  return {
    floor: {
      ...floor,
      traps: (floor.traps ?? []).filter((t) => t.id !== trapId),
    },
    trap,
  };
}

export function trapRollTrigger(
  trap: TrapInstance,
  isRogue: boolean,
  roll: number,
): TrapTriggerResult {
  const def = trapGetDefinition(trap.trapTypeId);
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

export function trapApplyTrigger(
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

export function trapGetOnFloor(floor: Floor): TrapInstance[] {
  return floor.traps ?? [];
}

export function trapGetAtTile(
  floor: Floor,
  tileX: number,
  tileY: number,
): TrapInstance | undefined {
  return (floor.traps ?? []).find(
    (t) => t.tileX === tileX && t.tileY === tileY,
  );
}

export function trapGetInHallway(
  floor: Floor,
  hallwayId: string,
): TrapInstance[] {
  return (floor.traps ?? []).filter((t) => t.hallwayId === hallwayId);
}

// --- State Mutation (for gameloop integration) ---

export function trapProcess(state: GameState): void {
  // Currently a no-op: traps are event-driven (triggered during invasions).
  // This hook exists for future tick-based trap mechanics (e.g., trap decay, recharging).
  void state;
}
