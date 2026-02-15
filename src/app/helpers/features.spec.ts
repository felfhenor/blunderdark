import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn(),
}));

import { contentGetEntry } from '@helpers/content';
import {
  featureGetAllForRoom,
  featureGetForSlot,
  featureGetBonuses,
  featureGetSlotCount,
  featureCalculateFearReduction,
  featureCalculateCapacityBonus,
  featureCalculateAdjacentProductionBonus,
  featureCalculateFlatProduction,
  featureCalculateProductionBonus,
  featureGetCombatBonuses,
  featureCalculateCorruptionGenerationPerTick,
  featureCanSacrifice,
  featureCreateSacrificeBuff,
  featureSacrificeProcess,
  FEATURE_SACRIFICE_FOOD_COST,
  FEATURE_SACRIFICE_BUFF_TICKS,
  FEATURE_SLOT_COUNT_SMALL,
  FEATURE_SLOT_COUNT_LARGE,
  FEATURE_SLOT_SIZE_THRESHOLD,
  featureHasFungalNetwork,
  featureGetFungalNetworkDestinations,
  featureCanFungalTransfer,
  featureFungalTransfer,
  featureAttachToSlot,
  featureRemoveFromSlot,
  featureRemoveAllFromRoom,
  featureCalculateStorageBonusMultiplier,
  featureGetCorruptionSealedRoomIds,
  featureCalculateTrainingXpPerTick,
  featureGetResourceConverterEfficiency,
  featureTrainingStationProcess,
} from '@helpers/features';
import type { FeatureContent, FeatureId } from '@interfaces/content-feature';
import type { Floor, FloorId } from '@interfaces/floor';
import type { InhabitantInstance, InhabitantInstanceId } from '@interfaces/inhabitant';
import type { PlacedRoom, PlacedRoomId } from '@interfaces/room-shape';
import type { RoomId } from '@interfaces/content-room';
import type { RoomShapeId } from '@interfaces/content-roomshape';

const COFFINS_ID = 'coffins-test-id' as FeatureId;
const MOSS_ID = 'moss-test-id' as FeatureId;
const CRYSTALS_ID = 'crystals-test-id' as FeatureId;
const VENTS_ID = 'vents-test-id' as FeatureId;
const BLOOD_ALTAR_ID = 'blood-altar-test-id' as FeatureId;
const FUNGAL_ID = 'fungal-test-id' as FeatureId;
const STORAGE_ID = 'storage-test-id' as FeatureId;
const EFFICIENCY_ID = 'efficiency-test-id' as FeatureId;
const FEAR_WARD_ID = 'fear-ward-test-id' as FeatureId;
const CORRUPTION_SEAL_ID = 'corruption-seal-test-id' as FeatureId;
const TRAINING_STATION_ID = 'training-station-test-id' as FeatureId;
const RESOURCE_CONVERTER_ID = 'resource-converter-test-id' as FeatureId;

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

const crystalsContent: FeatureContent = {
  id: CRYSTALS_ID,
  name: 'Arcane Crystals',
  __type: 'feature',
  description: 'Test crystals',
  category: 'environmental',
  cost: { gold: 75 },
  bonuses: [
    { type: 'flat_production', value: 1, targetType: 'flux', description: '+1 Flux per minute' },
    { type: 'production_bonus', value: 0.15, targetType: 'flux', description: '+15% magic efficiency' },
  ],
};

const ventsContent: FeatureContent = {
  id: VENTS_ID,
  name: 'Geothermal Vents',
  __type: 'feature',
  description: 'Test vents',
  category: 'environmental',
  cost: { gold: 80 },
  bonuses: [
    { type: 'production_bonus', value: 0.15, description: '+15% production across all resources' },
    { type: 'combat_bonus', value: 5, targetType: 'fire', description: 'Fire damage bonus' },
  ],
};

const bloodAltarContent: FeatureContent = {
  id: BLOOD_ALTAR_ID,
  name: 'Blood Altar',
  __type: 'feature',
  description: 'Test blood altar',
  category: 'environmental',
  cost: { gold: 100, essence: 25 },
  bonuses: [
    { type: 'corruption_generation', value: 2, description: '+2 Corruption per minute' },
  ],
};

const fungalContent: FeatureContent = {
  id: FUNGAL_ID,
  name: 'Fungal Network',
  __type: 'feature',
  description: 'Test fungal network',
  category: 'environmental',
  cost: { gold: 60 },
  bonuses: [
    { type: 'teleport_link', value: 1, description: 'Enables instant transfer' },
  ],
};

const storageContent: FeatureContent = {
  id: STORAGE_ID,
  name: 'Storage Expansion',
  __type: 'feature',
  description: 'Test storage',
  category: 'functional',
  cost: { gold: 100 },
  bonuses: [
    { type: 'storage_bonus', value: 1.0, description: '+100% storage capacity' },
  ],
};

const efficiencyContent: FeatureContent = {
  id: EFFICIENCY_ID,
  name: 'Efficiency Enchantment',
  __type: 'feature',
  description: 'Test efficiency',
  category: 'functional',
  cost: { gold: 120 },
  bonuses: [
    { type: 'production_bonus', value: 0.20, description: '+20% base production' },
  ],
};

