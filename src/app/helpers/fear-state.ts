import { fearLevelCalculateAllForFloor } from '@helpers/fear-level';
import { hungerCalculateState } from '@helpers/hunger';
import { stateModifierIsInhabitantScared } from '@helpers/state-modifiers';
import { throneRoomGetFearLevel } from '@helpers/throne-room';
import type {
  GameState,
  InhabitantState,
  PlacedRoomId,
} from '@interfaces';

/**
 * Apply fear-based scared state to inhabitants.
 * Must run AFTER hungerProcess so that hunger states are already set.
 *
 * - If a room's effective fear exceeds an inhabitant's tolerance, set state to 'scared'
 *   (unless starving, which has worse penalties).
 * - If fear no longer exceeds tolerance and the inhabitant is 'scared', restore
 *   the hunger-based state from hungerTicksWithoutFood.
 * - Unassigned inhabitants are never scared (no room = no fear).
 * - Syncs state changes to floor.inhabitants for the production system.
 */
export function fearStateProcess(state: GameState): void {
  const inhabitants = state.world.inhabitants;
  if (inhabitants.length === 0) return;

  const floors = state.world.floors;

  // Build a map of roomId -> effectiveFear for all rooms on all floors
  const roomFearMap = new Map<PlacedRoomId, number>();
  const throneRoomFear = throneRoomGetFearLevel(floors) ?? undefined;

  for (const floor of floors) {
    const floorFearMap = fearLevelCalculateAllForFloor(floor, throneRoomFear, floors);
    for (const [roomId, breakdown] of floorFearMap) {
      roomFearMap.set(roomId, breakdown.effectiveFear);
    }
  }

  // Apply scared state to each inhabitant
  for (const inhabitant of inhabitants) {
    if (!inhabitant.assignedRoomId) {
      // Unassigned inhabitants can't be scared by room fear
      if (inhabitant.state === 'scared') {
        inhabitant.state = hungerCalculateState(inhabitant.hungerTicksWithoutFood ?? 0);
      }
      continue;
    }

    const roomFear = roomFearMap.get(inhabitant.assignedRoomId) ?? 0;
    const shouldBeScared = stateModifierIsInhabitantScared(inhabitant, roomFear);

    if (shouldBeScared && inhabitant.state !== 'starving') {
      inhabitant.state = 'scared';
    } else if (!shouldBeScared && inhabitant.state === 'scared') {
      // Fear cleared — restore hunger-based state
      inhabitant.state = hungerCalculateState(inhabitant.hungerTicksWithoutFood ?? 0);
    }
  }

  // Sync state to floor inhabitants (production reads from floor.inhabitants)
  fearStateSyncFloorInhabitants(state);
}

/**
 * Sync inhabitant state from world.inhabitants to floor.inhabitants.
 */
function fearStateSyncFloorInhabitants(state: GameState): void {
  const stateMap = new Map<string, InhabitantState>();

  for (const inhabitant of state.world.inhabitants) {
    stateMap.set(inhabitant.instanceId, inhabitant.state);
  }

  for (const floor of state.world.floors) {
    for (const floorInhabitant of floor.inhabitants) {
      const updated = stateMap.get(floorInhabitant.instanceId);
      if (updated !== undefined) {
        floorInhabitant.state = updated;
      }
    }
  }
}
