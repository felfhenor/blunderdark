import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Floor,
  InhabitantInstance,
  PlacedRoom,
  RoomDefinition,
  RoomUpgradeEffect,
} from '@interfaces';

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

// --- Import after mocks ---

import {
  FEAR_LEVEL_HIGH,
  FEAR_LEVEL_LABELS,
  FEAR_LEVEL_LOW,
  FEAR_LEVEL_MAX,
  FEAR_LEVEL_MEDIUM,
  FEAR_LEVEL_MIN,
  FEAR_LEVEL_NONE,
  FEAR_LEVEL_VERY_HIGH,
  fearLevelCalculateAllForFloor,
  fearLevelCalculateEffective,
  fearLevelCalculateInhabitantModifier,
  fearLevelCalculateUpgradeAdjustment,
  fearLevelGetForRoom,
  fearLevelGetLabel,
} from '@helpers/fear-level';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { altarRoomIsAdjacent, altarRoomGetFearReductionAura } from '@helpers/altar-room';

// --- Test helpers ---

function makeInhabitant(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
  return {
    instanceId: overrides.instanceId ?? 'inst-1',
    definitionId: overrides.definitionId ?? 'def-goblin',
    name: overrides.name ?? 'Goblin',
    state: overrides.state ?? 'normal',
    assignedRoomId: overrides.assignedRoomId ?? undefined,
  };
}

function makePlacedRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: overrides.id ?? 'room-1',
    roomTypeId: overrides.roomTypeId ?? 'room-type-1',
    shapeId: overrides.shapeId ?? 'shape-1',
    anchorX: overrides.anchorX ?? 0,
    anchorY: overrides.anchorY ?? 0,
    appliedUpgradePathId: overrides.appliedUpgradePathId ?? undefined,
  };
}

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: overrides.id ?? 'floor-1',
    name: overrides.name ?? 'Floor 1',
    depth: overrides.depth ?? 1,
    biome: overrides.biome ?? 'neutral',
    grid: overrides.grid ?? { tiles: [], width: 0, height: 0 },
    rooms: overrides.rooms ?? [],
    hallways: overrides.hallways ?? [],
    inhabitants: overrides.inhabitants ?? [],
    connections: overrides.connections ?? [],
    traps: overrides.traps ?? [],
  };
}

function registerInhabitantDef(id: string, fearModifier: number): void {
  mockContent.set(id, {
    id,
    name: id,
    __type: 'inhabitant',
    fearModifier,
  });
}

function registerRoomDef(id: string, fearLevel: number | 'variable'): void {
  mockContent.set(id, {
    id,
    name: id,
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
  registerInhabitantDef('def-dragon', 2);
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
    expect(fearLevelCalculateInhabitantModifier('room-1', [])).toBe(0);
  });

  it('should return 0 when no inhabitants assigned to room', () => {
    const inhabitants = [
      makeInhabitant({ assignedRoomId: 'room-other', definitionId: 'def-dragon' }),
    ];
    expect(fearLevelCalculateInhabitantModifier('room-1', inhabitants)).toBe(0);
  });

  it('should sum positive fearModifiers', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1', assignedRoomId: 'room-1', definitionId: 'def-skeleton' }),
      makeInhabitant({ instanceId: 'inst-2', assignedRoomId: 'room-1', definitionId: 'def-dragon' }),
    ];
    // skeleton=1, dragon=2 => 3
    expect(fearLevelCalculateInhabitantModifier('room-1', inhabitants)).toBe(3);
  });

  it('should sum negative fearModifiers', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1', assignedRoomId: 'room-1', definitionId: 'def-myconid' }),
      makeInhabitant({ instanceId: 'inst-2', assignedRoomId: 'room-1', definitionId: 'def-myconid' }),
    ];
    // myconid=-1 * 2 => -2
    expect(fearLevelCalculateInhabitantModifier('room-1', inhabitants)).toBe(-2);
  });

  it('should handle mixed positive and negative modifiers', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1', assignedRoomId: 'room-1', definitionId: 'def-skeleton' }),
      makeInhabitant({ instanceId: 'inst-2', assignedRoomId: 'room-1', definitionId: 'def-myconid' }),
    ];
    // skeleton=1, myconid=-1 => 0
    expect(fearLevelCalculateInhabitantModifier('room-1', inhabitants)).toBe(0);
  });

  it('should ignore inhabitants assigned to other rooms', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1', assignedRoomId: 'room-1', definitionId: 'def-skeleton' }),
      makeInhabitant({ instanceId: 'inst-2', assignedRoomId: 'room-2', definitionId: 'def-dragon' }),
    ];
    // only skeleton=1 is in room-1
    expect(fearLevelCalculateInhabitantModifier('room-1', inhabitants)).toBe(1);
  });

  it('should ignore unassigned inhabitants', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1', assignedRoomId: undefined, definitionId: 'def-dragon' }),
    ];
    expect(fearLevelCalculateInhabitantModifier('room-1', inhabitants)).toBe(0);
  });

  it('should handle unknown definitions gracefully', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'inst-1', assignedRoomId: 'room-1', definitionId: 'def-unknown' }),
    ];
    expect(fearLevelCalculateInhabitantModifier('room-1', inhabitants)).toBe(0);
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

  it('should combine all modifiers', () => {
    // 2 + 1 + (-1) - 1 = 1
    expect(fearLevelCalculateEffective(2, 1, -1, 1)).toBe(1);
  });

  it('should clamp to 0 (FEAR_LEVEL_MIN)', () => {
    expect(fearLevelCalculateEffective(1, -3, -2, 1)).toBe(0);
  });

  it('should clamp to 4 (FEAR_LEVEL_MAX)', () => {
    expect(fearLevelCalculateEffective(3, 2, 1, 0)).toBe(4);
  });

  it('should clamp exactly at boundaries', () => {
    expect(fearLevelCalculateEffective(0, 0, 0, 0)).toBe(0);
    expect(fearLevelCalculateEffective(4, 0, 0, 0)).toBe(4);
  });
});