const fearWardContent: FeatureContent = {
  id: FEAR_WARD_ID,
  name: 'Fear Ward',
  __type: 'feature',
  description: 'Test fear ward',
  category: 'functional',
  cost: { gold: 80 },
  bonuses: [
    { type: 'fear_reduction', value: 2, description: '-2 Fear in room' },
  ],
};

const corruptionSealContent: FeatureContent = {
  id: CORRUPTION_SEAL_ID,
  name: 'Corruption Seal',
  __type: 'feature',
  description: 'Test corruption seal',
  category: 'functional',
  cost: { gold: 150 },
  bonuses: [
    { type: 'corruption_seal', value: 1, description: 'Prevents corruption generation' },
  ],
};

const trainingStationContent: FeatureContent = {
  id: TRAINING_STATION_ID,
  name: 'Training Station',
  __type: 'feature',
  description: 'Test training station',
  category: 'functional',
  cost: { gold: 90 },
  bonuses: [
    { type: 'training_xp', value: 1, description: 'Inhabitants gain passive XP each tick' },
  ],
};

const resourceConverterContent: FeatureContent = {
  id: RESOURCE_CONVERTER_ID,
  name: 'Resource Converter',
  __type: 'feature',
  description: 'Test converter',
  category: 'functional',
  cost: { gold: 200 },
  bonuses: [
    { type: 'resource_converter', value: 0.75, description: 'Convert output at 75% efficiency' },
  ],
};

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 0,
    biome: 'neutral',
    grid: [],
    rooms: [],
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
    ...overrides,
  } as Floor;
}

function makeInhabitant(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
  return {
    instanceId: 'inh-1' as InhabitantInstanceId,
    definitionId: 'test-def',
    name: 'Test Creature',
    state: 'normal',
    assignedRoomId: 'room-1' as PlacedRoomId,
    ...overrides,
  } as InhabitantInstance;
}

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

describe('featureGetSlotCount', () => {
  it('returns 2 for 1-tile rooms', () => {
    expect(featureGetSlotCount(1)).toBe(FEATURE_SLOT_COUNT_SMALL);
  });

  it('returns 2 for 2-tile rooms', () => {
    expect(featureGetSlotCount(2)).toBe(FEATURE_SLOT_COUNT_SMALL);
  });

  it('returns 3 for 3-tile rooms', () => {
    expect(featureGetSlotCount(3)).toBe(FEATURE_SLOT_COUNT_LARGE);
  });

  it('returns 3 for 4-tile rooms', () => {
    expect(featureGetSlotCount(4)).toBe(FEATURE_SLOT_COUNT_LARGE);
  });

  it('returns 3 for 9-tile rooms', () => {
    expect(featureGetSlotCount(9)).toBe(FEATURE_SLOT_COUNT_LARGE);
  });

  it('uses correct threshold', () => {
    expect(FEATURE_SLOT_SIZE_THRESHOLD).toBe(3);
  });
});

describe('featureGetAllForRoom', () => {
  it('returns empty array when room has no features', () => {
    const room = makeRoom();
    expect(featureGetAllForRoom(room)).toEqual([]);
  });

  it('returns empty array when featureIds is empty', () => {
    const room = makeRoom({ featureIds: [] });
    expect(featureGetAllForRoom(room)).toEqual([]);
  });

  it('returns all attached features', () => {
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === COFFINS_ID) return coffinsContent;
      if (id === MOSS_ID) return mossContent;
      return undefined;
    });
    const room = makeRoom({ featureIds: [COFFINS_ID, MOSS_ID] });
    const result = featureGetAllForRoom(room);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(coffinsContent);
    expect(result[1]).toEqual(mossContent);
  });

  it('skips undefined slots', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureIds: [COFFINS_ID, undefined as unknown as FeatureId] });
    const result = featureGetAllForRoom(room);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(coffinsContent);
  });
});

describe('featureGetForSlot', () => {
  it('returns undefined when room has no features', () => {
    const room = makeRoom();
    expect(featureGetForSlot(room, 0)).toBeUndefined();
  });

  it('returns the feature at the given slot', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureIds: [COFFINS_ID] });
    expect(featureGetForSlot(room, 0)).toEqual(coffinsContent);
  });

  it('returns undefined for empty slot', () => {
    const room = makeRoom({ featureIds: [undefined as unknown as FeatureId] });
    expect(featureGetForSlot(room, 0)).toBeUndefined();
  });
});

