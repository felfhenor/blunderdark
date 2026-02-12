import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BiomeType, Floor } from '@interfaces';

// Test-local room type IDs
const CRYSTAL_MINE_ID = 'aa100001-0001-0001-0001-000000000002';
const MUSHROOM_GROVE_ID = 'aa100001-0001-0001-0001-000000000003';
const SOUL_WELL_ID = 'aa100001-0001-0001-0001-000000000005';
const UNDERGROUND_LAKE_ID = 'aa100001-0001-0001-0001-000000000010';
const THRONE_ROOM_ID = 'aa100001-0001-0001-0001-000000000001';
const BARRACKS_ID = 'aa100001-0001-0001-0001-000000000007';

const mockContent = new Map<string, unknown>();

function registerRoom(id: string, name: string): void {
  mockContent.set(id, { id, name, __type: 'room' });
}

vi.mock('@helpers/content', () => ({
  getEntry: vi.fn((id: string) => mockContent.get(id)),
  getEntriesByType: vi.fn(() => []),
}));

import {
  BIOME_RESTRICTIONS,
  canBuildRoomOnFloor,
  countRoomTypeOnFloor,
  getRoomBiomeRestrictionInfo,
} from '@helpers/biome-restrictions';

function makeFloor(
  biome: BiomeType = 'neutral',
  rooms: { id: string; roomTypeId: string }[] = [],
): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome,
    grid: [],
    rooms: rooms.map((r) => ({
      id: r.id,
      roomTypeId: r.roomTypeId,
      shapeId: 'shape-1',
      anchorX: 0,
      anchorY: 0,
    })),
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
  };
}

beforeEach(() => {
  mockContent.clear();
  registerRoom(CRYSTAL_MINE_ID, 'Crystal Mine');
  registerRoom(MUSHROOM_GROVE_ID, 'Mushroom Grove');
  registerRoom(SOUL_WELL_ID, 'Soul Well');
  registerRoom(UNDERGROUND_LAKE_ID, 'Underground Lake');
  registerRoom(THRONE_ROOM_ID, 'Throne Room');
  registerRoom(BARRACKS_ID, 'Barracks');
});

// --- Restriction data ---

describe('BIOME_RESTRICTIONS', () => {
  it('should have restrictions defined for volcanic biome', () => {
    const rules = BIOME_RESTRICTIONS['volcanic'];
    expect(rules['Underground Lake']).toEqual({ blocked: true });
    expect(rules['Mushroom Grove']).toEqual({ blocked: true });
  });

  it('should have restrictions defined for flooded biome', () => {
    const rules = BIOME_RESTRICTIONS['flooded'];
    expect(rules['Soul Well']).toEqual({ blocked: true });
  });

  it('should have restrictions defined for crystal biome', () => {
    const rules = BIOME_RESTRICTIONS['crystal'];
    expect(rules['Crystal Mine']).toEqual({ maxPerFloor: 5 });
  });

  it('should have restrictions defined for corrupted biome', () => {
    const rules = BIOME_RESTRICTIONS['corrupted'];
    expect(rules['Mushroom Grove']).toEqual({ blocked: true });
    expect(rules['Underground Lake']).toEqual({ blocked: true });
  });

  it('should have no restrictions for fungal biome', () => {
    expect(Object.keys(BIOME_RESTRICTIONS['fungal'])).toHaveLength(0);
  });

  it('should have no restrictions for neutral biome', () => {
    expect(Object.keys(BIOME_RESTRICTIONS['neutral'])).toHaveLength(0);
  });
});

// --- countRoomTypeOnFloor ---

describe('countRoomTypeOnFloor', () => {
  it('should return 0 when no rooms match', () => {
    const floor = makeFloor('neutral');
    expect(countRoomTypeOnFloor(floor, CRYSTAL_MINE_ID)).toBe(0);
  });

  it('should count matching room types on a floor', () => {
    const floor = makeFloor('crystal', [
      { id: 'r1', roomTypeId: CRYSTAL_MINE_ID },
      { id: 'r2', roomTypeId: CRYSTAL_MINE_ID },
      { id: 'r3', roomTypeId: BARRACKS_ID },
    ]);
    expect(countRoomTypeOnFloor(floor, CRYSTAL_MINE_ID)).toBe(2);
  });
});

// --- canBuildRoomOnFloor ---

