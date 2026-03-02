import { describe, expect, it, vi } from 'vitest';
import type {
  Floor,
  FloorId,
  GameState,
  InhabitantInstance,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeId,
  TraitRune,
  TraitRuneInstanceId,
} from '@interfaces';

const RUNEWORKING_ROOM_TYPE_ID = 'test-runeworking-type' as RoomId;

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) =>
    role === 'runeworking' ? RUNEWORKING_ROOM_TYPE_ID : undefined,
  ),
}));

import {
  RUNEWORKING_BASE_TICKS,
  runeworkingCanStart,
  runeworkingProcess,
} from '@helpers/runeworking';

function makeRoom(
  id: string,
  roomTypeId: RoomId = RUNEWORKING_ROOM_TYPE_ID,
  job?: PlacedRoom['runeworkingJob'],
): PlacedRoom {
  return {
    id: id as PlacedRoomId,
    roomTypeId,
    shapeId: 'square-2x2' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    runeworkingJob: job,
  } as PlacedRoom;
}

function makeInhabitant(
  id: string,
  assignedRoomId?: string,
  opts: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: id,
    definitionId: 'def-1',
    name: `Inhabitant-${id}`,
    assignedRoomId: assignedRoomId as PlacedRoomId | undefined,
    ...opts,
  } as InhabitantInstance;
}

function makeRune(id: string, sourceClass = 'Warrior'): TraitRune {
  return {
    id: id as TraitRuneInstanceId,
    traitId: 'trait-1',
    sourceInvaderClass: sourceClass,
  } as TraitRune;
}

function makeFloor(rooms: PlacedRoom[] = []): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: [],
    rooms,
    hallways: [],
    inhabitants: [],
    connections: [],
  } as Floor;
}

function makeState(
  rooms: PlacedRoom[],
  inhabitants: InhabitantInstance[] = [],
  traitRunes: TraitRune[] = [],
): GameState {
  return {
    world: {
      floors: [makeFloor(rooms)],
      inhabitants,
      traitRunes,
    },
  } as GameState;
}

describe('RUNEWORKING_BASE_TICKS', () => {
  it('should be 5 minutes in ticks', () => {
    expect(RUNEWORKING_BASE_TICKS).toBe(5);
  });
});

describe('runeworkingCanStart', () => {
  it('should return false if room already has a runeworking job', () => {
    const room = makeRoom('r1', RUNEWORKING_ROOM_TYPE_ID, {
      runeId: 'rune-1' as TraitRuneInstanceId,
      inhabitantInstanceId: 'i1',
      ticksRemaining: 3,
    });
    const inhabitants = [makeInhabitant('i1', 'r1')];
    const runes = [makeRune('rune-1')];
    const target = makeInhabitant('i2');

    expect(runeworkingCanStart(room, inhabitants, runes, target)).toBe(false);
  });

  it('should return false if no worker is assigned to the room', () => {
    const room = makeRoom('r1');
    const inhabitants = [makeInhabitant('i1', 'other-room')];
    const runes = [makeRune('rune-1')];
    const target = makeInhabitant('i2');

    expect(runeworkingCanStart(room, inhabitants, runes, target)).toBe(false);
  });

  it('should return false if no runes are available', () => {
    const room = makeRoom('r1');
    const inhabitants = [makeInhabitant('i1', 'r1')];
    const target = makeInhabitant('i2');

    expect(runeworkingCanStart(room, inhabitants, [], target)).toBe(false);
  });

  it('should return false if no target inhabitant is specified', () => {
    const room = makeRoom('r1');
    const inhabitants = [makeInhabitant('i1', 'r1')];
    const runes = [makeRune('rune-1')];

    expect(runeworkingCanStart(room, inhabitants, runes, undefined)).toBe(false);
  });

  it('should return false if target already has an equipped rune', () => {
    const room = makeRoom('r1');
    const inhabitants = [makeInhabitant('i1', 'r1')];
    const runes = [makeRune('rune-1')];
    const target = makeInhabitant('i2', undefined, {
      equippedRuneId: 'existing-rune' as TraitRuneInstanceId,
    });

    expect(runeworkingCanStart(room, inhabitants, runes, target)).toBe(false);
  });

  it('should return true when all conditions are met', () => {
    const room = makeRoom('r1');
    const inhabitants = [makeInhabitant('i1', 'r1')];
    const runes = [makeRune('rune-1')];
    const target = makeInhabitant('i2');

    expect(runeworkingCanStart(room, inhabitants, runes, target)).toBe(true);
  });
});