describe('featureGetBonuses', () => {
  it('returns empty array when room has no features', () => {
    const room = makeRoom();
    expect(featureGetBonuses(room, 'capacity_bonus')).toEqual([]);
  });

  it('returns matching bonuses by type from single feature', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureIds: [COFFINS_ID] });
    const bonuses = featureGetBonuses(room, 'capacity_bonus');
    expect(bonuses).toHaveLength(1);
    expect(bonuses[0].value).toBe(1);
    expect(bonuses[0].targetType).toBe('undead');
  });

  it('aggregates bonuses from multiple features', () => {
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === CRYSTALS_ID) return crystalsContent;
      if (id === VENTS_ID) return ventsContent;
      return undefined;
    });
    const room = makeRoom({ featureIds: [CRYSTALS_ID, VENTS_ID] });
    const bonuses = featureGetBonuses(room, 'production_bonus');
    expect(bonuses).toHaveLength(2);
  });

  it('returns empty array when no bonuses match the type', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureIds: [COFFINS_ID] });
    expect(featureGetBonuses(room, 'teleport_link')).toEqual([]);
  });
});

describe('featureCalculateFearReduction', () => {
  it('returns 0 when room has no features', () => {
    const room = makeRoom();
    expect(featureCalculateFearReduction(room)).toBe(0);
  });

  it('returns fear reduction from Bioluminescent Moss (non-targeted)', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mossContent);
    const room = makeRoom({ featureIds: [MOSS_ID] });
    expect(featureCalculateFearReduction(room)).toBe(1);
  });

  it('returns 0 for Coffins fear reduction (targeted at undead only)', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureIds: [COFFINS_ID] });
    expect(featureCalculateFearReduction(room)).toBe(0);
  });
});

describe('featureCalculateCapacityBonus', () => {
  it('returns 0 when room has no features', () => {
    const room = makeRoom();
    expect(featureCalculateCapacityBonus(room)).toBe(0);
  });

  it('returns capacity bonus for matching inhabitant type', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureIds: [COFFINS_ID] });
    expect(featureCalculateCapacityBonus(room, 'undead')).toBe(1);
  });

  it('returns 0 for non-matching inhabitant type', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const room = makeRoom({ featureIds: [COFFINS_ID] });
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
    const room = makeRoom({ featureIds: [COFFINS_ID] });
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
    const adjRoom = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [MOSS_ID] });
    expect(featureCalculateAdjacentProductionBonus([adjRoom])).toBeCloseTo(0.05);
  });

  it('sums bonuses from multiple adjacent rooms with features', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mossContent);
    const adjRoom1 = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [MOSS_ID] });
    const adjRoom2 = makeRoom({ id: 'room-3' as PlacedRoomId, featureIds: [MOSS_ID] });
    expect(featureCalculateAdjacentProductionBonus([adjRoom1, adjRoom2])).toBeCloseTo(0.10);
  });

  it('ignores adjacent rooms without features', () => {
    vi.mocked(contentGetEntry)
      .mockReturnValueOnce(mossContent)
      .mockReturnValueOnce(undefined);
    const adjRoom1 = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [MOSS_ID] });
    const adjRoom2 = makeRoom({ id: 'room-3' as PlacedRoomId });
    expect(featureCalculateAdjacentProductionBonus([adjRoom1, adjRoom2])).toBeCloseTo(0.05);
  });

  it('returns 0 when feature has no adjacent_production bonus', () => {
    vi.mocked(contentGetEntry).mockReturnValue(coffinsContent);
    const adjRoom = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [COFFINS_ID] });
    expect(featureCalculateAdjacentProductionBonus([adjRoom])).toBe(0);
  });
});

