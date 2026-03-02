import { describe, expect, it, vi } from 'vitest';
import type { PlacedRoom, PlacedRoomId, RoomId, RoomShapeId, RoomUpgradeEffect } from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';

// --- Mock content ---

const mockContent = new Map<string, unknown>();
let mockAppliedEffects: RoomUpgradeEffect[] = [];

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
}));

vi.mock('@helpers/room-upgrades', () => ({
  roomUpgradeGetAppliedEffects: () => mockAppliedEffects,
}));

import { craftingQueueGetMaxSize } from '@helpers/crafting-queue';

function makeRoom(roomTypeId = 'room-forge'): PlacedRoom {
  return {
    id: 'room-1' as PlacedRoomId,
    roomTypeId: roomTypeId as RoomId,
    shapeId: 'square-2x2' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  } as PlacedRoom;
}

describe('craftingQueueGetMaxSize', () => {
  it('should return 0 when room definition not found', () => {
    mockContent.clear();
    mockAppliedEffects = [];
    expect(craftingQueueGetMaxSize(makeRoom('unknown'))).toBe(0);
  });

  it('should return 0 when room has no queueSize', () => {
    mockContent.set('room-forge', { id: 'room-forge' } as Partial<RoomContent>);
    mockAppliedEffects = [];
    expect(craftingQueueGetMaxSize(makeRoom())).toBe(0);
  });

  it('should return base queue size with no upgrades', () => {
    mockContent.set('room-forge', {
      id: 'room-forge',
      queueSize: 3,
    } as Partial<RoomContent>);
    mockAppliedEffects = [];
    expect(craftingQueueGetMaxSize(makeRoom())).toBe(3);
  });

  it('should add craftingQueueSize effect to base', () => {
    mockContent.set('room-forge', {
      id: 'room-forge',
      queueSize: 3,
    } as Partial<RoomContent>);
    mockAppliedEffects = [
      { type: 'craftingQueueSize', value: 2 } as RoomUpgradeEffect,
    ];
    expect(craftingQueueGetMaxSize(makeRoom())).toBe(5);
  });

  it('should apply craftingQueueMultiplier to total', () => {
    mockContent.set('room-forge', {
      id: 'room-forge',
      queueSize: 3,
    } as Partial<RoomContent>);
    mockAppliedEffects = [
      { type: 'craftingQueueMultiplier', value: 2 } as RoomUpgradeEffect,
    ];
    expect(craftingQueueGetMaxSize(makeRoom())).toBe(6); // 3 * 2
  });

  it('should apply additive then multiplicative', () => {
    mockContent.set('room-forge', {
      id: 'room-forge',
      queueSize: 3,
    } as Partial<RoomContent>);
    mockAppliedEffects = [
      { type: 'craftingQueueSize', value: 2 } as RoomUpgradeEffect,
      { type: 'craftingQueueMultiplier', value: 1.5 } as RoomUpgradeEffect,
    ];
    // (3 + 2) * 1.5 = 7.5 → floor → 7
    expect(craftingQueueGetMaxSize(makeRoom())).toBe(7);
  });

  it('should stack multiple additive effects', () => {
    mockContent.set('room-forge', {
      id: 'room-forge',
      queueSize: 2,
    } as Partial<RoomContent>);
    mockAppliedEffects = [
      { type: 'craftingQueueSize', value: 1 } as RoomUpgradeEffect,
      { type: 'craftingQueueSize', value: 3 } as RoomUpgradeEffect,
    ];
    expect(craftingQueueGetMaxSize(makeRoom())).toBe(6); // 2 + 1 + 3
  });

  it('should multiply multiple multiplier effects', () => {
    mockContent.set('room-forge', {
      id: 'room-forge',
      queueSize: 4,
    } as Partial<RoomContent>);
    mockAppliedEffects = [
      { type: 'craftingQueueMultiplier', value: 1.5 } as RoomUpgradeEffect,
      { type: 'craftingQueueMultiplier', value: 2 } as RoomUpgradeEffect,
    ];
    // 4 * 1.5 * 2 = 12
    expect(craftingQueueGetMaxSize(makeRoom())).toBe(12);
  });

  it('should ignore unrelated effects', () => {
    mockContent.set('room-forge', {
      id: 'room-forge',
      queueSize: 3,
    } as Partial<RoomContent>);
    mockAppliedEffects = [
      { type: 'maxInhabitantBonus', value: 5 } as RoomUpgradeEffect,
      { type: 'productionMultiplier', value: 2 } as RoomUpgradeEffect,
    ];
    expect(craftingQueueGetMaxSize(makeRoom())).toBe(3);
  });

  it('should floor fractional results', () => {
    mockContent.set('room-forge', {
      id: 'room-forge',
      queueSize: 3,
    } as Partial<RoomContent>);
    mockAppliedEffects = [
      { type: 'craftingQueueMultiplier', value: 1.3 } as RoomUpgradeEffect,
    ];
    // 3 * 1.3 = 3.9 → floor → 3
    expect(craftingQueueGetMaxSize(makeRoom())).toBe(3);
  });
});
