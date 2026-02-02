import { signal } from '@angular/core';
import type { GridState, GridTile } from '@interfaces/grid';
import { GRID_SIZE } from '@interfaces/grid';

export function createEmptyGrid(): GridState {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      occupied: false,
      roomId: null,
      connectionType: null,
    })),
  );
}

export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function getTile(
  grid: GridState,
  x: number,
  y: number,
): GridTile | null {
  if (!isInBounds(x, y)) return null;
  return grid[y][x];
}

export function setTile(
  grid: GridState,
  x: number,
  y: number,
  tile: GridTile,
): GridState {
  if (!isInBounds(x, y)) return grid;
  const newGrid = grid.map((row) => [...row]);
  newGrid[y][x] = { ...tile };
  return newGrid;
}

export function resetGrid(): GridState {
  return createEmptyGrid();
}

export const selectedTile = signal<{ x: number; y: number } | null>(null);

export function selectTile(x: number, y: number): void {
  const current = selectedTile();
  if (current?.x === x && current?.y === y) {
    selectedTile.set(null);
  } else {
    selectedTile.set({ x, y });
  }
}

export function deselectTile(): void {
  selectedTile.set(null);
}