// --- fearLevelGetForRoom ---

describe('fearLevelGetForRoom', () => {
  it('should return breakdown with base fear from room definition', () => {
    const room = makePlacedRoom();
    const roomDef = { fearLevel: 2 } as RoomDefinition;
    const floor = makeFloor({ rooms: [room], inhabitants: [] });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.baseFear).toBe(2);
    expect(result.inhabitantModifier).toBe(0);
    expect(result.upgradeAdjustment).toBe(0);
    expect(result.altarAuraReduction).toBe(0);
    expect(result.effectiveFear).toBe(2);
  });

  it('should resolve variable fear level using throneRoomFear', () => {
    const room = makePlacedRoom();
    const roomDef = { fearLevel: 'variable' } as RoomDefinition;
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelGetForRoom(floor, room, roomDef, 3);

    expect(result.baseFear).toBe(3);
    expect(result.effectiveFear).toBe(3);
  });

  it('should default variable fear to 0 when throneRoomFear is undefined', () => {
    const room = makePlacedRoom();
    const roomDef = { fearLevel: 'variable' } as RoomDefinition;
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.baseFear).toBe(0);
    expect(result.effectiveFear).toBe(0);
  });

  it('should include inhabitant modifier', () => {
    const room = makePlacedRoom({ id: 'room-1' });
    const roomDef = { fearLevel: 1 } as RoomDefinition;
    const inhabitants = [
      makeInhabitant({ assignedRoomId: 'room-1', definitionId: 'def-skeleton' }),
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
    const roomDef = { fearLevel: 3 } as RoomDefinition;
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.upgradeAdjustment).toBe(-1);
    expect(result.effectiveFear).toBe(2);
  });

  it('should include altar aura reduction when adjacent', () => {
    vi.mocked(altarRoomIsAdjacent).mockReturnValue(true);
    vi.mocked(altarRoomGetFearReductionAura).mockReturnValue(2);

    const room = makePlacedRoom();
    const roomDef = { fearLevel: 3 } as RoomDefinition;
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelGetForRoom(floor, room, roomDef);

    expect(result.altarAuraReduction).toBe(2);
    expect(result.effectiveFear).toBe(1);
  });

  it('should not apply altar aura when not adjacent', () => {
    vi.mocked(altarRoomIsAdjacent).mockReturnValue(false);
    vi.mocked(altarRoomGetFearReductionAura).mockReturnValue(2);

    const room = makePlacedRoom();
    const roomDef = { fearLevel: 3 } as RoomDefinition;
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

    const room = makePlacedRoom({ id: 'room-1' });
    const roomDef = { fearLevel: 2 } as RoomDefinition;
    const inhabitants = [
      makeInhabitant({ assignedRoomId: 'room-1', definitionId: 'def-myconid' }),
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

    const roomA = makePlacedRoom({ id: 'room-a', roomTypeId: 'room-type-a' });
    const roomB = makePlacedRoom({ id: 'room-b', roomTypeId: 'room-type-b' });
    const floor = makeFloor({ rooms: [roomA, roomB] });

    const result = fearLevelCalculateAllForFloor(floor);

    expect(result.size).toBe(2);
    expect(result.get('room-a')?.effectiveFear).toBe(1);
    expect(result.get('room-b')?.effectiveFear).toBe(3);
  });

  it('should skip rooms with unknown definitions', () => {
    const room = makePlacedRoom({ id: 'room-1', roomTypeId: 'unknown-type' });
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

    const room = makePlacedRoom({ id: 'room-throne', roomTypeId: 'room-type-throne' });
    const floor = makeFloor({ rooms: [room] });

    const result = fearLevelCalculateAllForFloor(floor, 3);

    expect(result.get('room-throne')?.baseFear).toBe(3);
    expect(result.get('room-throne')?.effectiveFear).toBe(3);
  });
});
