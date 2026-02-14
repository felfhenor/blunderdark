import { gridCreateEmpty } from '@helpers/grid';
import {
  stairCountFloorsTraversed,
  stairFloorsAreConnected,
  stairGetOnFloor,
  stairPlaceOnFloors,
  stairRemoveFromFloors,
  stairValidatePlacement,
} from '@helpers/stairs';
import type { Floor, StairInstance } from '@interfaces';
import { describe, expect, it } from 'vitest';

function makeFloor(depth: number, overrides: Partial<Floor> = {}): Floor {
  return {
    id: `floor-${depth}`,
    name: `Floor ${depth}`,
    depth,
    biome: 'neutral',
    grid: gridCreateEmpty(),
    rooms: [],
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
    ...overrides,
  };
}

function makeStair(overrides: Partial<StairInstance> = {}): StairInstance {
  return {
    id: 'stair-1',
    floorDepthA: 1,
    floorDepthB: 2,
    gridX: 5,
    gridY: 5,
    ...overrides,
  };
}

describe('stairValidatePlacement', () => {
  it('should allow placement on empty tiles with adjacent floor', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    const result = stairValidatePlacement(floors, [], 1, 5, 5, 'down');
    expect(result.valid).toBe(true);
  });

  it('should reject when no floor exists in the target direction', () => {
    const floors = [makeFloor(1)];
    const result = stairValidatePlacement(floors, [], 1, 5, 5, 'down');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No floor below');
  });

  it('should reject when no floor above', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    const result = stairValidatePlacement(floors, [], 1, 5, 5, 'up');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No floor above');
  });

  it('should reject when current floor tile is occupied', () => {
    const floor1 = makeFloor(1);
    floor1.grid[5][5] = {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'room-1',
      hallwayId: undefined,
      stairId: undefined,
      elevatorId: undefined,
      portalId: undefined,
      connectionType: undefined,
    };
    const floors = [floor1, makeFloor(2)];
    const result = stairValidatePlacement(floors, [], 1, 5, 5, 'down');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Tile is occupied on current floor');
  });

  it('should reject when target floor tile is occupied', () => {
    const floor2 = makeFloor(2);
    floor2.grid[5][5] = {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'room-1',
      hallwayId: undefined,
      stairId: undefined,
      elevatorId: undefined,
      portalId: undefined,
      connectionType: undefined,
    };
    const floors = [makeFloor(1), floor2];
    const result = stairValidatePlacement(floors, [], 1, 5, 5, 'down');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Tile is occupied on target floor');
  });

  it('should reject when stairs already exist at this position', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    const existingStair = makeStair();
    const result = stairValidatePlacement(floors, [existingStair], 1, 5, 5, 'down');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Stairs already exist at this position');
  });

  it('should allow placement at a different position', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    const existingStair = makeStair();
    const result = stairValidatePlacement(floors, [existingStair], 1, 10, 10, 'down');
    expect(result.valid).toBe(true);
  });
});

describe('stairPlaceOnFloors', () => {
  it('should mark tiles on both floors', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    const stair = makeStair();
    const result = stairPlaceOnFloors(floors, stair);

    expect(result[0].grid[5][5].occupied).toBe(true);
    expect(result[0].grid[5][5].occupiedBy).toBe('stair');
    expect(result[0].grid[5][5].stairId).toBe('stair-1');

    expect(result[1].grid[5][5].occupied).toBe(true);
    expect(result[1].grid[5][5].occupiedBy).toBe('stair');
    expect(result[1].grid[5][5].stairId).toBe('stair-1');
  });

  it('should not affect other floors', () => {
    const floors = [makeFloor(1), makeFloor(2), makeFloor(3)];
    const stair = makeStair();
    const result = stairPlaceOnFloors(floors, stair);

    expect(result[2].grid[5][5].occupied).toBe(false);
  });

  it('should not mutate original floors', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    const stair = makeStair();
    stairPlaceOnFloors(floors, stair);

    expect(floors[0].grid[5][5].occupied).toBe(false);
    expect(floors[1].grid[5][5].occupied).toBe(false);
  });
});