describe('featureCalculateFlatProduction', () => {
  it('returns empty production when room has no features', () => {
    const room = makeRoom();
    const result = featureCalculateFlatProduction(room, 5);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('returns per-tick flux production from Arcane Crystals (+1/min)', () => {
    vi.mocked(contentGetEntry).mockReturnValue(crystalsContent);
    const room = makeRoom({ featureIds: [CRYSTALS_ID] });
    const result = featureCalculateFlatProduction(room, 5);
    expect(result['flux']).toBeCloseTo(0.2); // 1/5 per tick
  });

  it('returns 0 for features without flat_production bonus', () => {
    vi.mocked(contentGetEntry).mockReturnValue(ventsContent);
    const room = makeRoom({ featureIds: [VENTS_ID] });
    const result = featureCalculateFlatProduction(room, 5);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('featureCalculateProductionBonus', () => {
  it('returns 0 when room has no features', () => {
    const room = makeRoom();
    expect(featureCalculateProductionBonus(room, 'flux')).toBe(0);
  });

  it('returns 15% bonus for flux from Arcane Crystals', () => {
    vi.mocked(contentGetEntry).mockReturnValue(crystalsContent);
    const room = makeRoom({ featureIds: [CRYSTALS_ID] });
    expect(featureCalculateProductionBonus(room, 'flux')).toBeCloseTo(0.15);
  });

  it('returns 0 for non-matching resource type from Arcane Crystals', () => {
    vi.mocked(contentGetEntry).mockReturnValue(crystalsContent);
    const room = makeRoom({ featureIds: [CRYSTALS_ID] });
    expect(featureCalculateProductionBonus(room, 'gold')).toBe(0);
  });

  it('returns 15% bonus for any resource type from Geothermal Vents', () => {
    vi.mocked(contentGetEntry).mockReturnValue(ventsContent);
    const room = makeRoom({ featureIds: [VENTS_ID] });
    expect(featureCalculateProductionBonus(room, 'gold')).toBeCloseTo(0.15);
    expect(featureCalculateProductionBonus(room, 'crystals')).toBeCloseTo(0.15);
    expect(featureCalculateProductionBonus(room, 'flux')).toBeCloseTo(0.15);
  });

  it('stacks bonuses from multiple features', () => {
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === CRYSTALS_ID) return crystalsContent;
      if (id === VENTS_ID) return ventsContent;
      return undefined;
    });
    const room = makeRoom({ featureIds: [CRYSTALS_ID, VENTS_ID] });
    // Crystals: +15% flux, Vents: +15% all → 30% for flux
    expect(featureCalculateProductionBonus(room, 'flux')).toBeCloseTo(0.30);
    // Only Vents applies for gold
    expect(featureCalculateProductionBonus(room, 'gold')).toBeCloseTo(0.15);
  });
});

describe('featureGetCombatBonuses', () => {
  it('returns empty array when room has no features', () => {
    const room = makeRoom();
    expect(featureGetCombatBonuses(room)).toEqual([]);
  });

  it('returns fire damage bonus from Geothermal Vents', () => {
    vi.mocked(contentGetEntry).mockReturnValue(ventsContent);
    const room = makeRoom({ featureIds: [VENTS_ID] });
    const bonuses = featureGetCombatBonuses(room);
    expect(bonuses).toHaveLength(1);
    expect(bonuses[0].value).toBe(5);
    expect(bonuses[0].targetType).toBe('fire');
  });

  it('returns empty array for features without combat bonuses', () => {
    vi.mocked(contentGetEntry).mockReturnValue(crystalsContent);
    const room = makeRoom({ featureIds: [CRYSTALS_ID] });
    expect(featureGetCombatBonuses(room)).toEqual([]);
  });
});

describe('featureCalculateCorruptionGenerationPerTick', () => {
  it('returns 0 when no rooms have features', () => {
    const rooms = [makeRoom(), makeRoom({ id: 'room-2' as PlacedRoomId })];
    expect(featureCalculateCorruptionGenerationPerTick(rooms, 5)).toBe(0);
  });

  it('returns per-tick corruption from Blood Altar (+2/min)', () => {
    vi.mocked(contentGetEntry).mockReturnValue(bloodAltarContent);
    const rooms = [makeRoom({ featureIds: [BLOOD_ALTAR_ID] })];
    expect(featureCalculateCorruptionGenerationPerTick(rooms, 5)).toBeCloseTo(0.4);
  });

  it('sums corruption from multiple Blood Altars', () => {
    vi.mocked(contentGetEntry).mockReturnValue(bloodAltarContent);
    const rooms = [
      makeRoom({ featureIds: [BLOOD_ALTAR_ID] }),
      makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [BLOOD_ALTAR_ID] }),
    ];
    expect(featureCalculateCorruptionGenerationPerTick(rooms, 5)).toBeCloseTo(0.8);
  });

  it('ignores rooms without corruption_generation bonuses', () => {
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === BLOOD_ALTAR_ID) return bloodAltarContent;
      if (id === MOSS_ID) return mossContent;
      return undefined;
    });
    const rooms = [
      makeRoom({ featureIds: [BLOOD_ALTAR_ID] }),
      makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [MOSS_ID] }),
    ];
    expect(featureCalculateCorruptionGenerationPerTick(rooms, 5)).toBeCloseTo(0.4);
  });
});

