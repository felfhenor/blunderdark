import type { GridState, GridTile } from '@interfaces/grid';
import { GRID_SIZE } from '@interfaces/grid';
import { describe, expect, it } from 'vitest';

import {
  gridCreateEmpty,
  gridDeselectTile,
  gridGetTile,
  gridIsInBounds,
  gridReset,
  gridSelectedTile,
  gridSelectTile,
  gridSetTile,
} from '@helpers/grid';

describe('Grid Helpers', () => {
  describe('gridCreateEmpty', () => {
    it('should create a 20x20 grid', () => {
      const grid = gridCreateEmpty();
      expect(grid.length).toBe(GRID_SIZE);
      for (const row of grid) {
        expect(row.length).toBe(GRID_SIZE);
      }
    });

    it('should create tiles that are all unoccupied', () => {
      const grid = gridCreateEmpty();
      for (const row of grid) {
        for (const tile of row) {
          expect(tile.occupied).toBe(false);
          expect(tile.roomId).toBeUndefined();
          expect(tile.connectionType).toBeUndefined();
        }
      }
    });
  });

  describe('gridIsInBounds', () => {
    it('should return true for valid coordinates', () => {
      expect(gridIsInBounds(0, 0)).toBe(true);
      expect(gridIsInBounds(19, 19)).toBe(true);
      expect(gridIsInBounds(10, 10)).toBe(true);
    });

    it('should return false for negative coordinates', () => {
      expect(gridIsInBounds(-1, 0)).toBe(false);
      expect(gridIsInBounds(0, -1)).toBe(false);
    });

    it('should return false for coordinates >= GRID_SIZE', () => {
      expect(gridIsInBounds(20, 0)).toBe(false);
      expect(gridIsInBounds(0, 20)).toBe(false);
    });
  });

  describe('gridGetTile', () => {
    it('should return the correct tile', () => {
      const grid = gridCreateEmpty();
      const tile = gridGetTile(grid, 5, 10);
      expect(tile).toEqual({
        occupied: false,
        occupiedBy: 'empty',
        roomId: undefined,
        hallwayId: undefined,
        stairId: undefined,
        elevatorId: undefined,
        portalId: undefined,
        connectionType: undefined,
      });
    });

    it('should return undefined for out-of-bounds coordinates', () => {
      const grid = gridCreateEmpty();
      expect(gridGetTile(grid, -1, 0)).toBeUndefined();
      expect(gridGetTile(grid, 0, 20)).toBeUndefined();
      expect(gridGetTile(grid, 25, 25)).toBeUndefined();
    });
  });

  describe('gridSetTile', () => {
    it('should return a new grid with the updated tile', () => {
      const grid = gridCreateEmpty();
      const newTile: GridTile = {
        occupied: true,
        occupiedBy: 'room',
        roomId: 'room-1',
        hallwayId: undefined,
        stairId: undefined,
        elevatorId: undefined,
        portalId: undefined,
        connectionType: 'door',
      };

      const newGrid = gridSetTile(grid, 3, 7, newTile);

      expect(newGrid).not.toBe(grid);
      expect(gridGetTile(newGrid, 3, 7)).toEqual(newTile);
    });

    it('should not modify the original grid', () => {
      const grid = gridCreateEmpty();
      const newTile: GridTile = {
        occupied: true,
        occupiedBy: 'room',
        roomId: 'room-1',
        hallwayId: undefined,
        stairId: undefined,
        elevatorId: undefined,
        portalId: undefined,
        connectionType: undefined,
      };

      gridSetTile(grid, 3, 7, newTile);

      expect(gridGetTile(grid, 3, 7)?.occupied).toBe(false);
    });

    it('should return the same grid for out-of-bounds coordinates', () => {
      const grid = gridCreateEmpty();
      const newTile: GridTile = {
        occupied: true,
        occupiedBy: 'room',
        roomId: 'room-1',
        hallwayId: undefined,
        stairId: undefined,
        elevatorId: undefined,
        portalId: undefined,
        connectionType: undefined,
      };

      const result = gridSetTile(grid, -1, 0, newTile);
      expect(result).toBe(grid);
    });
  });

  describe('gridReset', () => {
    it('should produce an empty grid', () => {
      const grid = gridReset();
      expect(grid.length).toBe(GRID_SIZE);
      for (const row of grid) {
        for (const tile of row) {
          expect(tile.occupied).toBe(false);
        }
      }
    });
  });

  describe('gridSelectedTile', () => {
    it('should toggle selection when clicking the same tile', () => {
      gridSelectTile(5, 5);
      expect(gridSelectedTile()).toEqual({ x: 5, y: 5 });

      gridSelectTile(5, 5);
      expect(gridSelectedTile()).toBeUndefined();
    });

    it('should change selection to a different tile', () => {
      gridSelectTile(5, 5);
      gridSelectTile(10, 10);
      expect(gridSelectedTile()).toEqual({ x: 10, y: 10 });
    });

    it('should deselect tile', () => {
      gridSelectTile(5, 5);
      gridDeselectTile();
      expect(gridSelectedTile()).toBeUndefined();
    });
  });

  describe('serialization round-trip', () => {
    it('should survive JSON round-trip', () => {
      const grid = gridCreateEmpty();
      const modified = gridSetTile(grid, 2, 3, {
        occupied: true,
        occupiedBy: 'room',
        roomId: 'test-room',
        hallwayId: undefined,
        stairId: undefined,
        elevatorId: undefined,
        portalId: undefined,
        connectionType: 'corridor',
      });

      const serialized = JSON.stringify(modified);
      const deserialized: GridState = JSON.parse(serialized);

      expect(deserialized.length).toBe(GRID_SIZE);
      expect(deserialized[3][2]).toEqual({
        occupied: true,
        occupiedBy: 'room',
        roomId: 'test-room',
        hallwayId: undefined,
        stairId: undefined,
        elevatorId: undefined,
        portalId: undefined,
        connectionType: 'corridor',
      });
    });
  });
});
