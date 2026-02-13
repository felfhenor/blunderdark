import { computed } from '@angular/core';
import { altarRoomGetFearReductionAura, altarRoomIsAdjacent } from '@helpers/altar-room';
import { contentGetEntry } from '@helpers/content';
import { productionGetRoomDefinition } from '@helpers/production';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { gamestate } from '@helpers/state-game';
import { throneRoomGetFearLevel } from '@helpers/throne-room';
import type {
  Floor,
  InhabitantDefinition,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
} from '@interfaces';

// --- Constants ---

export const FEAR_LEVEL_NONE = 0;
export const FEAR_LEVEL_LOW = 1;
export const FEAR_LEVEL_MEDIUM = 2;
export const FEAR_LEVEL_HIGH = 3;
export const FEAR_LEVEL_VERY_HIGH = 4;

export const FEAR_LEVEL_MIN = 0;
export const FEAR_LEVEL_MAX = 4;

export const FEAR_LEVEL_LABELS: Record<number, string> = {
  [FEAR_LEVEL_NONE]: 'None',
  [FEAR_LEVEL_LOW]: 'Low',
  [FEAR_LEVEL_MEDIUM]: 'Medium',
  [FEAR_LEVEL_HIGH]: 'High',
  [FEAR_LEVEL_VERY_HIGH]: 'Very High',
};

// --- Types ---

export type FearLevelBreakdown = {
  baseFear: number;
  inhabitantModifier: number;
  upgradeAdjustment: number;
  altarAuraReduction: number;
  effectiveFear: number;
};

// --- Pure functions ---

export function fearLevelGetLabel(level: number): string {
  return FEAR_LEVEL_LABELS[level] ?? 'Unknown';
}

export function fearLevelCalculateInhabitantModifier(
  roomId: string,
  inhabitants: InhabitantInstance[],
): number {
  let modifier = 0;

  for (const inhabitant of inhabitants) {
    if (inhabitant.assignedRoomId !== roomId) continue;

    const def = contentGetEntry<InhabitantDefinition & IsContentItem>(
      inhabitant.definitionId,
    );
    if (!def) continue;

    modifier += def.fearModifier ?? 0;
  }

  return modifier;
}

export function fearLevelCalculateUpgradeAdjustment(
  placedRoom: PlacedRoom,
): number {
  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  let adjustment = 0;

  for (const effect of effects) {
    if (effect.type === 'fearReduction') {
      adjustment -= effect.value;
    } else if (effect.type === 'fearIncrease') {
      adjustment += effect.value;
    }
  }

  return adjustment;
}

export function fearLevelCalculateEffective(
  baseFear: number,
  inhabitantModifier: number,
  upgradeAdjustment: number,
  altarAuraReduction: number,
): number {
  const raw = baseFear + inhabitantModifier + upgradeAdjustment - altarAuraReduction;
  return Math.max(FEAR_LEVEL_MIN, Math.min(FEAR_LEVEL_MAX, raw));
}

export function fearLevelGetForRoom(
  floor: Floor,
  placedRoom: PlacedRoom,
  roomDef: RoomDefinition,
  throneRoomFear?: number,
): FearLevelBreakdown {
  const baseFear =
    roomDef.fearLevel === 'variable'
      ? (throneRoomFear ?? 0)
      : roomDef.fearLevel;

  const inhabitantModifier = fearLevelCalculateInhabitantModifier(
    placedRoom.id,
    floor.inhabitants,
  );

  const upgradeAdjustment = fearLevelCalculateUpgradeAdjustment(placedRoom);

  const altarAuraReduction = altarRoomIsAdjacent(floor, placedRoom)
    ? altarRoomGetFearReductionAura([floor])
    : 0;

  const effectiveFear = fearLevelCalculateEffective(
    baseFear,
    inhabitantModifier,
    upgradeAdjustment,
    altarAuraReduction,
  );

  return {
    baseFear,
    inhabitantModifier,
    upgradeAdjustment,
    altarAuraReduction,
    effectiveFear,
  };
}

export function fearLevelCalculateAllForFloor(
  floor: Floor,
  throneRoomFear?: number,
): Map<string, FearLevelBreakdown> {
  const result = new Map<string, FearLevelBreakdown>();

  for (const placedRoom of floor.rooms) {
    const roomDef = productionGetRoomDefinition(placedRoom.roomTypeId);
    if (!roomDef) continue;

    const breakdown = fearLevelGetForRoom(
      floor,
      placedRoom,
      roomDef,
      throneRoomFear,
    );
    result.set(placedRoom.id, breakdown);
  }

  return result;
}

// --- Computed signals ---

export const fearLevelBreakdownMap = computed<Map<string, FearLevelBreakdown>>(
  () => {
    const state = gamestate();
    const floors = state.world.floors;
    const throneRoomFear = throneRoomGetFearLevel(floors) ?? undefined;
    const combined = new Map<string, FearLevelBreakdown>();

    for (const floor of floors) {
      const floorMap = fearLevelCalculateAllForFloor(floor, throneRoomFear);
      for (const [roomId, breakdown] of floorMap) {
        combined.set(roomId, breakdown);
      }
    }

    return combined;
  },
);

export const fearLevelRoomMap = computed<Map<string, number>>(() => {
  const breakdowns = fearLevelBreakdownMap();
  const result = new Map<string, number>();

  for (const [roomId, breakdown] of breakdowns) {
    result.set(roomId, breakdown.effectiveFear);
  }

  return result;
});
