import { signal } from '@angular/core';
import { floorAll } from '@helpers/floor';
import { productionCalculateSingleRoom } from '@helpers/production';
import { optionsGet } from '@helpers/state-options';
import { gamestate } from '@helpers/state-game';
import type {
  FloatingBubble,
  FloatingBubbleEntry,
  FloatingBubbleVariant,
  PlacedRoomId,
} from '@interfaces';

const MAX_BUBBLES = 50;
const MIN_PRODUCTION_THRESHOLD = 0.005;

let nextBubbleId = 0;

const _bubbles = signal<FloatingBubble[]>([]);
export const floatingBubbles = _bubbles.asReadonly();

export function floatingBubbleAdd(
  roomId: PlacedRoomId,
  floorIndex: number,
  entries: FloatingBubbleEntry[],
  variant: FloatingBubbleVariant,
  anchorX: number,
  anchorY: number,
  centerOffsetPx: number,
): void {
  if (entries.length === 0) return;

  const current = _bubbles();

  // Count active bubbles for this room to calculate stack offset
  const roomBubbleCount = current.filter(
    (b) => b.roomId === roomId && b.floorIndex === floorIndex,
  ).length;

  // Enforce per-room cap
  if (roomBubbleCount >= 3) return;

  const bubble: FloatingBubble = {
    id: nextBubbleId++,
    roomId,
    floorIndex,
    entries,
    variant,
    anchorX,
    anchorY,
    centerOffsetPx,
    stackOffset: roomBubbleCount,
  };

  let updated = [...current, bubble];

  // Enforce global cap by removing oldest
  if (updated.length > MAX_BUBBLES) {
    updated = updated.slice(updated.length - MAX_BUBBLES);
  }

  _bubbles.set(updated);
}

export function floatingBubbleRemove(id: number): void {
  _bubbles.update((bubbles) => bubbles.filter((b) => b.id !== id));
}

export function floatingBubblesClear(): void {
  _bubbles.set([]);
}

/**
 * Compute per-room production for a given floor and emit bubbles.
 * Called after productionProcess each tick.
 */
export function floatingBubblesEmitProduction(
  visibleFloorIndex: number,
  numTicks: number,
): void {
  if (!optionsGet('showResourceGainBubbles')) return;

  const state = gamestate();
  const floors = state.world.floors;
  const floor = floors[visibleFloorIndex];
  if (!floor) return;

  for (const room of floor.rooms) {
    const rates = productionCalculateSingleRoom(
      room,
      floor,
      state.clock.hour,
      floors,
      state.world.season.currentSeason,
    );

    const entries: FloatingBubbleEntry[] = [];
    for (const [resourceType, rate] of Object.entries(rates)) {
      if (!rate || Math.abs(rate) < MIN_PRODUCTION_THRESHOLD) continue;
      const amount = rate * numTicks;
      const sign = amount > 0 ? '+' : '';
      const formatted = `${sign}${parseFloat(amount.toFixed(2))}`;
      entries.push({ text: `${formatted} ${resourceType}`, resourceType });
    }

    if (entries.length === 0) continue;

    // Compute room center offset in pixels (same logic as grid component)
    const bounds = getRoomBounds(floor.grid, room.id);
    if (!bounds) continue;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerOffsetPx = (centerX - room.anchorX) * 65;

    floatingBubbleAdd(
      room.id,
      visibleFloorIndex,
      entries,
      'production',
      room.anchorX,
      room.anchorY,
      centerOffsetPx,
    );
  }
}

/**
 * Emit a queue completion bubble for a room found by its PlacedRoomId.
 */
export function floatingBubblesEmitQueue(
  roomId: PlacedRoomId,
  text: string,
): void {
  if (!optionsGet('showCraftCompletionBubbles')) return;

  const floors = floorAll();
  for (let i = 0; i < floors.length; i++) {
    const room = floors[i].rooms.find((r) => r.id === roomId);
    if (!room) continue;

    const bounds = getRoomBounds(floors[i].grid, room.id);
    if (!bounds) continue;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerOffsetPx = (centerX - room.anchorX) * 65;

    floatingBubbleAdd(
      room.id,
      i,
      [{ text }],
      'queue',
      room.anchorX,
      room.anchorY,
      centerOffsetPx,
    );
    return;
  }
}

/**
 * Emit a placement bubble for a newly built room.
 */
export function floatingBubblesEmitPlacement(
  roomId: PlacedRoomId,
  roomName: string,
  floorIndex: number,
  anchorX: number,
  anchorY: number,
): void {
  if (!optionsGet('showCraftCompletionBubbles')) return;

  const floors = floorAll();
  const floor = floors[floorIndex];
  if (!floor) return;

  const bounds = getRoomBounds(floor.grid, roomId);
  const centerOffsetPx = bounds
    ? ((bounds.minX + bounds.maxX) / 2 - anchorX) * 65
    : 0;

  floatingBubbleAdd(
    roomId,
    floorIndex,
    [{ text: `${roomName} built!` }],
    'placement',
    anchorX,
    anchorY,
    centerOffsetPx,
  );
}

// --- Internal helpers ---

function getRoomBounds(
  grid: { roomId?: string }[][],
  roomId: string,
): { minX: number; maxX: number; minY: number; maxY: number } | undefined {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let found = false;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x++) {
      if (grid[y][x].roomId === roomId) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return found ? { minX, maxX, minY, maxY } : undefined;
}
