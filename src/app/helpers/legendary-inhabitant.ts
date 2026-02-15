import { contentGetEntry, contentGetEntriesByType } from '@helpers/content';
import { roomUpgradeGetPaths } from '@helpers/room-upgrades';
import type {
  Floor,
  InhabitantInstance,
  RecruitmentRequirement,
  ResourceMap,
  ResourceType,
  RoomId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';

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
    const appliedPath = paths.find(
      (p) => p.id === placed.appliedUpgradePathId,
    );
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
      return legendaryInhabitantFindRoomByName(floors, req.targetName) !==
        undefined;
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
