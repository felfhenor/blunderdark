import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Floor,
  FloorId,
  GridState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  RoomContent,
  RoomId,
  RoomShapeId,
  RoomUpgradeEffect,
  TileOffset,
} from '@interfaces';
import type { AdjacencyMap } from '@interfaces/adjacency';

// --- Mocks ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((id: string) => mockContent.get(id)),
}));

vi.mock('@helpers/room-upgrades', () => ({
  roomUpgradeGetAppliedEffects: vi.fn((): RoomUpgradeEffect[] => []),
}));

vi.mock('@helpers/altar-room', () => ({
  altarRoomIsAdjacent: vi.fn((): boolean => false),
  altarRoomGetFearReductionAura: vi.fn((): number => 0),
}));

vi.mock('@helpers/production', () => ({
  productionGetRoomDefinition: vi.fn((id: string) => mockContent.get(id)),
}));

vi.mock('@helpers/throne-room', () => ({
  throneRoomGetFearLevel: vi.fn((): number | undefined => undefined),
}));

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(),
}));

vi.mock('@helpers/room-shapes', () => ({
  roomShapeResolve: vi.fn(() => ({
    tiles: [{ x: 0, y: 0 }],
    width: 1,
    height: 1,
  })),
  roomShapeGetAbsoluteTiles: vi.fn(
    (_shape: unknown, anchorX: number, anchorY: number): TileOffset[] => [
      { x: anchorX, y: anchorY },
    ],
  ),
}));

// --- Import after mocks ---

import {
  FEAR_LEVEL_HIGH,
  FEAR_LEVEL_LABELS,
  FEAR_LEVEL_LOW,
  FEAR_LEVEL_MAX,
  FEAR_LEVEL_MEDIUM,
  FEAR_LEVEL_MIN,
  FEAR_LEVEL_NONE,
  FEAR_LEVEL_PROPAGATION_DEFAULT_DISTANCE,
  FEAR_LEVEL_VERY_HIGH,
  fearLevelBuildAdjacencyMap,
  fearLevelCalculateAllForFloor,
  fearLevelCalculateAllPropagation,
  fearLevelCalculateEffective,
  fearLevelCalculateInhabitantModifier,
  fearLevelCalculatePropagationAmount,
  fearLevelCalculateSourceFear,
  fearLevelCalculateUpgradeAdjustment,
  fearLevelGetForRoom,
  fearLevelGetLabel,
  fearLevelGetMaxPropagationDistance,
} from '@helpers/fear-level';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { altarRoomIsAdjacent, altarRoomGetFearReductionAura } from '@helpers/altar-room';
import { roomShapeGetAbsoluteTiles } from '@helpers/room-shapes';

// --- Test helpers ---

function makeInhabitant(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
  return {
    instanceId: overrides.instanceId ?? 'inst-1' as InhabitantInstanceId,
    definitionId: overrides.definitionId ?? 'def-goblin' as InhabitantId,
    name: overrides.name ?? 'Goblin',
    state: overrides.state ?? 'normal',
    assignedRoomId: overrides.assignedRoomId ?? undefined,
  };
}

function makePlacedRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: overrides.id ?? 'room-1' as PlacedRoomId,
    roomTypeId: overrides.roomTypeId ?? 'room-type-1' as RoomId,
    shapeId: overrides.shapeId ?? 'shape-1' as RoomShapeId,
    anchorX: overrides.anchorX ?? 0,
    anchorY: overrides.anchorY ?? 0,
    appliedUpgradePathId: overrides.appliedUpgradePathId ?? undefined,
  };
}

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: overrides.id ?? 'floor-1' as FloorId,
    name: overrides.name ?? 'Floor 1',
    depth: overrides.depth ?? 1,
    biome: overrides.biome ?? 'neutral',
    grid: overrides.grid ?? ([] as unknown as GridState),
    rooms: overrides.rooms ?? [],
    hallways: overrides.hallways ?? [],
    inhabitants: overrides.inhabitants ?? [],
    connections: overrides.connections ?? [],
    traps: overrides.traps ?? [],
  };
}

function registerInhabitantDef(
  id: string,
  fearModifier: number,
  fearPropagationDistance?: number,
): void {
  mockContent.set(id, {
    id,
    name: id,
    __type: 'inhabitant',
    fearModifier,
    fearPropagationDistance: fearPropagationDistance ?? 1,
  });
}

function registerRoomDef(id: string, fearLevel: number | 'variable', name?: string): void {
  mockContent.set(id, {
    id,
    name: name ?? id,
    __type: 'room',
    fearLevel,
    production: {},
  });
}

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  vi.mocked(roomUpgradeGetAppliedEffects).mockReturnValue([]);
  vi.mocked(altarRoomIsAdjacent).mockReturnValue(false);
  vi.mocked(altarRoomGetFearReductionAura).mockReturnValue(0);

  registerInhabitantDef('def-goblin', 0);
  registerInhabitantDef('def-skeleton', 1);
  registerInhabitantDef('def-myconid', -1);
  registerInhabitantDef('def-dragon', 2, 2);
  registerInhabitantDef('def-slime', 0);
});

// --- Constants ---

