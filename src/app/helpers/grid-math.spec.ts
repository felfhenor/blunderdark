import { describe, expect, it } from 'vitest';
import { gridManhattanDistance } from '@helpers/grid-math';

describe('gridManhattanDistance', () => {
  it('should return 0 for same point', () => {
    expect(gridManhattanDistance(5, 5, 5, 5)).toBe(0);
  });

  it('should return horizontal distance', () => {
    expect(gridManhattanDistance(0, 0, 3, 0)).toBe(3);
  });

  it('should return vertical distance', () => {
    expect(gridManhattanDistance(0, 0, 0, 4)).toBe(4);
  });

  it('should return sum of horizontal and vertical distances', () => {
    expect(gridManhattanDistance(1, 2, 4, 6)).toBe(7); // |4-1| + |6-2|
  });

  it('should be symmetric', () => {
    expect(gridManhattanDistance(1, 2, 4, 6)).toBe(
      gridManhattanDistance(4, 6, 1, 2),
    );
  });

  it('should handle negative coordinates', () => {
    expect(gridManhattanDistance(-1, -2, 3, 4)).toBe(10); // |3-(-1)| + |4-(-2)|
  });

  it('should handle origin', () => {
    expect(gridManhattanDistance(0, 0, 10, 10)).toBe(20);
  });
});