describe('runeworkingProcess', () => {
  it('should skip rooms that are not runeworking type', () => {
    const room = makeRoom('r1', 'other-type' as RoomId, {
      runeId: 'rune-1' as TraitRuneInstanceId,
      inhabitantInstanceId: 'i1',
      ticksRemaining: 1,
    });
    const state = makeState([room]);
    runeworkingProcess(state);
    expect(room.runeworkingJob!.ticksRemaining).toBe(1);
  });

  it('should skip rooms without a job', () => {
    const room = makeRoom('r1');
    const state = makeState([room]);
    runeworkingProcess(state);
    expect(room.runeworkingJob).toBeUndefined();
  });

  it('should skip rooms without an assigned worker', () => {
    const room = makeRoom('r1', RUNEWORKING_ROOM_TYPE_ID, {
      runeId: 'rune-1' as TraitRuneInstanceId,
      inhabitantInstanceId: 'i1',
      ticksRemaining: 3,
    });
    const state = makeState([room], [makeInhabitant('i1', 'other-room')]);
    runeworkingProcess(state);
    // Ticks should NOT decrement without a worker
    expect(room.runeworkingJob!.ticksRemaining).toBe(3);
  });

  it('should decrement ticksRemaining by numTicks', () => {
    const room = makeRoom('r1', RUNEWORKING_ROOM_TYPE_ID, {
      runeId: 'rune-1' as TraitRuneInstanceId,
      inhabitantInstanceId: 'i1',
      ticksRemaining: 5,
    });
    const worker = makeInhabitant('w1', 'r1');
    const state = makeState([room], [worker]);
    runeworkingProcess(state, 2);
    expect(room.runeworkingJob!.ticksRemaining).toBe(3);
  });

  it('should complete job when ticksRemaining reaches 0', () => {
    const rune = makeRune('rune-1', 'Mage');
    const target = makeInhabitant('target-1', undefined);
    const worker = makeInhabitant('w1', 'r1');
    const room = makeRoom('r1', RUNEWORKING_ROOM_TYPE_ID, {
      runeId: 'rune-1' as TraitRuneInstanceId,
      inhabitantInstanceId: 'target-1',
      ticksRemaining: 1,
    });
    const state = makeState([room], [worker, target], [rune]);

    runeworkingProcess(state, 1);

    // Job should be cleared
    expect(room.runeworkingJob).toBeUndefined();
    // Target should have the rune equipped
    expect(target.equippedRuneId).toBe('rune-1');
    // Rune should be removed from inventory
    expect(state.world.traitRunes).toHaveLength(0);
  });

  it('should handle multiple ticks overshooting to 0', () => {
    const rune = makeRune('rune-1');
    const target = makeInhabitant('target-1');
    const worker = makeInhabitant('w1', 'r1');
    const room = makeRoom('r1', RUNEWORKING_ROOM_TYPE_ID, {
      runeId: 'rune-1' as TraitRuneInstanceId,
      inhabitantInstanceId: 'target-1',
      ticksRemaining: 3,
    });
    const state = makeState([room], [worker, target], [rune]);

    runeworkingProcess(state, 5);

    expect(room.runeworkingJob).toBeUndefined();
    expect(target.equippedRuneId).toBe('rune-1');
  });

  it('should not equip rune if target inhabitant not found', () => {
    const rune = makeRune('rune-1');
    const worker = makeInhabitant('w1', 'r1');
    const room = makeRoom('r1', RUNEWORKING_ROOM_TYPE_ID, {
      runeId: 'rune-1' as TraitRuneInstanceId,
      inhabitantInstanceId: 'nonexistent',
      ticksRemaining: 1,
    });
    const state = makeState([room], [worker], [rune]);

    runeworkingProcess(state, 1);

    // Job still cleared
    expect(room.runeworkingJob).toBeUndefined();
    // Rune should still be in inventory (not consumed)
    expect(state.world.traitRunes).toHaveLength(1);
  });

  it('should not equip rune if rune not found in inventory', () => {
    const target = makeInhabitant('target-1');
    const worker = makeInhabitant('w1', 'r1');
    const room = makeRoom('r1', RUNEWORKING_ROOM_TYPE_ID, {
      runeId: 'nonexistent-rune' as TraitRuneInstanceId,
      inhabitantInstanceId: 'target-1',
      ticksRemaining: 1,
    });
    const state = makeState([room], [worker, target], []);

    runeworkingProcess(state, 1);

    expect(room.runeworkingJob).toBeUndefined();
    expect(target.equippedRuneId).toBeUndefined();
  });
});