describe('Constants', () => {
  it('should have correct fear level values', () => {
    expect(FEAR_LEVEL_NONE).toBe(0);
    expect(FEAR_LEVEL_LOW).toBe(1);
    expect(FEAR_LEVEL_MEDIUM).toBe(2);
    expect(FEAR_LEVEL_HIGH).toBe(3);
    expect(FEAR_LEVEL_VERY_HIGH).toBe(4);
  });

  it('should have correct min/max', () => {
    expect(FEAR_LEVEL_MIN).toBe(0);
    expect(FEAR_LEVEL_MAX).toBe(4);
  });

  it('should have correct default propagation distance', () => {
    expect(FEAR_LEVEL_PROPAGATION_DEFAULT_DISTANCE).toBe(1);
  });

  it('should have labels for all levels', () => {
    expect(FEAR_LEVEL_LABELS[0]).toBe('None');
    expect(FEAR_LEVEL_LABELS[1]).toBe('Low');
    expect(FEAR_LEVEL_LABELS[2]).toBe('Medium');
    expect(FEAR_LEVEL_LABELS[3]).toBe('High');
    expect(FEAR_LEVEL_LABELS[4]).toBe('Very High');
  });
});

// --- fearLevelGetLabel ---

describe('fearLevelGetLabel', () => {
  it('should return correct label for each level', () => {
    expect(fearLevelGetLabel(0)).toBe('None');
    expect(fearLevelGetLabel(1)).toBe('Low');
    expect(fearLevelGetLabel(2)).toBe('Medium');
    expect(fearLevelGetLabel(3)).toBe('High');
    expect(fearLevelGetLabel(4)).toBe('Very High');
  });

  it('should return Unknown for out-of-range values', () => {
    expect(fearLevelGetLabel(-1)).toBe('Unknown');
    expect(fearLevelGetLabel(5)).toBe('Unknown');
    expect(fearLevelGetLabel(99)).toBe('Unknown');
  });
});

// --- fearLevelCalculateInhabitantModifier ---

describe('fearLevelCalculateInhabitantModifier', () => {
  it('should return 0 for no inhabitants', () => {
    expect(fearLevelCalculateInhabitantModifier('room-1' as PlacedRoomId, [])).toBe(0);
  });

  it('should return 0 when no inhabitants assigned to room', () => {
    const inhabitants = [
      makeInhabitant({ assignedRoomId: 'room-other' as PlacedRoomId, definitionId: 'def-dragon' as InhabitantId }),
    ];
    expect(fearLevelCalculateInhabitantModifier('room-1' as PlacedRoomId, inhabitants)).toBe(0);
  });

  it('should sum positive fearModifiers', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-skeleton' as InhabitantId }),
      makeInhabitant({ instanceId: 'inst-2' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-dragon' as InhabitantId }),
    ];
    // skeleton=1, dragon=2 => 3
    expect(fearLevelCalculateInhabitantModifier('room-1' as PlacedRoomId, inhabitants)).toBe(3);
  });

  it('should sum negative fearModifiers', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-myconid' as InhabitantId }),
      makeInhabitant({ instanceId: 'inst-2' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-myconid' as InhabitantId }),
    ];
    // myconid=-1 * 2 => -2
    expect(fearLevelCalculateInhabitantModifier('room-1' as PlacedRoomId, inhabitants)).toBe(-2);
  });

  it('should handle mixed positive and negative modifiers', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-skeleton' as InhabitantId }),
      makeInhabitant({ instanceId: 'inst-2' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-myconid' as InhabitantId }),
    ];
    // skeleton=1, myconid=-1 => 0
    expect(fearLevelCalculateInhabitantModifier('room-1' as PlacedRoomId, inhabitants)).toBe(0);
  });

  it('should ignore inhabitants assigned to other rooms', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-skeleton' as InhabitantId }),
      makeInhabitant({ instanceId: 'inst-2' as InhabitantInstanceId, assignedRoomId: 'room-2' as PlacedRoomId, definitionId: 'def-dragon' as InhabitantId }),
    ];
    // only skeleton=1 is in room-1
    expect(fearLevelCalculateInhabitantModifier('room-1' as PlacedRoomId, inhabitants)).toBe(1);
  });

  it('should ignore unassigned inhabitants', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1' as InhabitantInstanceId, assignedRoomId: undefined, definitionId: 'def-dragon' as InhabitantId }),
    ];
    expect(fearLevelCalculateInhabitantModifier('room-1' as PlacedRoomId, inhabitants)).toBe(0);
  });

  it('should handle unknown definitions gracefully', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-unknown' as InhabitantId }),
    ];
    expect(fearLevelCalculateInhabitantModifier('room-1' as PlacedRoomId, inhabitants)).toBe(0);
  });
});

// --- fearLevelCalculateUpgradeAdjustment ---

