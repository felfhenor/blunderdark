import { gridCreateEmpty, gridGetTile, gridSetTile } from '@helpers/grid';
import {
  hallwayAdd,
  hallwayAddToGrid,
  hallwayAddUpgrade,
  hallwayDeserialize,
  hallwayGetBetween,
  hallwayIsTileBlocked,
  hallwayRemove,
  hallwayRemoveFromGrid,
  hallwayRemoveUpgrade,
  hallwaySerialize,
} from '@helpers/hallways';
import type { Hallway } from '@interfaces';
import { describe, expect, it } from 'vitest';

const testHallway: Hallway = {
  id: 'hallway-1',
  startRoomId: 'room-a',
  endRoomId: 'room-b',
  tiles: [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 7, y: 5 },
  ],
  upgrades: [],
};

describe('hallwayAddToGrid', () => {
  it('should mark hallway tiles as occupied on the grid', () => {
    const grid = gridCreateEmpty();
    const result = hallwayAddToGrid(grid, testHallway);

    const tile = gridGetTile(result, 5, 5);
    expect(tile?.occupied).toBe(true);
    expect(tile?.occupiedBy).toBe('hallway');
    expect(tile?.hallwayId).toBe('hallway-1');

    const tile2 = gridGetTile(result, 6, 5);
    expect(tile2?.occupied).toBe(true);
    expect(tile2?.occupiedBy).toBe('hallway');
  });

  it('should not modify surrounding tiles', () => {
    const grid = gridCreateEmpty();
    const result = hallwayAddToGrid(grid, testHallway);

    const adjacent = gridGetTile(result, 4, 5);
    expect(adjacent?.occupied).toBe(false);
    expect(adjacent?.occupiedBy).toBe('empty');
  });
});

describe('hallwayRemoveFromGrid', () => {
  it('should free hallway tiles on the grid', () => {
    let grid = gridCreateEmpty();
    grid = hallwayAddToGrid(grid, testHallway);
    grid = hallwayRemoveFromGrid(grid, testHallway);

    for (const t of testHallway.tiles) {
      const tile = gridGetTile(grid, t.x, t.y);
      expect(tile?.occupied).toBe(false);
      expect(tile?.occupiedBy).toBe('empty');
      expect(tile?.hallwayId).toBeUndefined();
    }
  });

  it('should not free tiles belonging to a different hallway', () => {
    let grid = gridCreateEmpty();
    const otherHallway: Hallway = {
      ...testHallway,
      id: 'hallway-2',
      tiles: [{ x: 5, y: 5 }],
    };
    grid = hallwayAddToGrid(grid, otherHallway);

    // Try to remove testHallway (different id) from that tile
    grid = hallwayRemoveFromGrid(grid, testHallway);

    const tile = gridGetTile(grid, 5, 5);
    expect(tile?.occupied).toBe(true);
    expect(tile?.hallwayId).toBe('hallway-2');
  });
});

describe('hallwayIsTileBlocked', () => {
  it('should return false for empty tiles', () => {
    const grid = gridCreateEmpty();
    expect(hallwayIsTileBlocked(grid, 5, 5)).toBe(false);
  });

  it('should return true for occupied tiles', () => {
    let grid = gridCreateEmpty();
    grid = gridSetTile(grid, 5, 5, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'room-1',
      hallwayId: undefined,
      stairId: undefined,
      connectionType: undefined,
    });
    expect(hallwayIsTileBlocked(grid, 5, 5)).toBe(true);
  });

  it('should return true for out-of-bounds coordinates', () => {
    const grid = gridCreateEmpty();
    expect(hallwayIsTileBlocked(grid, -1, 0)).toBe(true);
    expect(hallwayIsTileBlocked(grid, 20, 0)).toBe(true);
  });
});

describe('hallwayGetBetween', () => {
  const hallways: Hallway[] = [
    { ...testHallway, id: 'h1', startRoomId: 'a', endRoomId: 'b' },
    { ...testHallway, id: 'h2', startRoomId: 'b', endRoomId: 'a' },
    { ...testHallway, id: 'h3', startRoomId: 'a', endRoomId: 'c' },
  ];

  it('should find hallways in both directions', () => {
    const result = hallwayGetBetween(hallways, 'a', 'b');
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no hallways connect rooms', () => {
    const result = hallwayGetBetween(hallways, 'b', 'c');
    expect(result).toHaveLength(0);
  });
});

describe('hallwayAdd / hallwayRemove', () => {
  it('should add a hallway to the collection', () => {
    const result = hallwayAdd([], testHallway);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('hallway-1');
  });

  it('should remove a hallway by id', () => {
    const hallways = hallwayAdd([], testHallway);
    const result = hallwayRemove(hallways, 'hallway-1');
    expect(result).toHaveLength(0);
  });

  it('should not remove hallways with different ids', () => {
    const hallways = hallwayAdd([], testHallway);
    const result = hallwayRemove(hallways, 'nonexistent');
    expect(result).toHaveLength(1);
  });
});

describe('hallway upgrades', () => {
  it('should add an upgrade to a hallway', () => {
    const upgraded = hallwayAddUpgrade(testHallway, {
      id: 'u1',
      name: 'Speed Boost',
    });
    expect(upgraded.upgrades).toHaveLength(1);
    expect(upgraded.upgrades[0].name).toBe('Speed Boost');
  });

  it('should remove an upgrade from a hallway', () => {
    const hallway: Hallway = {
      ...testHallway,
      upgrades: [
        { id: 'u1', name: 'Speed Boost' },
        { id: 'u2', name: 'Defense' },
      ],
    };
    const result = hallwayRemoveUpgrade(hallway, 'u1');
    expect(result.upgrades).toHaveLength(1);
    expect(result.upgrades[0].id).toBe('u2');
  });

  it('should not mutate original hallway', () => {
    hallwayAddUpgrade(testHallway, { id: 'u1', name: 'Test' });
    expect(testHallway.upgrades).toHaveLength(0);
  });
});

describe('serialization', () => {
  it('should round-trip through JSON', () => {
    const hallways: Hallway[] = [
      {
        ...testHallway,
        upgrades: [{ id: 'u1', name: 'Torch' }],
      },
    ];

    const serialized = JSON.stringify(hallwaySerialize(hallways));
    const deserialized = hallwayDeserialize(JSON.parse(serialized));

    expect(deserialized).toHaveLength(1);
    expect(deserialized[0].id).toBe('hallway-1');
    expect(deserialized[0].tiles).toHaveLength(3);
    expect(deserialized[0].upgrades).toHaveLength(1);
    expect(deserialized[0].upgrades[0].name).toBe('Torch');
  });

  it('should handle empty input', () => {
    const result = hallwayDeserialize([]);
    expect(result).toHaveLength(0);
  });
});
