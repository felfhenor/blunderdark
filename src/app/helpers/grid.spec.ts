import type { GridState, GridTile } from '@interfaces/grid';
import { GRID_SIZE } from '@interfaces/grid';
import { describe, expect, it } from 'vitest';

import {
  createEmptyGrid,
  deselectTile,
  getTile,
  isInBounds,
  resetGrid,
  selectedTile,
  selectTile,
  setTile,
} from '@helpers/grid';

describe('Grid Helpers', () => {
  describe('createEmptyGrid', () => {
    it('should create a 20x20 grid', () => {
      const grid = createEmptyGrid();
      expect(grid.length).toBe(GRID_SIZE);
      for (const row of grid) {
        expect(row.length).toBe(GRID_SIZE);
      }
    });

    it('should create tiles that are all unoccupied', () => {
      const grid = createEmptyGrid();
      for (const row of grid) {
        for (const tile of row) {
          expect(tile.occupied).toBe(false);
          expect(tile.roomId).toBeNull();
          expect(tile.connectionType).toBeNull();
        }
      }
    });
  });

  describe('isInBounds', () => {
    it('should return true for valid coordinates', () => {
      expect(isInBounds(0, 0)).toBe(true);
      expect(isInBounds(19, 19)).toBe(true);
      expect(isInBounds(10, 10)).toBe(true);
    });

    it('should return false for negative coordinates', () => {
      expect(isInBounds(-1, 0)).toBe(false);
      expect(isInBounds(0, -1)).toBe(false);
    });

    it('should return false for coordinates >= GRID_SIZE', () => {
      expect(isInBounds(20, 0)).toBe(false);
      expect(isInBounds(0, 20)).toBe(false);
    });
  });

  describe('getTile', () => {
    it('should return the correct tile', () => {
      const grid = createEmptyGrid();
      const tile = getTile(grid, 5, 10);
      expect(tile).toEqual({
        occupied: false,
        occupiedBy: 'empty',
        roomId: null,
        hallwayId: null,
        connectionType: null,
      });
    });

    it('should return null for out-of-bounds coordinates', () => {
      const grid = createEmptyGrid();
      expect(getTile(grid, -1, 0)).toBeNull();
      expect(getTile(grid, 0, 20)).toBeNull();
      expect(getTile(grid, 25, 25)).toBeNull();
    });
  });

  describe('setTile', () => {
    it('should return a new grid with the updated tile', () => {
      const grid = createEmptyGrid();
      const newTile: GridTile = {
        occupied: true,
        occupiedBy: 'room',
        roomId: 'room-1',
        hallwayId: null,
        connectionType: 'door',
      };

      const newGrid = setTile(grid, 3, 7, newTile);

      expect(newGrid).not.toBe(grid);
      expect(getTile(newGrid, 3, 7)).toEqual(newTile);
    });

    it('should not modify the original grid', () => {
      const grid = createEmptyGrid();
      const newTile: GridTile = {
        occupied: true,
        occupiedBy: 'room',
        roomId: 'room-1',
        hallwayId: null,
        connectionType: null,
      };

      setTile(grid, 3, 7, newTile);

      expect(getTile(grid, 3, 7)?.occupied).toBe(false);
    });

    it('should return the same grid for out-of-bounds coordinates', () => {
      const grid = createEmptyGrid();
      const newTile: GridTile = {
        occupied: true,
        occupiedBy: 'room',
        roomId: 'room-1',
        hallwayId: null,
        connectionType: null,
      };

      const result = setTile(grid, -1, 0, newTile);
      expect(result).toBe(grid);
    });
  });

  describe('resetGrid', () => {
    it('should produce an empty grid', () => {
      const grid = resetGrid();
      expect(grid.length).toBe(GRID_SIZE);
      for (const row of grid) {
        for (const tile of row) {
          expect(tile.occupied).toBe(false);
        }
      }
    });
  });

  describe('selectedTile', () => {
    it('should toggle selection when clicking the same tile', () => {
      selectTile(5, 5);
      expect(selectedTile()).toEqual({ x: 5, y: 5 });

      selectTile(5, 5);
      expect(selectedTile()).toBeNull();
    });

    it('should change selection to a different tile', () => {
      selectTile(5, 5);
      selectTile(10, 10);
      expect(selectedTile()).toEqual({ x: 10, y: 10 });
    });

    it('should deselect tile', () => {
      selectTile(5, 5);
      deselectTile();
      expect(selectedTile()).toBeNull();
    });
  });

  describe('serialization round-trip', () => {
    it('should survive JSON round-trip', () => {
      const grid = createEmptyGrid();
      const modified = setTile(grid, 2, 3, {
        occupied: true,
        occupiedBy: 'room',
        roomId: 'test-room',
        hallwayId: null,
        connectionType: 'corridor',
      });

      const serialized = JSON.stringify(modified);
      const deserialized: GridState = JSON.parse(serialized);

      expect(deserialized.length).toBe(GRID_SIZE);
      expect(deserialized[3][2]).toEqual({
        occupied: true,
        occupiedBy: 'room',
        roomId: 'test-room',
        hallwayId: null,
        connectionType: 'corridor',
      });
    });
  });
});