describe('fearLevelCalculateUpgradeAdjustment', () => {
  it('should return 0 for no upgrade effects', () => {
    const room = makePlacedRoom();
    expect(fearLevelCalculateUpgradeAdjustment(room)).toBe(0);
  });

  it('should return negative for fearReduction effect', () => {
    vi.mocked(roomUpgradeGetAppliedEffects).mockReturnValue([
      { type: 'fearReduction', value: 1 },
    ]);
    const room = makePlacedRoom();
    expect(fearLevelCalculateUpgradeAdjustment(room)).toBe(-1);
  });

  it('should return positive for fearIncrease effect', () => {
    vi.mocked(roomUpgradeGetAppliedEffects).mockReturnValue([
      { type: 'fearIncrease', value: 2 },
    ]);
    const room = makePlacedRoom();
    expect(fearLevelCalculateUpgradeAdjustment(room)).toBe(2);
  });

  it('should combine fearReduction and fearIncrease', () => {
    vi.mocked(roomUpgradeGetAppliedEffects).mockReturnValue([
      { type: 'fearReduction', value: 1 },
      { type: 'fearIncrease', value: 3 },
    ]);
    const room = makePlacedRoom();
    // -1 + 3 = 2
    expect(fearLevelCalculateUpgradeAdjustment(room)).toBe(2);
  });

  it('should ignore unrelated upgrade effects', () => {
    vi.mocked(roomUpgradeGetAppliedEffects).mockReturnValue([
      { type: 'productionBonus', value: 5 },
      { type: 'fearReduction', value: 1 },
    ]);
    const room = makePlacedRoom();
    expect(fearLevelCalculateUpgradeAdjustment(room)).toBe(-1);
  });
});

// --- fearLevelCalculateEffective ---

describe('fearLevelCalculateEffective', () => {
  it('should return base fear when no modifiers', () => {
    expect(fearLevelCalculateEffective(2, 0, 0, 0)).toBe(2);
  });

  it('should add inhabitant modifier', () => {
    expect(fearLevelCalculateEffective(1, 2, 0, 0)).toBe(3);
  });

  it('should add upgrade adjustment', () => {
    expect(fearLevelCalculateEffective(2, 0, -1, 0)).toBe(1);
  });

  it('should subtract altar aura reduction', () => {
    expect(fearLevelCalculateEffective(3, 0, 0, 2)).toBe(1);
  });

  it('should add propagated fear', () => {
    expect(fearLevelCalculateEffective(1, 0, 0, 0, 2)).toBe(3);
  });

  it('should combine all modifiers', () => {
    // 2 + 1 + (-1) - 1 + 1 = 2
    expect(fearLevelCalculateEffective(2, 1, -1, 1, 1)).toBe(2);
  });

  it('should clamp to 0 (FEAR_LEVEL_MIN)', () => {
    expect(fearLevelCalculateEffective(1, -3, -2, 1)).toBe(0);
  });

  it('should clamp to 4 (FEAR_LEVEL_MAX)', () => {
    expect(fearLevelCalculateEffective(3, 2, 1, 0)).toBe(4);
  });

  it('should clamp with propagated fear at max', () => {
    expect(fearLevelCalculateEffective(2, 0, 0, 0, 5)).toBe(4);
  });

  it('should clamp exactly at boundaries', () => {
    expect(fearLevelCalculateEffective(0, 0, 0, 0)).toBe(0);
    expect(fearLevelCalculateEffective(4, 0, 0, 0)).toBe(4);
  });

  it('should default propagatedFear to 0 when omitted', () => {
    expect(fearLevelCalculateEffective(2, 0, 0, 0)).toBe(2);
  });
});

// --- fearLevelCalculateSourceFear ---

describe('fearLevelCalculateSourceFear', () => {
  it('should return sum of baseFear and inhabitantModifier', () => {
    expect(fearLevelCalculateSourceFear(2, 1)).toBe(3);
  });

  it('should handle negative inhabitant modifier', () => {
    expect(fearLevelCalculateSourceFear(2, -1)).toBe(1);
  });

  it('should not clamp (can exceed bounds)', () => {
    expect(fearLevelCalculateSourceFear(4, 3)).toBe(7);
    expect(fearLevelCalculateSourceFear(0, -2)).toBe(-2);
  });
});

// --- fearLevelCalculatePropagationAmount ---

describe('fearLevelCalculatePropagationAmount', () => {
  it('should return 0 for fear below High', () => {
    expect(fearLevelCalculatePropagationAmount(0)).toBe(0);
    expect(fearLevelCalculatePropagationAmount(1)).toBe(0);
    expect(fearLevelCalculatePropagationAmount(2)).toBe(0);
  });

  it('should return 1 for High fear', () => {
    expect(fearLevelCalculatePropagationAmount(3)).toBe(1);
  });

  it('should return 2 for Very High fear', () => {
    expect(fearLevelCalculatePropagationAmount(4)).toBe(2);
  });

  it('should return 2 for fear above Very High', () => {
    expect(fearLevelCalculatePropagationAmount(5)).toBe(2);
    expect(fearLevelCalculatePropagationAmount(10)).toBe(2);
  });
});

// --- fearLevelGetMaxPropagationDistance ---