describe('featureCanSacrifice', () => {
  it('returns not allowed when room has no features', () => {
    const room = makeRoom();
    const result = featureCanSacrifice(room, 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Room has no feature attached');
  });

  it('returns not allowed when feature does not support sacrifice', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mossContent);
    const room = makeRoom({ featureIds: [MOSS_ID] });
    const result = featureCanSacrifice(room, 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Feature does not support sacrifice');
  });

  it('returns not allowed when sacrifice buff is already active', () => {
    vi.mocked(contentGetEntry).mockReturnValue(bloodAltarContent);
    const room = makeRoom({
      featureIds: [BLOOD_ALTAR_ID],
      sacrificeBuff: { productionMultiplier: 0.25, combatMultiplier: 0.15, ticksRemaining: 10 },
    });
    const result = featureCanSacrifice(room, 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Sacrifice buff already active');
  });

  it('returns not allowed when not enough food', () => {
    vi.mocked(contentGetEntry).mockReturnValue(bloodAltarContent);
    const room = makeRoom({ featureIds: [BLOOD_ALTAR_ID] });
    const result = featureCanSacrifice(room, FEATURE_SACRIFICE_FOOD_COST - 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Not enough Food');
  });

  it('returns allowed when all conditions met', () => {
    vi.mocked(contentGetEntry).mockReturnValue(bloodAltarContent);
    const room = makeRoom({ featureIds: [BLOOD_ALTAR_ID] });
    const result = featureCanSacrifice(room, FEATURE_SACRIFICE_FOOD_COST);
    expect(result.allowed).toBe(true);
  });
});

describe('featureCreateSacrificeBuff', () => {
  it('creates a buff with correct properties', () => {
    const buff = featureCreateSacrificeBuff();
    expect(buff.productionMultiplier).toBe(0.25);
    expect(buff.combatMultiplier).toBe(0.15);
    expect(buff.ticksRemaining).toBe(FEATURE_SACRIFICE_BUFF_TICKS);
  });
});

describe('featureSacrificeProcess', () => {
  it('decrements tick counter on active buffs', () => {
    const room = makeRoom({
      sacrificeBuff: { productionMultiplier: 0.25, combatMultiplier: 0.15, ticksRemaining: 10 },
    });
    featureSacrificeProcess([room]);
    expect(room.sacrificeBuff?.ticksRemaining).toBe(9);
  });

  it('removes buff when ticks reach 0', () => {
    const room = makeRoom({
      sacrificeBuff: { productionMultiplier: 0.25, combatMultiplier: 0.15, ticksRemaining: 1 },
    });
    featureSacrificeProcess([room]);
    expect(room.sacrificeBuff).toBeUndefined();
  });

  it('ignores rooms without sacrifice buffs', () => {
    const room = makeRoom();
    featureSacrificeProcess([room]);
    expect(room.sacrificeBuff).toBeUndefined();
  });

  it('handles multiple rooms with mixed buff states', () => {
    const room1 = makeRoom({
      sacrificeBuff: { productionMultiplier: 0.25, combatMultiplier: 0.15, ticksRemaining: 5 },
    });
    const room2 = makeRoom({ id: 'room-2' as PlacedRoomId });
    const room3 = makeRoom({
      id: 'room-3' as PlacedRoomId,
      sacrificeBuff: { productionMultiplier: 0.25, combatMultiplier: 0.15, ticksRemaining: 1 },
    });
    featureSacrificeProcess([room1, room2, room3]);
    expect(room1.sacrificeBuff?.ticksRemaining).toBe(4);
    expect(room2.sacrificeBuff).toBeUndefined();
    expect(room3.sacrificeBuff).toBeUndefined();
  });
});

describe('featureHasFungalNetwork', () => {
  it('returns false for room without features', () => {
    const room = makeRoom();
    expect(featureHasFungalNetwork(room)).toBe(false);
  });

  it('returns true for room with Fungal Network', () => {
    vi.mocked(contentGetEntry).mockReturnValue(fungalContent);
    const room = makeRoom({ featureIds: [FUNGAL_ID] });
    expect(featureHasFungalNetwork(room)).toBe(true);
  });

  it('returns false for room with non-fungal feature', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mossContent);
    const room = makeRoom({ featureIds: [MOSS_ID] });
    expect(featureHasFungalNetwork(room)).toBe(false);
  });
});

describe('featureGetFungalNetworkDestinations', () => {
  it('returns empty array when no other rooms have fungal networks', () => {
    const room1 = makeRoom({ featureIds: [FUNGAL_ID] });
    const room2 = makeRoom({ id: 'room-2' as PlacedRoomId });
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === FUNGAL_ID) return fungalContent;
      return undefined;
    });
    const floor = makeFloor({ rooms: [room1, room2] });
    const destinations = featureGetFungalNetworkDestinations([floor], room1.id);
    expect(destinations).toHaveLength(0);
  });

  it('returns rooms with fungal networks, excluding source', () => {
    vi.mocked(contentGetEntry).mockReturnValue(fungalContent);
    const room1 = makeRoom({ featureIds: [FUNGAL_ID] });
    const room2 = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [FUNGAL_ID] });
    const room3 = makeRoom({ id: 'room-3' as PlacedRoomId, featureIds: [FUNGAL_ID] });
    const floor = makeFloor({ rooms: [room1, room2, room3] });
    const destinations = featureGetFungalNetworkDestinations([floor], room1.id);
    expect(destinations).toHaveLength(2);
    expect(destinations[0].room.id).toBe('room-2');
    expect(destinations[1].room.id).toBe('room-3');
  });

  it('finds destinations across multiple floors', () => {
    vi.mocked(contentGetEntry).mockReturnValue(fungalContent);
    const room1 = makeRoom({ featureIds: [FUNGAL_ID] });
    const room2 = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [FUNGAL_ID] });
    const floor1 = makeFloor({ rooms: [room1] });
    const floor2 = makeFloor({ id: 'floor-2' as FloorId, rooms: [room2] });
    const destinations = featureGetFungalNetworkDestinations([floor1, floor2], room1.id);
    expect(destinations).toHaveLength(1);
    expect(destinations[0].room.id).toBe('room-2');
  });
});

