/**
 * Manhattan distance between two points on a grid.
 * Takes raw coordinates for performance in hot loops (A*, pathfinding).
 */
export function gridManhattanDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}