describe('stairRemoveFromFloors', () => {
  it('should clear tiles on both floors', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    const stair = makeStair();
    const placed = stairPlaceOnFloors(floors, stair);
    const result = stairRemoveFromFloors(placed, 'stair-1', [stair]);

    expect(result[0].grid[5][5].occupied).toBe(false);
    expect(result[0].grid[5][5].stairId).toBeUndefined();

    expect(result[1].grid[5][5].occupied).toBe(false);
    expect(result[1].grid[5][5].stairId).toBeUndefined();
  });

  it('should return unchanged floors when stair not found', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    const result = stairRemoveFromFloors(floors, 'nonexistent', []);
    expect(result).toBe(floors);
  });
});

describe('stairGetOnFloor', () => {
  it('should return stairs touching the given floor', () => {
    const stairs = [
      makeStair({ id: 's1', floorDepthA: 1, floorDepthB: 2 }),
      makeStair({ id: 's2', floorDepthA: 2, floorDepthB: 3, gridX: 10 }),
      makeStair({ id: 's3', floorDepthA: 3, floorDepthB: 4, gridX: 15 }),
    ];

    expect(stairGetOnFloor(stairs, 2)).toHaveLength(2);
    expect(stairGetOnFloor(stairs, 1)).toHaveLength(1);
    expect(stairGetOnFloor(stairs, 4)).toHaveLength(1);
    expect(stairGetOnFloor(stairs, 5)).toHaveLength(0);
  });
});

describe('stairFloorsAreConnected', () => {
  it('should return true for same floor', () => {
    expect(stairFloorsAreConnected([], 1, 1)).toBe(true);
  });

  it('should return true for directly connected floors', () => {
    const stairs = [makeStair({ floorDepthA: 1, floorDepthB: 2 })];
    expect(stairFloorsAreConnected(stairs, 1, 2)).toBe(true);
    expect(stairFloorsAreConnected(stairs, 2, 1)).toBe(true);
  });

  it('should return true for transitively connected floors', () => {
    const stairs = [
      makeStair({ id: 's1', floorDepthA: 1, floorDepthB: 2 }),
      makeStair({ id: 's2', floorDepthA: 2, floorDepthB: 3 }),
    ];
    expect(stairFloorsAreConnected(stairs, 1, 3)).toBe(true);
    expect(stairFloorsAreConnected(stairs, 3, 1)).toBe(true);
  });

  it('should return false for disconnected floors', () => {
    const stairs = [makeStair({ floorDepthA: 1, floorDepthB: 2 })];
    expect(stairFloorsAreConnected(stairs, 1, 3)).toBe(false);
  });

  it('should return false with no stairs', () => {
    expect(stairFloorsAreConnected([], 1, 2)).toBe(false);
  });
});

describe('stairCountFloorsTraversed', () => {
  it('should return 0 for same floor', () => {
    expect(stairCountFloorsTraversed([], 1, 1)).toBe(0);
  });

  it('should return 1 for directly connected floors', () => {
    const stairs = [makeStair({ floorDepthA: 1, floorDepthB: 2 })];
    expect(stairCountFloorsTraversed(stairs, 1, 2)).toBe(1);
  });

  it('should return 2 for two-hop connection', () => {
    const stairs = [
      makeStair({ id: 's1', floorDepthA: 1, floorDepthB: 2 }),
      makeStair({ id: 's2', floorDepthA: 2, floorDepthB: 3 }),
    ];
    expect(stairCountFloorsTraversed(stairs, 1, 3)).toBe(2);
  });

  it('should return undefined for disconnected floors', () => {
    const stairs = [makeStair({ floorDepthA: 1, floorDepthB: 2 })];
    expect(stairCountFloorsTraversed(stairs, 1, 3)).toBeUndefined();
  });
});
