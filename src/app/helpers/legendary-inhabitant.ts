import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { resourceSubtract } from '@helpers/resources';
import { roomUpgradeGetPaths } from '@helpers/room-upgrades';
import type {
  Floor,
  GameState,
  InhabitantInstance,
  RecruitmentRequirement,
  ResourceMap,
  ResourceType,
  RoomId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';

/** Ticks of discontent before a legendary inhabitant leaves (5 game-minutes). */
export const LEGENDARY_DISCONTENTED_DEPARTURE_TICKS =
  5 * GAME_TIME_TICKS_PER_MINUTE;

export type LegendaryRequirementCheck = {
  requirement: RecruitmentRequirement;
  met: boolean;
};

export type LegendaryRecruitmentResult = {
  allowed: boolean;
  missingRequirements: LegendaryRequirementCheck[];
};

/**
 * Check if a room with a given name exists on any floor.
 */
function legendaryInhabitantFindRoomByName(
  floors: Floor[],
  roomName: string,
): { floor: Floor; roomTypeId: RoomId } | undefined {
  const allRooms = contentGetEntriesByType<RoomContent>('room');
  const roomDef = allRooms.find((r) => r.name === roomName);
  if (!roomDef) return undefined;

  for (const floor of floors) {
    const placed = floor.rooms.find((r) => r.roomTypeId === roomDef.id);
    if (placed) return { floor, roomTypeId: roomDef.id };
  }

  return undefined;
}

/**
 * Get the upgrade level of a room placed on a floor by room name.
 * Returns 0 if room not found, 1 if no upgrade applied, or the upgrade level.
 */
function legendaryInhabitantGetRoomLevel(
  floors: Floor[],
  roomName: string,
): number {
  const allRooms = contentGetEntriesByType<RoomContent>('room');
  const roomDef = allRooms.find((r) => r.name === roomName);
  if (!roomDef) return 0;

  for (const floor of floors) {
    const placed = floor.rooms.find((r) => r.roomTypeId === roomDef.id);
    if (!placed) continue;

    if (!placed.appliedUpgradePathId) return 1;

    const paths = roomUpgradeGetPaths(placed.roomTypeId);
    const appliedPath = paths.find((p) => p.id === placed.appliedUpgradePathId);
    if (appliedPath?.upgradeLevel) return appliedPath.upgradeLevel;

    const appliedIndex = paths.findIndex(
      (p) => p.id === placed.appliedUpgradePathId,
    );
    return appliedIndex >= 0 ? appliedIndex + 2 : 1;
  }

  return 0;
}

/**
 * Check a single recruitment requirement against the current state.
 */
function legendaryInhabitantCheckRequirement(
  req: RecruitmentRequirement,
  floors: Floor[],
  resources: ResourceMap,
): boolean {
  switch (req.requirementType) {
    case 'room': {
      return (
        legendaryInhabitantFindRoomByName(floors, req.targetName) !== undefined
      );
    }

    case 'room_level': {
      const level = legendaryInhabitantGetRoomLevel(floors, req.targetName);
      return level >= (req.value ?? 1);
    }

    case 'resource': {
      const resourceType = req.targetName as ResourceType;
      const current = resources[resourceType]?.current ?? 0;
      return current >= (req.value ?? 0);
    }

    case 'item': {
      // Item requirements not yet implemented
      return false;
    }
  }
}

/**
 * Check if a legendary inhabitant can be recruited.
 * Validates uniqueness (only 1 of each type), and all recruitment requirements.
 * Pure function — takes state as parameters for testability.
 */
export function legendaryInhabitantCanRecruit(
  def: InhabitantContent,
  inhabitants: InhabitantInstance[],
  floors: Floor[],
  resources: ResourceMap,
): LegendaryRecruitmentResult {
  // Check uniqueness: only 1 of each legendary type per dungeon
  const alreadyExists = inhabitants.some((i) => i.definitionId === def.id);
  if (alreadyExists) {
    return {
      allowed: false,
      missingRequirements: [
        {
          requirement: {
            requirementType: 'item',
            targetName: def.name,
            description: `${def.name} has already been recruited.`,
          },
          met: false,
        },
      ],
    };
  }

  const requirements = def.recruitmentRequirements ?? [];
  const checks: LegendaryRequirementCheck[] = requirements.map((req) => ({
    requirement: req,
    met: legendaryInhabitantCheckRequirement(req, floors, resources),
  }));

  return {
    allowed: checks.every((c) => c.met),
    missingRequirements: checks,
  };
}

/**
 * Get all legendary inhabitants (those with 'unique' restriction tag).
 */
export function legendaryInhabitantGetAll(): InhabitantContent[] {
  return contentGetEntriesByType<InhabitantContent>('inhabitant').filter(
    (def) => def.restrictionTags.includes('unique'),
  );
}

/**
 * Check if a specific legendary inhabitant has been recruited.
 */
export function legendaryInhabitantIsRecruited(
  defId: string,
  inhabitants: InhabitantInstance[],
): boolean {
  return inhabitants.some((i) => i.definitionId === defId);
}

/**
 * Check if an inhabitant is a legendary (has upkeepCost defined).
 */
export function legendaryInhabitantIsLegendary(
  inhabitant: InhabitantInstance,
): boolean {
  const def = contentGetEntry<InhabitantContent>(inhabitant.definitionId);
  if (!def) return false;
  return def.upkeepCost !== undefined && Object.keys(def.upkeepCost).length > 0;
}

/**
 * Check if a legendary inhabitant is discontented (upkeep cannot be paid).
 */
export function legendaryInhabitantIsDiscontented(
  inhabitant: InhabitantInstance,
): boolean {
  return (inhabitant.discontentedTicks ?? 0) > 0;
}

/**
 * Check if a legendary inhabitant's aura should be active.
 * Aura is active when the legendary is assigned to a room and not discontented.
 */
export function legendaryInhabitantIsAuraActive(
  inhabitant: InhabitantInstance,
): boolean {
  if (!inhabitant.assignedRoomId) return false;
  if (legendaryInhabitantIsDiscontented(inhabitant)) return false;
  return legendaryInhabitantIsLegendary(inhabitant);
}

/**
 * Check if upkeep can be paid for an inhabitant's per-tick cost.
 * Returns true if all resources have enough to cover per-tick deduction.
 */
function legendaryInhabitantCanPayUpkeep(
  def: InhabitantContent,
  resources: ResourceMap,
): boolean {
  if (!def.upkeepCost) return true;

  for (const [type, amountPerMinute] of Object.entries(def.upkeepCost)) {
    const resourceType = type as ResourceType;
    const perTick = amountPerMinute / GAME_TIME_TICKS_PER_MINUTE;
    if ((resources[resourceType]?.current ?? 0) < perTick) return false;
  }

  return true;
}

/**
 * Deduct per-tick upkeep cost from resources for one inhabitant.
 * Mutates resources in-place.
 */
function legendaryInhabitantPayUpkeep(def: InhabitantContent): void {
  if (!def.upkeepCost) return;

  for (const [type, amountPerMinute] of Object.entries(def.upkeepCost)) {
    const resourceType = type as ResourceType;
    const perTick = amountPerMinute / GAME_TIME_TICKS_PER_MINUTE;
    resourceSubtract(resourceType, perTick);
  }
}

/**
 * Remove an inhabitant from world and floor inhabitant arrays.
 * Mutates state in-place.
 */
function legendaryInhabitantRemoveFromState(
  state: GameState,
  instanceId: string,
): void {
  state.world.inhabitants = state.world.inhabitants.filter(
    (i) => i.instanceId !== instanceId,
  );
  for (const floor of state.world.floors) {
    floor.inhabitants = floor.inhabitants.filter(
      (i) => i.instanceId !== instanceId,
    );
  }
}

/**
 * Process legendary inhabitant upkeep each tick.
 * Called from the game loop inside updateGamestate — mutates state in-place.
 *
 * 1. For each legendary inhabitant, try to pay per-tick upkeep
 * 2. If paid: reset discontentedTicks
 * 3. If not paid: increment discontentedTicks
 * 4. If discontented for 5+ minutes: remove the legendary permanently
 */
export function legendaryInhabitantUpkeepProcess(state: GameState): void {
  const toRemove: string[] = [];

  for (const inhabitant of state.world.inhabitants) {
    const def = contentGetEntry<InhabitantContent>(inhabitant.definitionId);
    if (!def?.upkeepCost || Object.keys(def.upkeepCost).length === 0) continue;

    if (legendaryInhabitantCanPayUpkeep(def, state.world.resources)) {
      legendaryInhabitantPayUpkeep(def);
      inhabitant.discontentedTicks = 0;
    } else {
      inhabitant.discontentedTicks = (inhabitant.discontentedTicks ?? 0) + 1;

      if (
        inhabitant.discontentedTicks >= LEGENDARY_DISCONTENTED_DEPARTURE_TICKS
      ) {
        toRemove.push(inhabitant.instanceId);
      }
    }
  }

  // Remove departed legendaries
  for (const id of toRemove) {
    legendaryInhabitantRemoveFromState(state, id);
  }

  // Sync discontentedTicks to floor inhabitants
  legendaryInhabitantSyncFloors(state);
}

/**
 * Sync discontentedTicks from world inhabitants to floor inhabitants.
 */
function legendaryInhabitantSyncFloors(state: GameState): void {
  const tickMap = new Map<string, number>();

  for (const inhabitant of state.world.inhabitants) {
    if (inhabitant.discontentedTicks !== undefined) {
      tickMap.set(inhabitant.instanceId, inhabitant.discontentedTicks);
    }
  }

  for (const floor of state.world.floors) {
    for (const floorInhabitant of floor.inhabitants) {
      const ticks = tickMap.get(floorInhabitant.instanceId);
      if (ticks !== undefined) {
        floorInhabitant.discontentedTicks = ticks;
      }
    }
  }
}