describe('fearLevelGetMaxPropagationDistance', () => {
  it('should return default distance when no inhabitants', () => {
    expect(fearLevelGetMaxPropagationDistance('room-1' as PlacedRoomId, [])).toBe(1);
  });

  it('should return default when inhabitants have no extended distance', () => {
    const inhabitants = [
      makeInhabitant({ assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-goblin' as InhabitantId }),
    ];
    // goblin has fearPropagationDistance: 1 (default)
    expect(fearLevelGetMaxPropagationDistance('room-1' as PlacedRoomId, inhabitants)).toBe(1);
  });

  it('should return max distance from inhabitants', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-goblin' as InhabitantId }),
      makeInhabitant({ instanceId: 'inst-2' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-dragon' as InhabitantId }),
    ];
    // dragon has fearPropagationDistance: 2
    expect(fearLevelGetMaxPropagationDistance('room-1' as PlacedRoomId, inhabitants)).toBe(2);
  });

  it('should ignore inhabitants in other rooms', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1' as InhabitantInstanceId, assignedRoomId: 'room-2' as PlacedRoomId, definitionId: 'def-dragon' as InhabitantId }),
    ];
    expect(fearLevelGetMaxPropagationDistance('room-1' as PlacedRoomId, inhabitants)).toBe(1);
  });

  it('should handle unknown definitions gracefully', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-unknown' as InhabitantId }),
    ];
    expect(fearLevelGetMaxPropagationDistance('room-1' as PlacedRoomId, inhabitants)).toBe(1);
  });
});

// --- fearLevelCalculateAllPropagation ---

