import { signal } from '@angular/core';
import type { GridState, GridTile } from '@interfaces/grid';
import { GRID_SIZE } from '@interfaces/grid';

export function gridCreateEmpty(): GridState {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      occupied: false,
      occupiedBy: 'empty' as const,
      roomId: undefined,
      hallwayId: undefined,
      stairId: undefined,
      connectionType: undefined,
    })),
  );
}

export function gridIsInBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function gridGetTile(
  grid: GridState,
  x: number,
  y: number,
): GridTile | undefined {
  if (!gridIsInBounds(x, y)) return undefined;
  return grid[y][x];
}

export function gridSetTile(
  grid: GridState,
  x: number,
  y: number,
  tile: GridTile,
): GridState {
  if (!gridIsInBounds(x, y)) return grid;
  const newGrid = grid.map((row) => [...row]);
  newGrid[y][x] = { ...tile };
  return newGrid;
}

export function gridReset(): GridState {
  return gridCreateEmpty();
}

export const gridSelectedTile = signal<{ x: number; y: number } | undefined>(undefined);

export function gridSelectTile(x: number, y: number): void {
  const current = gridSelectedTile();
  if (current?.x === x && current?.y === y) {
    gridSelectedTile.set(undefined);
  } else {
    gridSelectedTile.set({ x, y });
  }
}

export function gridDeselectTile(): void {
  gridSelectedTile.set(undefined);
}