describe('canBuildRoomOnFloor', () => {
  it('should block Underground Lake on volcanic floor', () => {
    const floor = makeFloor('volcanic');
    const result = canBuildRoomOnFloor(UNDERGROUND_LAKE_ID, 'volcanic', floor);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Underground Lake');
    expect(result.reason).toContain('volcanic');
  });

  it('should block Mushroom Grove on volcanic floor', () => {
    const floor = makeFloor('volcanic');
    const result = canBuildRoomOnFloor(MUSHROOM_GROVE_ID, 'volcanic', floor);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Mushroom Grove');
  });

  it('should block Soul Well on flooded floor', () => {
    const floor = makeFloor('flooded');
    const result = canBuildRoomOnFloor(SOUL_WELL_ID, 'flooded', floor);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Soul Well');
  });

  it('should allow Crystal Mine on crystal floor when under limit', () => {
    const floor = makeFloor('crystal', [
      { id: 'r1', roomTypeId: CRYSTAL_MINE_ID },
      { id: 'r2', roomTypeId: CRYSTAL_MINE_ID },
    ]);
    const result = canBuildRoomOnFloor(CRYSTAL_MINE_ID, 'crystal', floor);
    expect(result.allowed).toBe(true);
  });

  it('should allow Crystal Mine up to 5 on crystal floor', () => {
    const rooms = Array.from({ length: 4 }, (_, i) => ({
      id: `r${i}`,
      roomTypeId: CRYSTAL_MINE_ID,
    }));
    const floor = makeFloor('crystal', rooms);
    const result = canBuildRoomOnFloor(CRYSTAL_MINE_ID, 'crystal', floor);
    expect(result.allowed).toBe(true);
  });

  it('should block Crystal Mine at 5 on crystal floor', () => {
    const rooms = Array.from({ length: 5 }, (_, i) => ({
      id: `r${i}`,
      roomTypeId: CRYSTAL_MINE_ID,
    }));
    const floor = makeFloor('crystal', rooms);
    const result = canBuildRoomOnFloor(CRYSTAL_MINE_ID, 'crystal', floor);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('5');
  });

  it('should block Crystal Mine at 6+ on crystal floor', () => {
    const rooms = Array.from({ length: 6 }, (_, i) => ({
      id: `r${i}`,
      roomTypeId: CRYSTAL_MINE_ID,
    }));
    const floor = makeFloor('crystal', rooms);
    const result = canBuildRoomOnFloor(CRYSTAL_MINE_ID, 'crystal', floor);
    expect(result.allowed).toBe(false);
  });

  it('should allow all rooms on neutral floor', () => {
    const floor = makeFloor('neutral');
    expect(canBuildRoomOnFloor(UNDERGROUND_LAKE_ID, 'neutral', floor).allowed).toBe(true);
    expect(canBuildRoomOnFloor(MUSHROOM_GROVE_ID, 'neutral', floor).allowed).toBe(true);
    expect(canBuildRoomOnFloor(SOUL_WELL_ID, 'neutral', floor).allowed).toBe(true);
    expect(canBuildRoomOnFloor(CRYSTAL_MINE_ID, 'neutral', floor).allowed).toBe(true);
    expect(canBuildRoomOnFloor(THRONE_ROOM_ID, 'neutral', floor).allowed).toBe(true);
  });

  it('should allow all rooms on fungal floor', () => {
    const floor = makeFloor('fungal');
    expect(canBuildRoomOnFloor(UNDERGROUND_LAKE_ID, 'fungal', floor).allowed).toBe(true);
    expect(canBuildRoomOnFloor(MUSHROOM_GROVE_ID, 'fungal', floor).allowed).toBe(true);
    expect(canBuildRoomOnFloor(SOUL_WELL_ID, 'fungal', floor).allowed).toBe(true);
  });

  it('should block Mushroom Grove on corrupted floor', () => {
    const floor = makeFloor('corrupted');
    const result = canBuildRoomOnFloor(MUSHROOM_GROVE_ID, 'corrupted', floor);
    expect(result.allowed).toBe(false);
  });

  it('should block Underground Lake on corrupted floor', () => {
    const floor = makeFloor('corrupted');
    const result = canBuildRoomOnFloor(UNDERGROUND_LAKE_ID, 'corrupted', floor);
    expect(result.allowed).toBe(false);
  });

  it('should allow unrestricted rooms on any biome', () => {
    const biomes: BiomeType[] = ['volcanic', 'flooded', 'crystal', 'corrupted', 'fungal', 'neutral'];
    for (const biome of biomes) {
      const floor = makeFloor(biome);
      expect(canBuildRoomOnFloor(THRONE_ROOM_ID, biome, floor).allowed).toBe(true);
      expect(canBuildRoomOnFloor(BARRACKS_ID, biome, floor).allowed).toBe(true);
    }
  });

  it('should allow room when roomTypeId is unknown', () => {
    const floor = makeFloor('volcanic');
    const result = canBuildRoomOnFloor('nonexistent-id', 'volcanic', floor);
    expect(result.allowed).toBe(true);
  });
});

// --- getRoomBiomeRestrictionInfo ---

describe('getRoomBiomeRestrictionInfo', () => {
  it('should return restricted with reason for blocked rooms', () => {
    const floor = makeFloor('volcanic');
    const info = getRoomBiomeRestrictionInfo(UNDERGROUND_LAKE_ID, 'volcanic', floor);
    expect(info.restricted).toBe(true);
    expect(info.reason).toBeDefined();
  });

  it('should return count info for count-limited rooms', () => {
    const rooms = Array.from({ length: 3 }, (_, i) => ({
      id: `r${i}`,
      roomTypeId: CRYSTAL_MINE_ID,
    }));
    const floor = makeFloor('crystal', rooms);
    const info = getRoomBiomeRestrictionInfo(CRYSTAL_MINE_ID, 'crystal', floor);
    expect(info.restricted).toBe(false);
    expect(info.currentCount).toBe(3);
    expect(info.maxCount).toBe(5);
  });

  it('should return restricted when count limit is reached', () => {
    const rooms = Array.from({ length: 5 }, (_, i) => ({
      id: `r${i}`,
      roomTypeId: CRYSTAL_MINE_ID,
    }));
    const floor = makeFloor('crystal', rooms);
    const info = getRoomBiomeRestrictionInfo(CRYSTAL_MINE_ID, 'crystal', floor);
    expect(info.restricted).toBe(true);
    expect(info.reason).toContain('5/5');
  });

  it('should return not restricted for unrestricted rooms', () => {
    const floor = makeFloor('volcanic');
    const info = getRoomBiomeRestrictionInfo(THRONE_ROOM_ID, 'volcanic', floor);
    expect(info.restricted).toBe(false);
    expect(info.reason).toBeUndefined();
  });
});
