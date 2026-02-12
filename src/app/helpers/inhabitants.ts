import { computed, type Signal } from '@angular/core';
import { getEntry } from '@helpers/content';
import { getEffectiveMaxInhabitants } from '@helpers/room-upgrades';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  InhabitantDefinition,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
} from '@interfaces';

export function allInhabitants(): Signal<InhabitantInstance[]> {
  return computed(() => gamestate().world.inhabitants);
}

export function getInhabitant(
  instanceId: string,
): Signal<InhabitantInstance | undefined> {
  return computed(() =>
    gamestate().world.inhabitants.find((i) => i.instanceId === instanceId),
  );
}

export async function addInhabitant(
  inhabitant: InhabitantInstance,
): Promise<void> {
  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      inhabitants: [...state.world.inhabitants, inhabitant],
    },
  }));
}

export async function removeInhabitant(instanceId: string): Promise<void> {
  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      inhabitants: state.world.inhabitants.filter(
        (i) => i.instanceId !== instanceId,
      ),
    },
  }));
}

export function serializeInhabitants(
  inhabitants: InhabitantInstance[],
): InhabitantInstance[] {
  return inhabitants.map((i) => ({ ...i }));
}

export function deserializeInhabitants(
  data: InhabitantInstance[],
): InhabitantInstance[] {
  return data.map((i) => ({
    instanceId: i.instanceId,
    definitionId: i.definitionId,
    name: i.name,
    state: i.state ?? 'normal',
    assignedRoomId: i.assignedRoomId ?? undefined,
    trained: i.trained ?? false,
    trainingProgress: i.trainingProgress ?? 0,
    trainingBonuses: i.trainingBonuses ?? { defense: 0, attack: 0 },
  }));
}

// --- Inhabitant restriction validation ---

/**
 * Check if an inhabitant definition meets a room's inhabitant restriction.
 * Returns true if the inhabitant is eligible for the restriction.
 * An undefined restriction means any inhabitant is allowed.
 */
export function meetsInhabitantRestriction(
  inhabitantDef: InhabitantDefinition,
  restriction: string | undefined,
): boolean {
  if (restriction === undefined) return true;
  return inhabitantDef.restrictionTags.includes(restriction);
}

/**
 * Check if an inhabitant can be assigned to a specific room.
 * Validates restriction tags and max inhabitant capacity.
 * If a PlacedRoom is provided, uses effective capacity (base + upgrade bonuses).
 */
export function canAssignInhabitantToRoom(
  inhabitantDef: InhabitantDefinition,
  roomDef: RoomDefinition,
  currentAssignedCount: number,
  placedRoom?: PlacedRoom,
): { allowed: boolean; reason?: string } {
  if (!meetsInhabitantRestriction(inhabitantDef, roomDef.inhabitantRestriction)) {
    return {
      allowed: false,
      reason: `Only ${roomDef.inhabitantRestriction} creatures can be assigned to this room`,
    };
  }

  const maxCapacity = placedRoom
    ? getEffectiveMaxInhabitants(placedRoom, roomDef)
    : roomDef.maxInhabitants;

  if (maxCapacity >= 0 && currentAssignedCount >= maxCapacity) {
    return { allowed: false, reason: 'Room is at maximum capacity' };
  }

  return { allowed: true };
}

/**
 * Filter a list of inhabitant definitions to only those eligible for a room.
 */
export function getEligibleInhabitants(
  allDefs: InhabitantDefinition[],
  roomDef: RoomDefinition,
): InhabitantDefinition[] {
  return allDefs.filter((def) =>
    meetsInhabitantRestriction(def, roomDef.inhabitantRestriction),
  );
}

// --- Inhabitant assignment ---

/**
 * Assign an inhabitant instance to a room, with restriction enforcement.
 */
export async function assignInhabitantToRoom(
  instanceId: string,
  roomId: string,
  roomTypeId: string,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const instance = state.world.inhabitants.find(
    (i) => i.instanceId === instanceId,
  );
  if (!instance) return { success: false, error: 'Inhabitant not found' };

  if (instance.assignedRoomId !== undefined) {
    return { success: false, error: 'Inhabitant is already assigned to a room' };
  }

  const roomDef = getEntry<RoomDefinition & IsContentItem>(roomTypeId);
  if (!roomDef) return { success: false, error: 'Unknown room type' };

  const inhabitantDef = getEntry<InhabitantDefinition & IsContentItem>(
    instance.definitionId,
  );
  if (!inhabitantDef) {
    return { success: false, error: 'Unknown inhabitant type' };
  }

  const assignedCount = state.world.inhabitants.filter(
    (i) => i.assignedRoomId === roomId,
  ).length;

  // Find the PlacedRoom to account for upgrade bonuses in capacity check
  let placedRoom: PlacedRoom | undefined;
  for (const floor of state.world.floors) {
    placedRoom = floor.rooms.find((r) => r.id === roomId);
    if (placedRoom) break;
  }

  const check = canAssignInhabitantToRoom(
    inhabitantDef,
    roomDef,
    assignedCount,
    placedRoom,
  );
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  await updateGamestate((s) => ({
    ...s,
    world: {
      ...s.world,
      inhabitants: s.world.inhabitants.map((i) =>
        i.instanceId === instanceId ? { ...i, assignedRoomId: roomId } : i,
      ),
    },
  }));

  return { success: true };
}

/**
 * Unassign an inhabitant from its current room.
 */
export async function unassignInhabitantFromRoom(
  instanceId: string,
): Promise<boolean> {
  const state = gamestate();
  const instance = state.world.inhabitants.find(
    (i) => i.instanceId === instanceId,
  );
  if (!instance || instance.assignedRoomId === undefined) return false;

  await updateGamestate((s) => ({
    ...s,
    world: {
      ...s.world,
      inhabitants: s.world.inhabitants.map((i) =>
        i.instanceId === instanceId ? { ...i, assignedRoomId: undefined } : i,
      ),
    },
  }));

  return true;
}
