import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntry } from '@helpers/content';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import { gamestate } from '@helpers/state-game';
import type {
  Floor,
  InhabitantInstance,
  PlacedRoom,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

/**
 * Check whether an inhabitant definition has the Undead Master trait.
 */
export function lichHasUndeadMasterTrait(def: InhabitantContent): boolean {
  return def.traits.some((t) =>
    t.effects.some((e) => e.effectType === 'undead_master'),
  );
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
    let auraValue = 0;
    for (const trait of master.def.traits) {
      for (const effect of trait.effects) {
        if (effect.effectType === 'undead_master') {
          auraValue += effect.effectValue;
        }
      }
    }

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
 * Get the Undead Master aura bonus for a specific inhabitant instance.
 * Searches all floors in the current gamestate to find and compute the bonus.
 * Returns { attackBonus: 0, defenseBonus: 0 } if the instance has no bonus.
 */
export function lichGetUndeadMasterBonusForInstance(
  instance: InhabitantInstance,
): { attackBonus: number; defenseBonus: number } {
  const state = gamestate();
  if (!state?.world?.floors) return { attackBonus: 0, defenseBonus: 0 };

  for (const floor of state.world.floors) {
    if (!floor.inhabitants.some((i) => i.instanceId === instance.instanceId)) {
      continue;
    }
    const bonuses = lichCalculateUndeadMasterBonuses(floor);
    return bonuses.get(instance.instanceId) ?? { attackBonus: 0, defenseBonus: 0 };
  }

  return { attackBonus: 0, defenseBonus: 0 };
}
