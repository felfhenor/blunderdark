import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn(),
}));

import { contentGetEntry } from '@helpers/content';
import {
  featureGetForRoom,
  featureGetBonuses,
  featureCalculateFearReduction,
  featureCalculateCapacityBonus,
  featureCalculateAdjacentProductionBonus,
} from '@helpers/features';
import type { FeatureContent, FeatureId } from '@interfaces/content-feature';
import type { PlacedRoom, PlacedRoomId } from '@interfaces/room-shape';
import type { RoomId } from '@interfaces/content-room';
import type { RoomShapeId } from '@interfaces/content-roomshape';

const COFFINS_ID = 'coffins-test-id' as FeatureId;
const MOSS_ID = 'moss-test-id' as FeatureId;

const coffinsContent: FeatureContent = {
  id: COFFINS_ID,
  name: 'Coffins',
  __type: 'feature',
  description: 'Test coffins',
  category: 'environmental',
  cost: { gold: 50 },
  bonuses: [
    { type: 'capacity_bonus', value: 1, targetType: 'undead', description: '+1 undead capacity' },
    { type: 'fear_reduction', value: 1, targetType: 'undead', description: '-1 Fear for undead' },
  ],
};

const mossContent: FeatureContent = {
  id: MOSS_ID,
  name: 'Bioluminescent Moss',
  __type: 'feature',
  description: 'Test moss',
  category: 'environmental',
  cost: { gold: 40 },
  bonuses: [
    { type: 'fear_reduction', value: 1, description: '-1 Fear in the attached room' },
    { type: 'adjacent_production', value: 0.05, description: '+5% production to adjacent rooms' },
  ],
};

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'room-1' as PlacedRoomId,
    roomTypeId: 'room-type-1' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(contentGetEntry).mockReset();
});

describe('featureGetForRoom', () => {
  it('returns undefined when room has no feature', () => {
    const room = makeRoom();
    expect(featureGetForRoom(room)).toBeUndefined();
  });

  it('returns the feature content when room has a feature', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureId: COFFINS_ID });
    expect(featureGetForRoom(room)).toEqual(coffinsContent);
  });
});

describe('featureGetBonuses', () => {
  it('returns empty array when room has no feature', () => {
    const room = makeRoom();
    expect(featureGetBonuses(room, 'capacity_bonus')).toEqual([]);
  });

  it('returns matching bonuses by type', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureId: COFFINS_ID });
    const bonuses = featureGetBonuses(room, 'capacity_bonus');
    expect(bonuses).toHaveLength(1);
    expect(bonuses[0].value).toBe(1);
    expect(bonuses[0].targetType).toBe('undead');
  });

  it('returns empty array when no bonuses match the type', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureId: COFFINS_ID });
    expect(featureGetBonuses(room, 'teleport_link')).toEqual([]);
  });
});

describe('featureCalculateFearReduction', () => {
  it('returns 0 when room has no feature', () => {
    const room = makeRoom();
    expect(featureCalculateFearReduction(room)).toBe(0);
  });

  it('returns fear reduction from Bioluminescent Moss (non-targeted)', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mossContent);
    const room = makeRoom({ featureId: MOSS_ID });
    expect(featureCalculateFearReduction(room)).toBe(1);
  });

  it('returns 0 for Coffins fear reduction (targeted at undead only)', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureId: COFFINS_ID });
    // Coffins fear_reduction has targetType:'undead', so non-targeted calculation returns 0
    expect(featureCalculateFearReduction(room)).toBe(0);
  });
});

describe('featureCalculateCapacityBonus', () => {
  it('returns 0 when room has no feature', () => {
    const room = makeRoom();
    expect(featureCalculateCapacityBonus(room)).toBe(0);
  });

  it('returns capacity bonus for matching inhabitant type', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureId: COFFINS_ID });
    expect(featureCalculateCapacityBonus(room, 'undead')).toBe(1);
  });

  it('returns 0 for non-matching inhabitant type', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureId: COFFINS_ID });
    expect(featureCalculateCapacityBonus(room, 'creature')).toBe(0);
  });

  it('returns capacity bonus when no inhabitant type specified but feature has no target', () => {
    const genericCapacityFeature: FeatureContent = {
      ...coffinsContent,
      bonuses: [
        { type: 'capacity_bonus', value: 2, description: '+2 capacity' },
      ],
    };
    vi.mocked(contentGetEntry).mockReturnValue(genericCapacityFeature);
    const room = makeRoom({ featureId: COFFINS_ID });
    expect(featureCalculateCapacityBonus(room)).toBe(2);
  });
});

describe('featureCalculateAdjacentProductionBonus', () => {
  it('returns 0 when no adjacent rooms have features', () => {
    const rooms = [makeRoom(), makeRoom({ id: 'room-2' as PlacedRoomId })];
    expect(featureCalculateAdjacentProductionBonus(rooms)).toBe(0);
  });

  it('returns production bonus from adjacent room with Bioluminescent Moss', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mossContent);
    const adjRoom = makeRoom({ id: 'room-2' as PlacedRoomId, featureId: MOSS_ID });
    expect(featureCalculateAdjacentProductionBonus([adjRoom])).toBeCloseTo(0.05);
  });

  it('sums bonuses from multiple adjacent rooms with features', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mossContent);
    const adjRoom1 = makeRoom({ id: 'room-2' as PlacedRoomId, featureId: MOSS_ID });
    const adjRoom2 = makeRoom({ id: 'room-3' as PlacedRoomId, featureId: MOSS_ID });
    expect(featureCalculateAdjacentProductionBonus([adjRoom1, adjRoom2])).toBeCloseTo(0.10);
  });

  it('ignores adjacent rooms without features', () => {
    vi.mocked(contentGetEntry)
      .mockReturnValueOnce(mossContent)
      .mockReturnValueOnce(undefined);
    const adjRoom1 = makeRoom({ id: 'room-2' as PlacedRoomId, featureId: MOSS_ID });
    const adjRoom2 = makeRoom({ id: 'room-3' as PlacedRoomId });
    expect(featureCalculateAdjacentProductionBonus([adjRoom1, adjRoom2])).toBeCloseTo(0.05);
  });

  it('returns 0 when feature has no adjacent_production bonus', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const adjRoom = makeRoom({ id: 'room-2' as PlacedRoomId, featureId: COFFINS_ID });
    expect(featureCalculateAdjacentProductionBonus([adjRoom])).toBe(0);
  });
});