describe('featureCanFungalTransfer', () => {
  it('returns not allowed when source room has no fungal network', () => {
    const room = makeRoom();
    const inhabitant = makeInhabitant();
    const result = featureCanFungalTransfer([], room, inhabitant);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Source room has no Fungal Network');
  });

  it('returns not allowed when inhabitant is not in source room', () => {
    vi.mocked(contentGetEntry).mockReturnValue(fungalContent);
    const room = makeRoom({ featureIds: [FUNGAL_ID] });
    const inhabitant = makeInhabitant({ assignedRoomId: 'other-room' as PlacedRoomId });
    const result = featureCanFungalTransfer([], room, inhabitant);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Inhabitant is not assigned to this room');
  });

  it('returns not allowed when no destinations exist', () => {
    vi.mocked(contentGetEntry).mockReturnValue(fungalContent);
    const room1 = makeRoom({ featureIds: [FUNGAL_ID] });
    const inhabitant = makeInhabitant({ assignedRoomId: room1.id });
    const floor = makeFloor({ rooms: [room1] });
    const result = featureCanFungalTransfer([floor], room1, inhabitant);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('No other Fungal Network rooms available');
  });

  it('returns allowed when conditions are met', () => {
    vi.mocked(contentGetEntry).mockReturnValue(fungalContent);
    const room1 = makeRoom({ featureIds: [FUNGAL_ID] });
    const room2 = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [FUNGAL_ID] });
    const inhabitant = makeInhabitant({ assignedRoomId: room1.id });
    const floor = makeFloor({ rooms: [room1, room2] });
    const result = featureCanFungalTransfer([floor], room1, inhabitant);
    expect(result.allowed).toBe(true);
  });
});

describe('featureFungalTransfer', () => {
  it('moves inhabitant to destination room instantly', () => {
    const inhabitant = makeInhabitant({
      assignedRoomId: 'room-1' as PlacedRoomId,
      travelTicksRemaining: 5,
    });
    featureFungalTransfer(inhabitant, 'room-2' as PlacedRoomId);
    expect(inhabitant.assignedRoomId).toBe('room-2');
    expect(inhabitant.travelTicksRemaining).toBe(0);
  });
});

describe('featureAttachToSlot', () => {
  it('attaches a feature to an empty slot', () => {
    const room = makeRoom();
    featureAttachToSlot(room, 0, COFFINS_ID, 2);
    expect(room.featureIds?.[0]).toBe(COFFINS_ID);
    expect(room.featureIds).toHaveLength(2);
  });

  it('attaches to a specific slot index', () => {
    const room = makeRoom();
    featureAttachToSlot(room, 1, MOSS_ID, 3);
    expect(room.featureIds?.[0]).toBeUndefined();
    expect(room.featureIds?.[1]).toBe(MOSS_ID);
    expect(room.featureIds).toHaveLength(3);
  });

  it('preserves existing features in other slots', () => {
    const room = makeRoom({ featureIds: [COFFINS_ID, undefined as unknown as FeatureId] });
    featureAttachToSlot(room, 1, MOSS_ID, 2);
    expect(room.featureIds?.[0]).toBe(COFFINS_ID);
    expect(room.featureIds?.[1]).toBe(MOSS_ID);
  });
});

describe('featureRemoveFromSlot', () => {
  it('clears the feature from a slot', () => {
    vi.mocked(contentGetEntry).mockReturnValue(undefined);
    const room = makeRoom({ featureIds: [COFFINS_ID, MOSS_ID] });
    featureRemoveFromSlot(room, 0);
    expect(room.featureIds?.[0]).toBeUndefined();
    expect(room.featureIds?.[1]).toBe(MOSS_ID);
  });

  it('clears sacrifice buff if no corruption_generation features remain', () => {
    vi.mocked(contentGetEntry).mockReturnValue(undefined);
    const room = makeRoom({
      featureIds: [BLOOD_ALTAR_ID],
      sacrificeBuff: { productionMultiplier: 0.25, combatMultiplier: 0.15, ticksRemaining: 10 },
    });
    featureRemoveFromSlot(room, 0);
    expect(room.sacrificeBuff).toBeUndefined();
  });

  it('keeps sacrifice buff if another corruption feature remains', () => {
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === BLOOD_ALTAR_ID) return bloodAltarContent;
      return undefined;
    });
    const room = makeRoom({
      featureIds: [MOSS_ID, BLOOD_ALTAR_ID],
      sacrificeBuff: { productionMultiplier: 0.25, combatMultiplier: 0.15, ticksRemaining: 10 },
    });
    featureRemoveFromSlot(room, 0);
    expect(room.sacrificeBuff).toBeDefined();
  });

  it('does nothing when room has no featureIds', () => {
    const room = makeRoom();
    featureRemoveFromSlot(room, 0);
    expect(room.featureIds).toBeUndefined();
  });
});

describe('featureRemoveAllFromRoom', () => {
  it('clears featureIds and sacrificeBuff', () => {
    const room = makeRoom({
      featureIds: [BLOOD_ALTAR_ID],
      sacrificeBuff: { productionMultiplier: 0.25, combatMultiplier: 0.15, ticksRemaining: 10 },
    });
    featureRemoveAllFromRoom(room);
    expect(room.featureIds).toBeUndefined();
    expect(room.sacrificeBuff).toBeUndefined();
  });

  it('handles room with no features gracefully', () => {
    const room = makeRoom();
    featureRemoveAllFromRoom(room);
    expect(room.featureIds).toBeUndefined();
  });
});

