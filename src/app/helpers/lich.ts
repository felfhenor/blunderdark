import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import type {
  Floor,
  InhabitantInstance,
  PlacedRoom,
  ResearchBranch,
  ResearchNodeContent,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

/**
 * Check whether an inhabitant definition has the Undead Master trait.
 */
export function lichHasUndeadMasterTrait(def: InhabitantContent): boolean {
  return def.traits.some((t) => t.effectType === 'undead_master');
}

/**
 * Check whether an inhabitant definition has the Ancient Knowledge trait.
 */
export function lichHasAncientKnowledgeTrait(def: InhabitantContent): boolean {
  return def.traits.some((t) => t.effectType === 'ancient_knowledge');
}

/**
 * Find assigned Lich-type inhabitants on a floor that have the Undead Master trait.
 * Returns pairs of instance + definition for each qualifying inhabitant.
 */
function lichFindUndeadMasters(floor: Floor): {
  instance: InhabitantInstance;
  def: InhabitantContent;
  room: PlacedRoom;
}[] {
  const results: {
    instance: InhabitantInstance;
    def: InhabitantContent;
    room: PlacedRoom;
  }[] = [];

  for (const instance of floor.inhabitants) {
    if (!instance.assignedRoomId) continue;

    const def = contentGetEntry<InhabitantContent>(instance.definitionId);
    if (!def) continue;

    if (!lichHasUndeadMasterTrait(def)) continue;

    const room = floor.rooms.find((r) => r.id === instance.assignedRoomId);
    if (!room) continue;

    results.push({ instance, def, room });
  }

  return results;
}

/**
 * Calculate Undead Master aura bonuses for a given floor.
 * Returns a map of inhabitant instance IDs to their attack/defense bonuses
 * from being in the same or adjacent room as a Lich with Undead Master.
 *
 * Only undead inhabitants benefit from this aura. The Lich itself does not
 * receive its own aura bonus.
 */
export function lichCalculateUndeadMasterBonuses(
  floor: Floor,
): Map<string, { attackBonus: number; defenseBonus: number }> {
  const bonusMap = new Map<
    string,
    { attackBonus: number; defenseBonus: number }
  >();

  const masters = lichFindUndeadMasters(floor);
  if (masters.length === 0) return bonusMap;

  // Pre-compute room tile positions for adjacency
  const roomTiles = new Map<string, { x: number; y: number }[]>();
  for (const room of floor.rooms) {
    const shape = roomShapeResolve(room);
    roomTiles.set(
      room.id,
      roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
    );
  }

  for (const master of masters) {
    const masterTiles = roomTiles.get(master.room.id) ?? [];
    const auraValue =
      master.def.traits.find((t) => t.effectType === 'undead_master')
        ?.effectValue ?? 0;

    if (auraValue <= 0) continue;

    // Find rooms in range: same room + adjacent rooms
    const affectedRoomIds = new Set<string>();
    affectedRoomIds.add(master.room.id);

    for (const otherRoom of floor.rooms) {
      if (otherRoom.id === master.room.id) continue;
      const otherTiles = roomTiles.get(otherRoom.id) ?? [];
      if (adjacencyAreRoomsAdjacent(masterTiles, otherTiles)) {
        affectedRoomIds.add(otherRoom.id);
      }
    }

    // Apply bonuses to undead inhabitants in affected rooms (excluding the Lich itself)
    for (const inhabitant of floor.inhabitants) {
      if (!inhabitant.assignedRoomId) continue;
      if (!affectedRoomIds.has(inhabitant.assignedRoomId)) continue;
      if (inhabitant.instanceId === master.instance.instanceId) continue;

      const inhDef = contentGetEntry<InhabitantContent>(
        inhabitant.definitionId,
      );
      if (!inhDef || inhDef.type !== 'undead') continue;

      const existing = bonusMap.get(inhabitant.instanceId) ?? {
        attackBonus: 0,
        defenseBonus: 0,
      };
      existing.attackBonus += auraValue;
      existing.defenseBonus += auraValue;
      bonusMap.set(inhabitant.instanceId, existing);
    }
  }

  return bonusMap;
}

/**
 * Count how many hidden research nodes per branch should be revealed
 * by the Ancient Knowledge trait.
 *
 * Returns 1 per branch if any inhabitant with Ancient Knowledge exists
 * in the dungeon (assigned or not), 0 otherwise.
 */
export function lichGetAncientKnowledgeRevealCount(
  inhabitants: InhabitantInstance[],
): number {
  for (const inhabitant of inhabitants) {
    const def = contentGetEntry<InhabitantContent>(inhabitant.definitionId);
    if (!def) continue;

    if (lichHasAncientKnowledgeTrait(def)) {
      return 1;
    }
  }

  return 0;
}

/**
 * Get research nodes that would be revealed by Ancient Knowledge.
 * Returns one unrevealed node per branch when a Lich with Ancient Knowledge
 * is present, preferring the lowest-tier unrevealed node in each branch.
 */
export function lichGetRevealedResearchNodes(
  inhabitants: InhabitantInstance[],
  completedNodeIds: string[],
): ResearchNodeContent[] {
  const revealCount = lichGetAncientKnowledgeRevealCount(inhabitants);
  if (revealCount <= 0) return [];

  const allNodes = contentGetEntriesByType<ResearchNodeContent>('research');
  const completedSet = new Set(completedNodeIds);

  // Group unrevealed nodes by branch
  const branchNodes = new Map<ResearchBranch, ResearchNodeContent[]>();
  for (const node of allNodes) {
    if (completedSet.has(node.id)) continue;

    const branch = node.branch;
    if (!branchNodes.has(branch)) {
      branchNodes.set(branch, []);
    }
    branchNodes.get(branch)!.push(node);
  }

  // Pick one lowest-tier node per branch
  const revealed: ResearchNodeContent[] = [];
  for (const [, nodes] of branchNodes) {
    if (nodes.length === 0) continue;

    let lowest = nodes[0];
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i].tier < lowest.tier) {
        lowest = nodes[i];
      }
    }
    revealed.push(lowest);
  }

  return revealed;
}
