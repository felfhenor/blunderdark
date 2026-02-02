import { createEmptyGrid, getTile, setTile } from '@helpers/grid';
import {
  addHallway,
  addHallwayToGrid,
  addUpgradeToHallway,
  deserializeHallways,
  getHallwaysBetween,
  isTileBlockedForHallway,
  removeHallway,
  removeHallwayFromGrid,
  removeUpgradeFromHallway,
  serializeHallways,
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

describe('addHallwayToGrid', () => {
  it('should mark hallway tiles as occupied on the grid', () => {
    const grid = createEmptyGrid();
    const result = addHallwayToGrid(grid, testHallway);

    const tile = getTile(result, 5, 5);
    expect(tile?.occupied).toBe(true);
    expect(tile?.occupiedBy).toBe('hallway');
    expect(tile?.hallwayId).toBe('hallway-1');

    const tile2 = getTile(result, 6, 5);
    expect(tile2?.occupied).toBe(true);
    expect(tile2?.occupiedBy).toBe('hallway');
  });

  it('should not modify surrounding tiles', () => {
    const grid = createEmptyGrid();
    const result = addHallwayToGrid(grid, testHallway);

    const adjacent = getTile(result, 4, 5);
    expect(adjacent?.occupied).toBe(false);
    expect(adjacent?.occupiedBy).toBe('empty');
  });
});

describe('removeHallwayFromGrid', () => {
  it('should free hallway tiles on the grid', () => {
    let grid = createEmptyGrid();
    grid = addHallwayToGrid(grid, testHallway);
    grid = removeHallwayFromGrid(grid, testHallway);

    for (const t of testHallway.tiles) {
      const tile = getTile(grid, t.x, t.y);
      expect(tile?.occupied).toBe(false);
      expect(tile?.occupiedBy).toBe('empty');
      expect(tile?.hallwayId).toBeNull();
    }
  });

  it('should not free tiles belonging to a different hallway', () => {
    let grid = createEmptyGrid();
    const otherHallway: Hallway = {
      ...testHallway,
      id: 'hallway-2',
      tiles: [{ x: 5, y: 5 }],
    };
    grid = addHallwayToGrid(grid, otherHallway);

    // Try to remove testHallway (different id) from that tile
    grid = removeHallwayFromGrid(grid, testHallway);

    const tile = getTile(grid, 5, 5);
    expect(tile?.occupied).toBe(true);
    expect(tile?.hallwayId).toBe('hallway-2');
  });
});

describe('isTileBlockedForHallway', () => {
  it('should return false for empty tiles', () => {
    const grid = createEmptyGrid();
    expect(isTileBlockedForHallway(grid, 5, 5)).toBe(false);
  });

  it('should return true for occupied tiles', () => {
    let grid = createEmptyGrid();
    grid = setTile(grid, 5, 5, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'room-1',
      hallwayId: null,
      connectionType: null,
    });
    expect(isTileBlockedForHallway(grid, 5, 5)).toBe(true);
  });

  it('should return true for out-of-bounds coordinates', () => {
    const grid = createEmptyGrid();
    expect(isTileBlockedForHallway(grid, -1, 0)).toBe(true);
    expect(isTileBlockedForHallway(grid, 20, 0)).toBe(true);
  });
});

describe('getHallwaysBetween', () => {
  const hallways: Hallway[] = [
    { ...testHallway, id: 'h1', startRoomId: 'a', endRoomId: 'b' },
    { ...testHallway, id: 'h2', startRoomId: 'b', endRoomId: 'a' },
    { ...testHallway, id: 'h3', startRoomId: 'a', endRoomId: 'c' },
  ];

  it('should find hallways in both directions', () => {
    const result = getHallwaysBetween(hallways, 'a', 'b');
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no hallways connect rooms', () => {
    const result = getHallwaysBetween(hallways, 'b', 'c');
    expect(result).toHaveLength(0);
  });
});

describe('addHallway / removeHallway', () => {
  it('should add a hallway to the collection', () => {
    const result = addHallway([], testHallway);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('hallway-1');
  });

  it('should remove a hallway by id', () => {
    const hallways = addHallway([], testHallway);
    const result = removeHallway(hallways, 'hallway-1');
    expect(result).toHaveLength(0);
  });

  it('should not remove hallways with different ids', () => {
    const hallways = addHallway([], testHallway);
    const result = removeHallway(hallways, 'nonexistent');
    expect(result).toHaveLength(1);
  });
});

describe('hallway upgrades', () => {
  it('should add an upgrade to a hallway', () => {
    const upgraded = addUpgradeToHallway(testHallway, {
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
    const result = removeUpgradeFromHallway(hallway, 'u1');
    expect(result.upgrades).toHaveLength(1);
    expect(result.upgrades[0].id).toBe('u2');
  });

  it('should not mutate original hallway', () => {
    addUpgradeToHallway(testHallway, { id: 'u1', name: 'Test' });
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

    const serialized = JSON.stringify(serializeHallways(hallways));
    const deserialized = deserializeHallways(JSON.parse(serialized));

    expect(deserialized).toHaveLength(1);
    expect(deserialized[0].id).toBe('hallway-1');
    expect(deserialized[0].tiles).toHaveLength(3);
    expect(deserialized[0].upgrades).toHaveLength(1);
    expect(deserialized[0].upgrades[0].name).toBe('Torch');
  });

  it('should handle empty input', () => {
    const result = deserializeHallways([]);
    expect(result).toHaveLength(0);
  });
});