// --- Functional Features ---

describe('featureCalculateStorageBonusMultiplier', () => {
  it('returns 1.0 when no rooms have storage features', () => {
    const floor = makeFloor({ rooms: [makeRoom()] });
    expect(featureCalculateStorageBonusMultiplier([floor])).toBe(1);
  });

  it('returns 2.0 when one room has Storage Expansion (+100%)', () => {
    vi.mocked(contentGetEntry).mockReturnValue(storageContent);
    const room = makeRoom({ featureIds: [STORAGE_ID] });
    const floor = makeFloor({ rooms: [room] });
    expect(featureCalculateStorageBonusMultiplier([floor])).toBe(2.0);
  });

  it('stacks across multiple rooms', () => {
    vi.mocked(contentGetEntry).mockReturnValue(storageContent);
    const room1 = makeRoom({ featureIds: [STORAGE_ID] });
    const room2 = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [STORAGE_ID] });
    const floor = makeFloor({ rooms: [room1, room2] });
    expect(featureCalculateStorageBonusMultiplier([floor])).toBe(3.0);
  });

  it('stacks across multiple floors', () => {
    vi.mocked(contentGetEntry).mockReturnValue(storageContent);
    const room1 = makeRoom({ featureIds: [STORAGE_ID] });
    const room2 = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [STORAGE_ID] });
    const floor1 = makeFloor({ rooms: [room1] });
    const floor2 = makeFloor({ id: 'floor-2' as FloorId, rooms: [room2] });
    expect(featureCalculateStorageBonusMultiplier([floor1, floor2])).toBe(3.0);
  });

  it('ignores non-storage features', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mossContent);
    const room = makeRoom({ featureIds: [MOSS_ID] });
    const floor = makeFloor({ rooms: [room] });
    expect(featureCalculateStorageBonusMultiplier([floor])).toBe(1);
  });
});

describe('Efficiency Enchantment (production_bonus)', () => {
  it('provides 20% production bonus via existing featureCalculateProductionBonus', () => {
    vi.mocked(contentGetEntry).mockReturnValue(efficiencyContent);
    const room = makeRoom({ featureIds: [EFFICIENCY_ID] });
    expect(featureCalculateProductionBonus(room)).toBeCloseTo(0.20);
  });

  it('stacks with other production bonus features', () => {
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === EFFICIENCY_ID) return efficiencyContent;
      if (id === VENTS_ID) return ventsContent;
      return undefined;
    });
    const room = makeRoom({ featureIds: [EFFICIENCY_ID, VENTS_ID] });
    // Efficiency: +20% (untargeted), Vents: +15% (untargeted) → 35%
    expect(featureCalculateProductionBonus(room, 'gold')).toBeCloseTo(0.35);
  });

  it('bonus is removed when feature is removed', () => {
    vi.mocked(contentGetEntry).mockReturnValue(undefined);
    const room = makeRoom({ featureIds: [EFFICIENCY_ID] });
    featureRemoveFromSlot(room, 0);
    expect(featureCalculateProductionBonus(room)).toBe(0);
  });
});

describe('Fear Ward (fear_reduction)', () => {
  it('provides -2 fear reduction via existing featureCalculateFearReduction', () => {
    vi.mocked(contentGetEntry).mockReturnValue(fearWardContent);
    const room = makeRoom({ featureIds: [FEAR_WARD_ID] });
    expect(featureCalculateFearReduction(room)).toBe(2);
  });

  it('stacks with other fear reduction features', () => {
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === FEAR_WARD_ID) return fearWardContent;
      if (id === MOSS_ID) return mossContent;
      return undefined;
    });
    const room = makeRoom({ featureIds: [FEAR_WARD_ID, MOSS_ID] });
    // Fear Ward: -2, Moss: -1 → total -3
    expect(featureCalculateFearReduction(room)).toBe(3);
  });

  it('reduction is removed when feature is removed', () => {
    vi.mocked(contentGetEntry).mockReturnValue(undefined);
    const room = makeRoom({ featureIds: [FEAR_WARD_ID] });
    featureRemoveFromSlot(room, 0);
    expect(featureCalculateFearReduction(room)).toBe(0);
  });
});

describe('featureGetCorruptionSealedRoomIds', () => {
  it('returns empty set when no rooms have corruption seals', () => {
    const floor = makeFloor({ rooms: [makeRoom()] });
    expect(featureGetCorruptionSealedRoomIds([floor]).size).toBe(0);
  });

  it('returns room IDs with corruption seals', () => {
    vi.mocked(contentGetEntry).mockReturnValue(corruptionSealContent);
    const room = makeRoom({ featureIds: [CORRUPTION_SEAL_ID] });
    const floor = makeFloor({ rooms: [room] });
    const sealed = featureGetCorruptionSealedRoomIds([floor]);
    expect(sealed.has(room.id)).toBe(true);
  });

  it('finds sealed rooms across multiple floors', () => {
    vi.mocked(contentGetEntry).mockReturnValue(corruptionSealContent);
    const room1 = makeRoom({ featureIds: [CORRUPTION_SEAL_ID] });
    const room2 = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [CORRUPTION_SEAL_ID] });
    const floor1 = makeFloor({ rooms: [room1] });
    const floor2 = makeFloor({ id: 'floor-2' as FloorId, rooms: [room2] });
    const sealed = featureGetCorruptionSealedRoomIds([floor1, floor2]);
    expect(sealed.size).toBe(2);
  });
});

