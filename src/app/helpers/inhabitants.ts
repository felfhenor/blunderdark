import { computed, type Signal } from '@angular/core';
import { contentGetEntry } from '@helpers/content';
import { roomUpgradeGetEffectiveMaxInhabitants } from '@helpers/room-upgrades';
import {
  verticalTransportCalculateTravelTicks,
  verticalTransportFloorsAreConnected,
} from '@helpers/vertical-transport';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  GameStateWorld,
  InhabitantDefinition,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  PlacedRoomId,
  RoomDefinition,
  RoomId,
} from '@interfaces';

/**
 * Sync world.inhabitants into each floor's inhabitants array.
 * Many systems (production, efficiency, fear, etc.) read from floor.inhabitants,
 * so this must be called whenever world.inhabitants changes.
 */
function syncFloorInhabitants(world: GameStateWorld): GameStateWorld {
  if (!world.floors) return world;
  return {
    ...world,
    floors: world.floors.map((floor) => ({
      ...floor,
      inhabitants: world.inhabitants,
    })),
  };
}

export function inhabitantAll(): Signal<InhabitantInstance[]> {
  return computed(() => gamestate().world.inhabitants);
}

export function inhabitantGet(
  instanceId: string,
): Signal<InhabitantInstance | undefined> {
  return computed(() =>
    gamestate().world.inhabitants.find((i) => i.instanceId === instanceId),
  );
}

export async function inhabitantAdd(
  inhabitant: InhabitantInstance,
): Promise<void> {
  await updateGamestate((state) => {
    const world = {
      ...state.world,
      inhabitants: [...state.world.inhabitants, inhabitant],
    };
    return { ...state, world: syncFloorInhabitants(world) };
  });
}

export async function inhabitantRemove(instanceId: string): Promise<void> {
  await updateGamestate((state) => {
    const world = {
      ...state.world,
      inhabitants: state.world.inhabitants.filter(
        (i) => i.instanceId !== instanceId,
      ),
    };
    return { ...state, world: syncFloorInhabitants(world) };
  });
}

export function inhabitantSerialize(
  inhabitants: InhabitantInstance[],
): InhabitantInstance[] {
  return inhabitants.map((i) => ({ ...i }));
}

export function inhabitantDeserialize(
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
    hungerTicksWithoutFood: i.hungerTicksWithoutFood ?? 0,
    mutationBonuses: i.mutationBonuses ?? undefined,
    mutated: i.mutated ?? false,
    isHybrid: i.isHybrid ?? false,
    hybridParentIds: i.hybridParentIds ?? undefined,
    isSummoned: i.isSummoned ?? undefined,
    isTemporary: i.isTemporary ?? undefined,
    temporaryTicksRemaining: i.temporaryTicksRemaining ?? undefined,
    travelTicksRemaining: i.travelTicksRemaining ?? undefined,
  }));
}

// --- Inhabitant restriction validation ---

/**
 * Check if an inhabitant definition meets a room's inhabitant restriction.
 * Returns true if the inhabitant is eligible for the restriction.
 * An undefined restriction means any inhabitant is allowed.
 */
export function inhabitantMeetsRestriction(
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
export function inhabitantCanAssignToRoom(
  inhabitantDef: InhabitantDefinition,
  roomDef: RoomDefinition,
  currentAssignedCount: number,
  placedRoom?: PlacedRoom,
): { allowed: boolean; reason?: string } {
  if (!inhabitantMeetsRestriction(inhabitantDef, roomDef.inhabitantRestriction)) {
    return {
      allowed: false,
      reason: `Only ${roomDef.inhabitantRestriction} creatures can be assigned to this room`,
    };
  }

  const maxCapacity = placedRoom
    ? roomUpgradeGetEffectiveMaxInhabitants(placedRoom, roomDef)
    : roomDef.maxInhabitants;

  if (maxCapacity >= 0 && currentAssignedCount >= maxCapacity) {
    return { allowed: false, reason: 'Room is at maximum capacity' };
  }

  return { allowed: true };
}

/**
 * Filter a list of inhabitant definitions to only those eligible for a room.
 */
export function inhabitantGetEligible(
  allDefs: InhabitantDefinition[],
  roomDef: RoomDefinition,
): InhabitantDefinition[] {
  return allDefs.filter((def) =>
    inhabitantMeetsRestriction(def, roomDef.inhabitantRestriction),
  );
}

// --- Inhabitant assignment ---

/**
 * Assign an inhabitant instance to a room, with restriction enforcement.
 */
export async function inhabitantAssignToRoom(
  instanceId: string,
  roomId: PlacedRoomId,
  roomTypeId: RoomId,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const instance = state.world.inhabitants.find(
    (i) => i.instanceId === instanceId,
  );
  if (!instance) return { success: false, error: 'Inhabitant not found' };

  if (instance.assignedRoomId !== undefined) {
    return { success: false, error: 'Inhabitant is already assigned to a room' };
  }

  const roomDef = contentGetEntry<RoomDefinition & IsContentItem>(roomTypeId);
  if (!roomDef) return { success: false, error: 'Unknown room type' };

  const inhabitantDef = contentGetEntry<InhabitantDefinition & IsContentItem>(
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

  const check = inhabitantCanAssignToRoom(
    inhabitantDef,
    roomDef,
    assignedCount,
    placedRoom,
  );
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  // Calculate travel time for cross-floor assignments
  let travelTicks: number | undefined;
  const roomFloor = state.world.floors.find((f) =>
    f.rooms.some((r) => r.id === roomId),
  );
  if (roomFloor && roomFloor.depth > 1) {
    const connected = verticalTransportFloorsAreConnected(
      state.world.stairs,
      state.world.elevators,
      state.world.portals,
      1,
      roomFloor.depth,
    );
    if (!connected) {
      return { success: false, error: 'No vertical connection to that floor' };
    }
    const calculatedTicks = verticalTransportCalculateTravelTicks(
      state.world.stairs,
      state.world.elevators,
      state.world.portals,
      1,
      roomFloor.depth,
    );
    if (calculatedTicks !== undefined && calculatedTicks > 0) {
      travelTicks = calculatedTicks;
    }
  }

  await updateGamestate((s) => {
    const world = {
      ...s.world,
      inhabitants: s.world.inhabitants.map((i) =>
        i.instanceId === instanceId
          ? { ...i, assignedRoomId: roomId, travelTicksRemaining: travelTicks }
          : i,
      ),
    };
    return { ...s, world: syncFloorInhabitants(world) };
  });

  return { success: true };
}

/**
 * Unassign an inhabitant from its current room.
 */
export async function inhabitantUnassignFromRoom(
  instanceId: string,
): Promise<boolean> {
  const state = gamestate();
  const instance = state.world.inhabitants.find(
    (i) => i.instanceId === instanceId,
  );
  if (!instance || instance.assignedRoomId === undefined) return false;

  await updateGamestate((s) => {
    const world = {
      ...s.world,
      inhabitants: s.world.inhabitants.map((i) =>
        i.instanceId === instanceId ? { ...i, assignedRoomId: undefined } : i,
      ),
    };
    return { ...s, world: syncFloorInhabitants(world) };
  });

  return true;
}
