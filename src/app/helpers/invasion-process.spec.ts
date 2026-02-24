import { describe, expect, it } from 'vitest';
import type { InvasionObjective } from '@interfaces/invasion-objective';
import type { PlacedRoomId } from '@interfaces/room-shape';
import { invasionCountUnreachableObjectives } from '@helpers/invasion-process';

function makeObjective(overrides: Partial<InvasionObjective> = {}): InvasionObjective {
  return {
    id: 'obj-1' as InvasionObjective['id'],
    type: 'StealTreasure',
    name: 'Test Objective',
    description: '',
    targetId: 'room-target' as unknown as string,
    isPrimary: false,
    isCompleted: false,
    progress: 0,
    ...overrides,
  };
}

describe('invasionCountUnreachableObjectives', () => {
  it('should return 0 when all secondary objectives are on the path', () => {
    const objectives = [
      makeObjective({ id: 'o1' as InvasionObjective['id'], targetId: 'room-a', isPrimary: false }),
      makeObjective({ id: 'o2' as InvasionObjective['id'], targetId: 'room-b', isPrimary: false }),
    ];
    const path: PlacedRoomId[] = ['room-a' as PlacedRoomId, 'room-b' as PlacedRoomId, 'room-c' as PlacedRoomId];

    expect(invasionCountUnreachableObjectives(objectives, path)).toBe(0);
  });

  it('should count secondary objectives not on the path', () => {
    const objectives = [
      makeObjective({ id: 'o1' as InvasionObjective['id'], targetId: 'room-a', isPrimary: false }),
      makeObjective({ id: 'o2' as InvasionObjective['id'], targetId: 'room-x', isPrimary: false }),
      makeObjective({ id: 'o3' as InvasionObjective['id'], targetId: 'room-y', isPrimary: false }),
    ];
    const path: PlacedRoomId[] = ['room-a' as PlacedRoomId, 'room-b' as PlacedRoomId];

    expect(invasionCountUnreachableObjectives(objectives, path)).toBe(2);
  });

  it('should ignore primary objectives', () => {
    const objectives = [
      makeObjective({ id: 'o1' as InvasionObjective['id'], targetId: 'room-x', isPrimary: true }),
      makeObjective({ id: 'o2' as InvasionObjective['id'], targetId: 'room-y', isPrimary: false }),
    ];
    const path: PlacedRoomId[] = ['room-a' as PlacedRoomId];

    // Only the secondary objective (o2) is unreachable; primary (o1) is excluded
    expect(invasionCountUnreachableObjectives(objectives, path)).toBe(1);
  });

  it('should ignore objectives with no targetId', () => {
    const objectives = [
      makeObjective({ id: 'o1' as InvasionObjective['id'], targetId: undefined, isPrimary: false }),
    ];
    const path: PlacedRoomId[] = ['room-a' as PlacedRoomId];

    expect(invasionCountUnreachableObjectives(objectives, path)).toBe(0);
  });

  it('should return 0 for empty objectives', () => {
    const path: PlacedRoomId[] = ['room-a' as PlacedRoomId];
    expect(invasionCountUnreachableObjectives([], path)).toBe(0);
  });

  it('should return 0 for empty path when no objectives have targets', () => {
    expect(invasionCountUnreachableObjectives([], [])).toBe(0);
  });

  it('should count all secondary objectives as unreachable when path is empty', () => {
    const objectives = [
      makeObjective({ id: 'o1' as InvasionObjective['id'], targetId: 'room-a', isPrimary: false }),
      makeObjective({ id: 'o2' as InvasionObjective['id'], targetId: 'room-b', isPrimary: false }),
    ];

    expect(invasionCountUnreachableObjectives(objectives, [])).toBe(2);
  });
});