describe('featureCalculateTrainingXpPerTick', () => {
  it('returns 0 when room has no training station', () => {
    const room = makeRoom();
    expect(featureCalculateTrainingXpPerTick(room)).toBe(0);
  });

  it('returns XP per tick from Training Station', () => {
    vi.mocked(contentGetEntry).mockReturnValue(trainingStationContent);
    const room = makeRoom({ featureIds: [TRAINING_STATION_ID] });
    expect(featureCalculateTrainingXpPerTick(room)).toBe(1);
  });
});

describe('featureGetResourceConverterEfficiency', () => {
  it('returns undefined when room has no converter', () => {
    const room = makeRoom();
    expect(featureGetResourceConverterEfficiency(room)).toBeUndefined();
  });

  it('returns 0.75 efficiency from Resource Converter', () => {
    vi.mocked(contentGetEntry).mockReturnValue(resourceConverterContent);
    const room = makeRoom({ featureIds: [RESOURCE_CONVERTER_ID] });
    expect(featureGetResourceConverterEfficiency(room)).toBe(0.75);
  });
});

describe('featureTrainingStationProcess', () => {
  it('does nothing when no rooms have training stations', () => {
    const room = makeRoom();
    const floor = makeFloor({ rooms: [room] });
    const inhabitant = makeInhabitant({ assignedRoomId: room.id });
    featureTrainingStationProcess([floor], [inhabitant]);
    expect(inhabitant.xp).toBeUndefined();
  });

  it('grants XP to inhabitants assigned to rooms with training stations', () => {
    vi.mocked(contentGetEntry).mockReturnValue(trainingStationContent);
    const room = makeRoom({ featureIds: [TRAINING_STATION_ID] });
    const floor = makeFloor({ rooms: [room] });
    const inhabitant = makeInhabitant({ assignedRoomId: room.id });
    featureTrainingStationProcess([floor], [inhabitant]);
    expect(inhabitant.xp).toBe(1);
  });

  it('accumulates XP over multiple ticks', () => {
    vi.mocked(contentGetEntry).mockReturnValue(trainingStationContent);
    const room = makeRoom({ featureIds: [TRAINING_STATION_ID] });
    const floor = makeFloor({ rooms: [room] });
    const inhabitant = makeInhabitant({ assignedRoomId: room.id });
    featureTrainingStationProcess([floor], [inhabitant]);
    featureTrainingStationProcess([floor], [inhabitant]);
    featureTrainingStationProcess([floor], [inhabitant]);
    expect(inhabitant.xp).toBe(3);
  });

  it('does not grant XP to inhabitants not assigned to the room', () => {
    vi.mocked(contentGetEntry).mockReturnValue(trainingStationContent);
    const room = makeRoom({ featureIds: [TRAINING_STATION_ID] });
    const floor = makeFloor({ rooms: [room] });
    const inhabitant = makeInhabitant({ assignedRoomId: 'other-room' as PlacedRoomId });
    featureTrainingStationProcess([floor], [inhabitant]);
    expect(inhabitant.xp).toBeUndefined();
  });

  it('grants XP to multiple inhabitants in the same room', () => {
    vi.mocked(contentGetEntry).mockReturnValue(trainingStationContent);
    const room = makeRoom({ featureIds: [TRAINING_STATION_ID] });
    const floor = makeFloor({ rooms: [room] });
    const inh1 = makeInhabitant({ instanceId: 'i1' as InhabitantInstanceId, assignedRoomId: room.id });
    const inh2 = makeInhabitant({ instanceId: 'i2' as InhabitantInstanceId, assignedRoomId: room.id });
    featureTrainingStationProcess([floor], [inh1, inh2]);
    expect(inh1.xp).toBe(1);
    expect(inh2.xp).toBe(1);
  });

  it('XP reverts when feature is removed (no further gain)', () => {
    vi.mocked(contentGetEntry).mockReturnValue(trainingStationContent);
    const room = makeRoom({ featureIds: [TRAINING_STATION_ID] });
    const floor = makeFloor({ rooms: [room] });
    const inhabitant = makeInhabitant({ assignedRoomId: room.id });

    // Gain XP
    featureTrainingStationProcess([floor], [inhabitant]);
    expect(inhabitant.xp).toBe(1);

    // Remove feature
    vi.mocked(contentGetEntry).mockReturnValue(undefined);
    featureRemoveFromSlot(room, 0);

    // No more XP gained
    featureTrainingStationProcess([floor], [inhabitant]);
    expect(inhabitant.xp).toBe(1); // unchanged
  });
});