describe('fearLevelCalculateAllPropagation', () => {
  const rid = (s: string) => s as PlacedRoomId;

  function adjMap(obj: Record<string, string[]>): AdjacencyMap {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k as PlacedRoomId, v.map(rid)]),
    ) as AdjacencyMap;
  }

  function fearMap(entries: [string, number][]): Map<PlacedRoomId, number> {
    return new Map(entries.map(([k, v]) => [rid(k), v]));
  }

  function nameMap(entries: [string, string][]): Map<PlacedRoomId, string> {
    return new Map(entries.map(([k, v]) => [rid(k), v]));
  }

  it('should return empty map when no rooms have high fear', () => {
    const adjacencyMap = adjMap({
      'room-a': ['room-b'],
      'room-b': ['room-a'],
    });
    const sourceFears = fearMap([['room-a', 2], ['room-b', 1]]);
    const distances = fearMap([['room-a', 1], ['room-b', 1]]);
    const names = nameMap([['room-a', 'Room A'], ['room-b', 'Room B']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    expect(result.size).toBe(0);
  });

  it('should propagate +1 from High (3) source to adjacent room', () => {
    const adjacencyMap = adjMap({
      'room-a': ['room-b'],
      'room-b': ['room-a'],
    });
    const sourceFears = fearMap([['room-a', 3], ['room-b', 0]]);
    const distances = fearMap([['room-a', 1], ['room-b', 1]]);
    const names = nameMap([['room-a', 'Soul Well'], ['room-b', 'Mine']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    expect(result.get(rid('room-b'))?.total).toBe(1);
    expect(result.get(rid('room-b'))?.sources).toHaveLength(1);
    expect(result.get(rid('room-b'))?.sources[0]).toEqual({
      sourceRoomId: 'room-a',
      sourceRoomName: 'Soul Well',
      amount: 1,
    });
    // Source room should not propagate to itself
    expect(result.has(rid('room-a'))).toBe(false);
  });

  it('should propagate +2 from Very High (4) source to adjacent room', () => {
    const adjacencyMap = adjMap({
      'room-a': ['room-b'],
      'room-b': ['room-a'],
    });
    const sourceFears = fearMap([['room-a', 4], ['room-b', 0]]);
    const distances = fearMap([['room-a', 1], ['room-b', 1]]);
    const names = nameMap([['room-a', 'Dark Room'], ['room-b', 'Mine']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    expect(result.get(rid('room-b'))?.total).toBe(2);
    expect(result.get(rid('room-b'))?.sources[0].amount).toBe(2);
  });

  it('should stack propagated fear from multiple sources', () => {
    const adjacencyMap = adjMap({
      'room-a': ['room-c'],
      'room-b': ['room-c'],
      'room-c': ['room-a', 'room-b'],
    });
    const sourceFears = fearMap([['room-a', 3], ['room-b', 4], ['room-c', 0]]);
    const distances = fearMap([['room-a', 1], ['room-b', 1], ['room-c', 1]]);
    const names = nameMap([['room-a', 'Source A'], ['room-b', 'Source B'], ['room-c', 'Target']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    // room-c gets +1 from A (High) and +2 from B (Very High) = 3
    expect(result.get(rid('room-c'))?.total).toBe(3);
    expect(result.get(rid('room-c'))?.sources).toHaveLength(2);
  });

  it('should not propagate to rooms beyond max distance', () => {
    const adjacencyMap = adjMap({
      'room-a': ['room-b'],
      'room-b': ['room-a', 'room-c'],
      'room-c': ['room-b'],
    });
    const sourceFears = fearMap([['room-a', 3], ['room-b', 0], ['room-c', 0]]);
    const distances = fearMap([['room-a', 1], ['room-b', 1], ['room-c', 1]]);
    const names = nameMap([['room-a', 'Source'], ['room-b', 'B'], ['room-c', 'C']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    // room-b gets +1 (adjacent to source), room-c gets nothing (distance 2, but max is 1)
    expect(result.get(rid('room-b'))?.total).toBe(1);
    expect(result.has(rid('room-c'))).toBe(false);
  });

  it('should propagate at distance 2 with attenuation', () => {
    const adjacencyMap = adjMap({
      'room-a': ['room-b'],
      'room-b': ['room-a', 'room-c'],
      'room-c': ['room-b'],
    });
    // Very High (4) source with distance 2
    const sourceFears = fearMap([['room-a', 4], ['room-b', 0], ['room-c', 0]]);
    const distances = fearMap([['room-a', 2], ['room-b', 1], ['room-c', 1]]);
    const names = nameMap([['room-a', 'Source'], ['room-b', 'B'], ['room-c', 'C']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    // room-b: distance 1, base 2, attenuation 0 => +2
    expect(result.get(rid('room-b'))?.total).toBe(2);
    // room-c: distance 2, base 2, attenuation 1 => +1
    expect(result.get(rid('room-c'))?.total).toBe(1);
  });

  it('should not propagate at distance 2 when attenuation removes all fear', () => {
    const adjacencyMap = adjMap({
      'room-a': ['room-b'],
      'room-b': ['room-a', 'room-c'],
      'room-c': ['room-b'],
    });
    // High (3) source with distance 2: base propagation 1, distance 2 attenuation 1 => 0
    const sourceFears = fearMap([['room-a', 3], ['room-b', 0], ['room-c', 0]]);
    const distances = fearMap([['room-a', 2], ['room-b', 1], ['room-c', 1]]);
    const names = nameMap([['room-a', 'Source'], ['room-b', 'B'], ['room-c', 'C']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    // room-b: distance 1, base 1, attenuation 0 => +1
    expect(result.get(rid('room-b'))?.total).toBe(1);
    // room-c: distance 2, base 1, attenuation 1 => 0, so no propagation
    expect(result.has(rid('room-c'))).toBe(false);
  });

  it('should not propagate back to the source room', () => {
    const adjacencyMap = adjMap({
      'room-a': ['room-b'],
      'room-b': ['room-a'],
    });
    const sourceFears = fearMap([['room-a', 4], ['room-b', 0]]);
    const distances = fearMap([['room-a', 1], ['room-b', 1]]);
    const names = nameMap([['room-a', 'Source'], ['room-b', 'B']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    expect(result.has(rid('room-a'))).toBe(false);
  });

  it('should handle no adjacency', () => {
    const adjacencyMap = adjMap({
      'room-a': [],
      'room-b': [],
    });
    const sourceFears = fearMap([['room-a', 4], ['room-b', 0]]);
    const distances = fearMap([['room-a', 1], ['room-b', 1]]);
    const names = nameMap([['room-a', 'A'], ['room-b', 'B']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    expect(result.size).toBe(0);
  });

  it('should handle multiple sources propagating to same target with different amounts', () => {
    const adjacencyMap = adjMap({
      'room-a': ['room-target'],
      'room-b': ['room-target'],
      'room-target': ['room-a', 'room-b'],
    });
    const sourceFears = fearMap([['room-a', 3], ['room-b', 3], ['room-target', 0]]);
    const distances = fearMap([['room-a', 1], ['room-b', 1], ['room-target', 1]]);
    const names = nameMap([['room-a', 'A'], ['room-b', 'B'], ['room-target', 'Target']]);

    const result = fearLevelCalculateAllPropagation(adjacencyMap, sourceFears, distances, names);

    // Each High source propagates +1, total = 2
    expect(result.get(rid('room-target'))?.total).toBe(2);
    expect(result.get(rid('room-target'))?.sources).toHaveLength(2);
  });
});

// --- fearLevelGetForRoom ---

describe('fearLevelGetForRoom', () => {
  it('should return breakdown with base fear from room definition', () => {
    const room = makePlacedRoom();
    const roomDef = { fearLevel: 2 } as RoomContent;
    const floor = makeFloor({ rooms: [room], inhabitants: [] });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.baseFear).toBe(2);
    expect(result.inhabitantModifier).toBe(0);
    expect(result.upgradeAdjustment).toBe(0);
    expect(result.altarAuraReduction).toBe(0);
    expect(result.propagatedFear).toBe(0);
    expect(result.propagationSources).toEqual([]);
    expect(result.effectiveFear).toBe(2);
  });

  it('should resolve variable fear level using throneRoomFear', () => {
    const room = makePlacedRoom();
    const roomDef = { fearLevel: 'variable' } as RoomContent;
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelGetForRoom(floor, room, roomDef, 3);

    expect(result.baseFear).toBe(3);
    expect(result.effectiveFear).toBe(3);
  });

  it('should default variable fear to 0 when throneRoomFear is undefined', () => {
    const room = makePlacedRoom();
    const roomDef = { fearLevel: 'variable' } as RoomContent;
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.baseFear).toBe(0);
    expect(result.effectiveFear).toBe(0);
  });

  it('should include inhabitant modifier', () => {
    const room = makePlacedRoom({ id: 'room-1' as PlacedRoomId });
    const roomDef = { fearLevel: 1 } as RoomContent;
    const inhabitants = [
      makeInhabitant({ assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-skeleton' as InhabitantId }),
    ];
    const floor = makeFloor({ rooms: [room], inhabitants });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.inhabitantModifier).toBe(1);
    expect(result.effectiveFear).toBe(2);
  });

  it('should include upgrade adjustment', () => {
    vi.mocked(roomUpgradeGetAppliedEffects).mockReturnValue([
      { type: 'fearReduction', value: 1 },
    ]);
    const room = makePlacedRoom();
    const roomDef = { fearLevel: 3 } as RoomContent;
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.upgradeAdjustment).toBe(-1);
    expect(result.effectiveFear).toBe(2);
  });

  it('should include altar aura reduction when adjacent', () => {
    vi.mocked(altarRoomIsAdjacent).mockReturnValue(true);
    vi.mocked(altarRoomGetFearReductionAura).mockReturnValue(2);

    const room = makePlacedRoom();
    const roomDef = { fearLevel: 3 } as RoomContent;
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.altarAuraReduction).toBe(2);
    expect(result.effectiveFear).toBe(1);
  });

  it('should not apply altar aura when not adjacent', () => {
    vi.mocked(altarRoomIsAdjacent).mockReturnValue(false);
    vi.mocked(altarRoomGetFearReductionAura).mockReturnValue(2);

    const room = makePlacedRoom();
    const roomDef = { fearLevel: 3 } as RoomContent;
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.altarAuraReduction).toBe(0);
    expect(result.effectiveFear).toBe(3);
  });

  it('should integrate all modifiers together', () => {
    vi.mocked(roomUpgradeGetAppliedEffects).mockReturnValue([
      { type: 'fearIncrease', value: 1 },
    ]);
    vi.mocked(altarRoomIsAdjacent).mockReturnValue(true);
    vi.mocked(altarRoomGetFearReductionAura).mockReturnValue(1);

    const room = makePlacedRoom({ id: 'room-1' as PlacedRoomId });
    const roomDef = { fearLevel: 2 } as RoomContent;
    const inhabitants = [
      makeInhabitant({ assignedRoomId: 'room-1' as PlacedRoomId, definitionId: 'def-myconid' as InhabitantId }),
    ];
    const floor = makeFloor({ rooms: [room], inhabitants });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    // base=2, inhabitant=-1, upgrade=+1, altar=-1 => 1
    expect(result.baseFear).toBe(2);
    expect(result.inhabitantModifier).toBe(-1);
    expect(result.upgradeAdjustment).toBe(1);
    expect(result.altarAuraReduction).toBe(1);
    expect(result.effectiveFear).toBe(1);
  });
});

// --- fearLevelCalculateAllForFloor ---

describe('fearLevelCalculateAllForFloor', () => {
  it('should return empty map for floor with no rooms', () => {
    const floor = makeFloor({ rooms: [] });
    const result = fearLevelCalculateAllForFloor(floor);
    expect(result.size).toBe(0);
  });

  it('should calculate breakdowns for all rooms', () => {
    registerRoomDef('room-type-a', 1);
    registerRoomDef('room-type-b', 3);

    const roomA = makePlacedRoom({ id: 'room-a' as PlacedRoomId, roomTypeId: 'room-type-a' as RoomId });
    const roomB = makePlacedRoom({ id: 'room-b' as PlacedRoomId, roomTypeId: 'room-type-b' as RoomId });
    const floor = makeFloor({ rooms: [roomA, roomB] });

    const result = fearLevelCalculateAllForFloor(floor);

    expect(result.size).toBe(2);
    expect(result.get('room-a' as PlacedRoomId)?.effectiveFear).toBe(1);
    expect(result.get('room-b' as PlacedRoomId)?.effectiveFear).toBe(3);
  });

  it('should skip rooms with unknown definitions', () => {
    const room = makePlacedRoom({ id: 'room-1' as PlacedRoomId, roomTypeId: 'unknown-type' as RoomId });
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelCalculateAllForFloor(floor);

    expect(result.size).toBe(0);
  });

  it('should pass throneRoomFear for variable fear rooms', () => {
    registerRoomDef('room-type-throne', 'variable' as unknown as number);
    // Override mockContent for variable fear
    mockContent.set('room-type-throne', {
      id: 'room-type-throne',
      name: 'Throne Room',
      __type: 'room',
      fearLevel: 'variable',
      production: {},
    });

    const room = makePlacedRoom({ id: 'room-throne' as PlacedRoomId, roomTypeId: 'room-type-throne' as RoomId });
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelCalculateAllForFloor(floor, 3);

    expect(result.get('room-throne' as PlacedRoomId)?.baseFear).toBe(3);
    expect(result.get('room-throne' as PlacedRoomId)?.effectiveFear).toBe(3);
  });

  it('should include propagated fear from adjacent high-fear rooms', () => {
    registerRoomDef('room-type-high', 3, 'Soul Well');
    registerRoomDef('room-type-low', 0, 'Mine');

    // Place rooms adjacent to each other (anchors at (0,0) and (1,0))
    const roomHigh = makePlacedRoom({ id: 'room-high' as PlacedRoomId, roomTypeId: 'room-type-high' as RoomId, anchorX: 0, anchorY: 0 });
    const roomLow = makePlacedRoom({ id: 'room-low' as PlacedRoomId, roomTypeId: 'room-type-low' as RoomId, anchorX: 1, anchorY: 0 });

    // Mock roomShapeGetAbsoluteTiles to return tiles that make rooms adjacent
    vi.mocked(roomShapeGetAbsoluteTiles).mockImplementation(
      (_shape: unknown, anchorX: number, anchorY: number): TileOffset[] => [
        { x: anchorX, y: anchorY },
      ],
    );

    const floor = makeFloor({ rooms: [roomHigh, roomLow] });

    const result = fearLevelCalculateAllForFloor(floor);

    // room-low should have propagated fear from room-high
    const lowBreakdown = result.get('room-low' as PlacedRoomId)!;
    expect(lowBreakdown.propagatedFear).toBe(1);
    expect(lowBreakdown.propagationSources).toHaveLength(1);
    expect(lowBreakdown.propagationSources[0].sourceRoomName).toBe('Soul Well');
    expect(lowBreakdown.propagationSources[0].amount).toBe(1);
    expect(lowBreakdown.effectiveFear).toBe(1); // 0 base + 1 propagated
  });

  it('should include propagated fear from Very High rooms', () => {
    registerRoomDef('room-type-vh', 4, 'Dark Sanctum');
    registerRoomDef('room-type-low', 0, 'Mine');

    vi.mocked(roomShapeGetAbsoluteTiles).mockImplementation(
      (_shape: unknown, anchorX: number, anchorY: number): TileOffset[] => [
        { x: anchorX, y: anchorY },
      ],
    );

    const roomVH = makePlacedRoom({ id: 'room-vh' as PlacedRoomId, roomTypeId: 'room-type-vh' as RoomId, anchorX: 0, anchorY: 0 });
    const roomLow = makePlacedRoom({ id: 'room-low' as PlacedRoomId, roomTypeId: 'room-type-low' as RoomId, anchorX: 1, anchorY: 0 });

    const floor = makeFloor({ rooms: [roomVH, roomLow] });

    const result = fearLevelCalculateAllForFloor(floor);

    expect(result.get('room-low' as PlacedRoomId)!.propagatedFear).toBe(2);
    expect(result.get('room-low' as PlacedRoomId)!.effectiveFear).toBe(2);
  });

  it('should stack propagation from multiple adjacent high-fear rooms', () => {
    registerRoomDef('room-type-high-a', 3, 'Source A');
    registerRoomDef('room-type-high-b', 3, 'Source B');
    registerRoomDef('room-type-target', 0, 'Target');

    vi.mocked(roomShapeGetAbsoluteTiles).mockImplementation(
      (_shape: unknown, anchorX: number, anchorY: number): TileOffset[] => [
        { x: anchorX, y: anchorY },
      ],
    );

    // rooms at (0,0), (2,0), and (1,0) in the middle
    const roomA = makePlacedRoom({ id: 'room-a' as PlacedRoomId, roomTypeId: 'room-type-high-a' as RoomId, anchorX: 0, anchorY: 0 });
    const roomB = makePlacedRoom({ id: 'room-b' as PlacedRoomId, roomTypeId: 'room-type-high-b' as RoomId, anchorX: 2, anchorY: 0 });
    const roomTarget = makePlacedRoom({ id: 'room-target' as PlacedRoomId, roomTypeId: 'room-type-target' as RoomId, anchorX: 1, anchorY: 0 });

    const floor = makeFloor({ rooms: [roomA, roomB, roomTarget] });

    const result = fearLevelCalculateAllForFloor(floor);

    // Target gets +1 from Source A and +1 from Source B = +2
    expect(result.get('room-target' as PlacedRoomId)!.propagatedFear).toBe(2);
    expect(result.get('room-target' as PlacedRoomId)!.propagationSources).toHaveLength(2);
  });

  it('should clamp effective fear to max when propagation exceeds bounds', () => {
    registerRoomDef('room-type-high', 4, 'Source');
    registerRoomDef('room-type-target', 3, 'Target');

    vi.mocked(roomShapeGetAbsoluteTiles).mockImplementation(
      (_shape: unknown, anchorX: number, anchorY: number): TileOffset[] => [
        { x: anchorX, y: anchorY },
      ],
    );

    const roomSource = makePlacedRoom({ id: 'room-source' as PlacedRoomId, roomTypeId: 'room-type-high' as RoomId, anchorX: 0, anchorY: 0 });
    const roomTarget = makePlacedRoom({ id: 'room-target' as PlacedRoomId, roomTypeId: 'room-type-target' as RoomId, anchorX: 1, anchorY: 0 });

    const floor = makeFloor({ rooms: [roomSource, roomTarget] });

    const result = fearLevelCalculateAllForFloor(floor);

    // Target: base 3 + propagated 2 = 5, clamped to 4
    expect(result.get('room-target' as PlacedRoomId)!.effectiveFear).toBe(4);
  });

  it('should propagate with distance 2 and attenuation when inhabitant extends range', () => {
    registerRoomDef('room-type-source', 2, 'Source');
    registerRoomDef('room-type-mid', 0, 'Middle');
    registerRoomDef('room-type-far', 0, 'Far');

    vi.mocked(roomShapeGetAbsoluteTiles).mockImplementation(
      (_shape: unknown, anchorX: number, anchorY: number): TileOffset[] => [
        { x: anchorX, y: anchorY },
      ],
    );

    // Dragon (fearModifier: 2, fearPropagationDistance: 2) in source room
    // Source room base fear 2 + dragon modifier 2 = 4 (Very High)
    const dragonInhabitant = makeInhabitant({
      instanceId: 'inst-dragon' as InhabitantInstanceId,
      assignedRoomId: 'room-source' as PlacedRoomId,
      definitionId: 'def-dragon' as InhabitantId,
    });

    const roomSource = makePlacedRoom({ id: 'room-source' as PlacedRoomId, roomTypeId: 'room-type-source' as RoomId, anchorX: 0, anchorY: 0 });
    const roomMid = makePlacedRoom({ id: 'room-mid' as PlacedRoomId, roomTypeId: 'room-type-mid' as RoomId, anchorX: 1, anchorY: 0 });
    const roomFar = makePlacedRoom({ id: 'room-far' as PlacedRoomId, roomTypeId: 'room-type-far' as RoomId, anchorX: 2, anchorY: 0 });

    const floor = makeFloor({
      rooms: [roomSource, roomMid, roomFar],
      inhabitants: [dragonInhabitant],
    });

    const result = fearLevelCalculateAllForFloor(floor);

    // Source: base 2 + dragon 2 = effective 4 (clamped), source fear = 4
    expect(result.get('room-source' as PlacedRoomId)!.effectiveFear).toBe(4);

    // Middle (distance 1): propagation 2 (base from VH), no attenuation
    expect(result.get('room-mid' as PlacedRoomId)!.propagatedFear).toBe(2);
    expect(result.get('room-mid' as PlacedRoomId)!.effectiveFear).toBe(2);

    // Far (distance 2): propagation 2 - 1 attenuation = 1
    expect(result.get('room-far' as PlacedRoomId)!.propagatedFear).toBe(1);
    expect(result.get('room-far' as PlacedRoomId)!.effectiveFear).toBe(1);
  });

  it('should not propagate from non-adjacent rooms', () => {
    registerRoomDef('room-type-high', 4, 'Source');
    registerRoomDef('room-type-low', 0, 'Target');

    vi.mocked(roomShapeGetAbsoluteTiles).mockImplementation(
      (_shape: unknown, anchorX: number, anchorY: number): TileOffset[] => [
        { x: anchorX, y: anchorY },
      ],
    );

    // Rooms far apart (not adjacent)
    const roomSource = makePlacedRoom({ id: 'room-source' as PlacedRoomId, roomTypeId: 'room-type-high' as RoomId, anchorX: 0, anchorY: 0 });
    const roomTarget = makePlacedRoom({ id: 'room-target' as PlacedRoomId, roomTypeId: 'room-type-low' as RoomId, anchorX: 5, anchorY: 5 });

    const floor = makeFloor({ rooms: [roomSource, roomTarget] });

    const result = fearLevelCalculateAllForFloor(floor);

    expect(result.get('room-target' as PlacedRoomId)!.propagatedFear).toBe(0);
    expect(result.get('room-target' as PlacedRoomId)!.propagationSources).toEqual([]);
  });
});

// --- fearLevelBuildAdjacencyMap ---

describe('fearLevelBuildAdjacencyMap', () => {
  it('should return empty map for no rooms', () => {
    const floor = makeFloor({ rooms: [] });
    const result = fearLevelBuildAdjacencyMap(floor);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should detect adjacent rooms', () => {
    vi.mocked(roomShapeGetAbsoluteTiles).mockImplementation(
      (_shape: unknown, anchorX: number, anchorY: number): TileOffset[] => [
        { x: anchorX, y: anchorY },
      ],
    );

    const roomA = makePlacedRoom({ id: 'room-a' as PlacedRoomId, anchorX: 0, anchorY: 0 });
    const roomB = makePlacedRoom({ id: 'room-b' as PlacedRoomId, anchorX: 1, anchorY: 0 });

    const floor = makeFloor({ rooms: [roomA, roomB] });

    const result = fearLevelBuildAdjacencyMap(floor);

    expect(result['room-a' as PlacedRoomId]).toContain('room-b');
    expect(result['room-b' as PlacedRoomId]).toContain('room-a');
  });

  it('should not detect non-adjacent rooms', () => {
    vi.mocked(roomShapeGetAbsoluteTiles).mockImplementation(
      (_shape: unknown, anchorX: number, anchorY: number): TileOffset[] => [
        { x: anchorX, y: anchorY },
      ],
    );

    const roomA = makePlacedRoom({ id: 'room-a' as PlacedRoomId, anchorX: 0, anchorY: 0 });
    const roomB = makePlacedRoom({ id: 'room-b' as PlacedRoomId, anchorX: 5, anchorY: 5 });

    const floor = makeFloor({ rooms: [roomA, roomB] });

    const result = fearLevelBuildAdjacencyMap(floor);

    expect(result['room-a' as PlacedRoomId]).toHaveLength(0);
    expect(result['room-b' as PlacedRoomId]).toHaveLength(0);
  });
});
