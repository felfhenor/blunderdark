import { computed } from '@angular/core';
import { adjacencyGetSharedEdges } from '@helpers/adjacency';
import { fearLevelBreakdownMap } from '@helpers/fear-level';
import { floorCurrent } from '@helpers/floor';
import { invasionIsActive } from '@helpers/invasion-process';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
import { optionsGet } from '@helpers/state-options';
import type { PlacedRoomId, TileOffset } from '@interfaces';

export const fearOverlayEnabled = computed(
  () => optionsGet('showFearOverlay') as boolean,
);

export const fearOverlayTileMap = computed<
  Map<string, { fearLevel: number; hasReduction: boolean }>
>(() => {
  const map = new Map<string, { fearLevel: number; hasReduction: boolean }>();
  if (!fearOverlayEnabled()) return map;

  const floor = floorCurrent();
  if (!floor) return map;

  const breakdowns = fearLevelBreakdownMap();

  for (const room of floor.rooms) {
    const breakdown = breakdowns.get(room.id);
    if (!breakdown) continue;

    const shape = roomShapeResolve(room);
    const tiles = roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY);

    const hasReduction =
      breakdown.altarAuraReduction > 0 ||
      breakdown.featureReduction > 0 ||
      breakdown.researchReduction > 0 ||
      breakdown.upgradeAdjustment < 0 ||
      breakdown.inhabitantModifier < 0;

    for (const tile of tiles) {
      map.set(`${tile.x},${tile.y}`, {
        fearLevel: breakdown.effectiveFear,
        hasReduction,
      });
    }
  }

  return map;
});

export const fearOverlayPropagationArrows = computed<
  Map<string, Set<string>>
>(() => {
  const map = new Map<string, Set<string>>();
  if (!fearOverlayEnabled()) return map;

  const floor = floorCurrent();
  if (!floor) return map;

  const breakdowns = fearLevelBreakdownMap();

  // Cache resolved tiles per room
  const roomTilesCache = new Map<PlacedRoomId, TileOffset[]>();
  for (const room of floor.rooms) {
    const shape = roomShapeResolve(room);
    roomTilesCache.set(
      room.id,
      roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
    );
  }

  // Build roomId lookup map
  const roomById = new Map(floor.rooms.map((r) => [r.id, r]));

  for (const room of floor.rooms) {
    const breakdown = breakdowns.get(room.id);
    if (!breakdown || breakdown.propagationSources.length === 0) continue;

    const targetTiles = roomTilesCache.get(room.id) ?? [];

    for (const source of breakdown.propagationSources) {
      const sourceRoom = roomById.get(source.sourceRoomId as PlacedRoomId);
      if (!sourceRoom) continue;

      const sourceTiles =
        roomTilesCache.get(source.sourceRoomId as PlacedRoomId) ?? [];
      const edges = adjacencyGetSharedEdges(sourceTiles, targetTiles);

      for (const [srcTile, tgtTile] of edges) {
        const dx = tgtTile.x - srcTile.x;
        const dy = tgtTile.y - srcTile.y;

        let direction: string | undefined;
        if (dx === 1) direction = 'right';
        else if (dx === -1) direction = 'left';
        else if (dy === 1) direction = 'bottom';
        else if (dy === -1) direction = 'top';

        if (!direction) continue;

        // Place arrow on source tile, pointing outward toward target
        const key = `${srcTile.x},${srcTile.y}`;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(direction);
      }
    }
  }

  return map;
});

export const fearOverlayDimmed = computed(
  () => fearOverlayEnabled() && invasionIsActive(),
);

export const fearOverlayAnchorMap = computed<Map<string, number>>(() => {
  const map = new Map<string, number>();
  if (!fearOverlayEnabled()) return map;

  const floor = floorCurrent();
  if (!floor) return map;

  const breakdowns = fearLevelBreakdownMap();

  for (const room of floor.rooms) {
    const breakdown = breakdowns.get(room.id);
    if (!breakdown || breakdown.effectiveFear <= 0) continue;

    map.set(`${room.anchorX},${room.anchorY}`, breakdown.effectiveFear);
  }

  return map;
});
