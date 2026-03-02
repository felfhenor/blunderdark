import type { Floor, FloorId, PlacedRoom, PlacedRoomId, RoomId, RoomShapeId } from '@interfaces';
import { describe, expect, it } from 'vitest';
import { ensureFloorSuffixes, generateHallwaySuffix, generateRoomSuffix } from '@helpers/suffix';

function makeFloor(rooms: Partial<PlacedRoom>[] = [], hallways: { suffix?: string }[] = []): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'cavern',
    grid: [],
    rooms: rooms.map((r, i) => ({
      id: `room-${i}` as PlacedRoomId,
      roomTypeId: 'type-a' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
      ...r,
    })),
    hallways: hallways as Floor['hallways'],
    inhabitants: [],
    connections: [],
  } as Floor;
}

describe('generateRoomSuffix', () => {
  it('should return A for first room of type', () => {
    const floor = makeFloor([]);
    expect(generateRoomSuffix(floor, 'type-a' as RoomId)).toBe('A');
  });

  it('should skip taken suffixes', () => {
    const floor = makeFloor([{ suffix: 'A' }]);
    expect(generateRoomSuffix(floor, 'type-a' as RoomId)).toBe('B');
  });

  it('should ignore suffixes from different room types', () => {
    const floor = makeFloor([
      { roomTypeId: 'type-b' as RoomId, suffix: 'A' },
    ]);
    expect(generateRoomSuffix(floor, 'type-a' as RoomId)).toBe('A');
  });

  it('should handle gaps in taken suffixes', () => {
    const floor = makeFloor([
      { suffix: 'A' },
      { suffix: 'C' }, // B is skipped
    ]);
    expect(generateRoomSuffix(floor, 'type-a' as RoomId)).toBe('B');
  });
});

describe('generateHallwaySuffix', () => {
  it('should return A for first hallway', () => {
    const floor = makeFloor();
    expect(generateHallwaySuffix(floor)).toBe('A');
  });

  it('should skip taken hallway suffixes', () => {
    const floor = makeFloor([], [{ suffix: 'A' }, { suffix: 'B' }]);
    expect(generateHallwaySuffix(floor)).toBe('C');
  });
});

describe('ensureFloorSuffixes', () => {
  it('should return same floor if all suffixes assigned', () => {
    const floor = makeFloor(
      [{ suffix: 'A' }],
      [{ suffix: 'A' } as Floor['hallways'][0]],
    );
    const result = ensureFloorSuffixes(floor);
    expect(result).toBe(floor); // same reference = no change
  });

  it('should assign suffix to room without one', () => {
    const floor = makeFloor([{}]); // no suffix
    const result = ensureFloorSuffixes(floor);
    expect(result.rooms[0].suffix).toBe('A');
  });

  it('should not overwrite existing suffixes', () => {
    const floor = makeFloor([{ suffix: 'X' }, {}]);
    const result = ensureFloorSuffixes(floor);
    expect(result.rooms[0].suffix).toBe('X');
    expect(result.rooms[1].suffix).toBe('A'); // first unused
  });

  it('should assign per-type suffixes independently', () => {
    const floor = makeFloor([
      { roomTypeId: 'type-a' as RoomId },
      { roomTypeId: 'type-b' as RoomId },
    ]);
    const result = ensureFloorSuffixes(floor);
    expect(result.rooms[0].suffix).toBe('A');
    expect(result.rooms[1].suffix).toBe('A'); // different type, starts at A
  });

  it('should assign hallway suffixes', () => {
    const floor = makeFloor([], [{} as Floor['hallways'][0]]);
    const result = ensureFloorSuffixes(floor);
    expect(result.hallways[0].suffix).toBe('A');
  });
});
