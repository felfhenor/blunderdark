import { computed } from '@angular/core';
import { floorCurrent, invasionCurrentRoomId, inhabitantAll, productionGetRoomDefinition } from '@helpers';
import type { PlacedRoom, PlacedRoomId, RoomMeeple } from '@interfaces';

const TILE_PX = 64;
const GAP_PX = 1;
const CELL_PX = TILE_PX + GAP_PX; // 65

// Meeple wander range within a tile (pixels from tile origin)
const MEEPLE_SIZE = 14;
const PAD = 4;
const WANDER_MIN = PAD;
const WANDER_MAX = TILE_PX - PAD - MEEPLE_SIZE;

function isRoomActive(room: PlacedRoom): boolean {
  if (room.breedingJob) return true;
  if (room.summonJobs && room.summonJobs.length > 0) return true;
  if (room.forgeJobs && room.forgeJobs.length > 0) return true;
  if (room.trapJobs && room.trapJobs.length > 0) return true;
  if (room.tortureJob) return true;
  if (room.runeworkingJob) return true;
  if (room.mutationJob) return true;

  const def = productionGetRoomDefinition(room.roomTypeId);
  if (def?.requiresWorkers) return true;

  return false;
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Generate a random offset within the tile wander bounds. */
function randomOffset(): number {
  return randomInRange(WANDER_MIN, WANDER_MAX);
}

function createMeeple(
  id: string,
  tile: { x: number; y: number },
  active: boolean,
): RoomMeeple {
  const baseDuration = active
    ? randomInRange(2, 3)
    : randomInRange(5, 8);

  return {
    id,
    tileLeftPx: tile.x * CELL_PX,
    tileTopPx: tile.y * CELL_PX,
    isActive: active,
    wanderDuration: baseDuration,
    wanderDelay: randomInRange(0, baseDuration * 0.5),
    ox0: randomOffset(),
    oy0: randomOffset(),
    ox1: randomOffset(),
    oy1: randomOffset(),
    ox2: randomOffset(),
    oy2: randomOffset(),
    ox3: randomOffset(),
    oy3: randomOffset(),
  };
}

// Stable cache: only regenerate meeples when count or activity changes per room
const meepleCache = new Map<PlacedRoomId, { count: number; active: boolean; meeples: RoomMeeple[] }>();

const _inhabitants = inhabitantAll();

export const roomMeeplesMap = computed(() => {
  const floor = floorCurrent();
  if (!floor) {
    meepleCache.clear();
    return new Map<PlacedRoomId, RoomMeeple[]>();
  }

  const inhabitants = _inhabitants();
  const invadedRoomId = invasionCurrentRoomId();
  const result = new Map<PlacedRoomId, RoomMeeple[]>();
  const seenRoomIds = new Set<PlacedRoomId>();

  // Build tile lookup per room
  const roomTiles = new Map<PlacedRoomId, Array<{ x: number; y: number }>>();
  const grid = floor.grid;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const roomId = grid[y][x].roomId;
      if (!roomId) continue;
      let tiles = roomTiles.get(roomId);
      if (!tiles) {
        tiles = [];
        roomTiles.set(roomId, tiles);
      }
      tiles.push({ x, y });
    }
  }

  for (const room of floor.rooms) {
    seenRoomIds.add(room.id);

    // Hide meeples on invaded rooms
    if (invadedRoomId && room.id === invadedRoomId) continue;

    const tiles = roomTiles.get(room.id);
    if (!tiles || tiles.length === 0) continue;

    // Count inhabitants that have arrived (not still traveling)
    const assignedCount = inhabitants.filter(
      (i) =>
        i.assignedRoomId === room.id &&
        (!i.travelTicksRemaining || i.travelTicksRemaining <= 0),
    ).length;

    if (assignedCount === 0) continue;

    const active = isRoomActive(room);
    const cached = meepleCache.get(room.id);

    if (cached && cached.count === assignedCount && cached.active === active) {
      // Reuse cached meeples - no position changes
      result.set(room.id, cached.meeples);
      continue;
    }

    // Count changed: reuse existing meeples where possible, add/remove as needed
    const meeples: RoomMeeple[] = [];
    const oldMeeples = cached?.meeples ?? [];

    for (let m = 0; m < assignedCount; m++) {
      if (m < oldMeeples.length && cached?.active === active) {
        // Reuse existing meeple position
        meeples.push(oldMeeples[m]);
      } else {
        // Create new meeple at a random tile
        const tile = tiles[Math.floor(Math.random() * tiles.length)];
        meeples.push(createMeeple(`${room.id}-${m}`, tile, active));
      }
    }

    meepleCache.set(room.id, { count: assignedCount, active, meeples });
    result.set(room.id, meeples);
  }

  // Clean up cache for rooms that no longer exist
  for (const roomId of meepleCache.keys()) {
    if (!seenRoomIds.has(roomId)) {
      meepleCache.delete(roomId);
    }
  }

  return result;
});

export const roomMeeplesFlat = computed(() => {
  const map = roomMeeplesMap();
  const flat: RoomMeeple[] = [];
  for (const meeples of map.values()) {
    for (const m of meeples) {
      flat.push(m);
    }
  }
  return flat;
});
