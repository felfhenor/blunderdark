import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn(),
  contentGetEntriesByType: vi.fn(),
}));

vi.mock('@helpers/rng', () => ({
  rngChoice: vi.fn(),
  rngSucceedsChance: vi.fn(),
  rngUuid: vi.fn(() => 'test-uuid'),
}));

import { contentGetEntry, contentGetEntriesByType } from '@helpers/content';
import { rngChoice, rngSucceedsChance } from '@helpers/rng';
import {
  featureGetAllForRoom,
  featureGetForSlot,
  featureGetBonuses,
  featureGetSlotCount,
  featureIsUniquePlaced,
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
  FEATURE_SLOT_COUNT_DEFAULT,
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
  featureApplyResourceConversion,
  featureCalculateSpeedMultiplier,
  featureMaintenanceProcess,
  featureVoidGateProcess,
  featurePhylacteryQueueRespawn,
  featurePhylacteryProcess,
  FEATURE_PHYLACTERY_MAX_CHARGES,
  FEATURE_PHYLACTERY_RESPAWN_TICKS,
} from '@helpers/features';
import type { FeatureContent, FeatureId } from '@interfaces/content-feature';
import type { InhabitantContent, InhabitantId } from '@interfaces/content-inhabitant';
import type { Floor, FloorId } from '@interfaces/floor';
import type { InhabitantInstance, InhabitantInstanceId } from '@interfaces/inhabitant';
import type { PlacedRoom, PlacedRoomId } from '@interfaces/room-shape';
import type { RoomId } from '@interfaces/content-room';
import type { RoomShapeId } from '@interfaces/content-roomshape';
import type { PhylacteryRespawnEntry } from '@helpers/features';

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
const ELDER_RUNES_ID = 'elder-runes-test-id' as FeatureId;
const DRAGON_HOARD_ID = 'dragon-hoard-test-id' as FeatureId;
const TIME_DILATION_ID = 'time-dilation-test-id' as FeatureId;
const VOID_GATE_ID = 'void-gate-test-id' as FeatureId;
const PHYLACTERY_ID = 'phylactery-test-id' as FeatureId;

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

const elderRunesContent: FeatureContent = {
  id: ELDER_RUNES_ID,
  name: 'Elder Runes',
  __type: 'feature',
  description: 'Test elder runes',
  category: 'prestige',
  cost: { gold: 500 },
  bonuses: [
    { type: 'production_bonus', value: 0.50, description: '+50% production' },
  ],
};

const dragonHoardContent: FeatureContent = {
  id: DRAGON_HOARD_ID,
  name: "Dragon's Hoard Core",
  __type: 'feature',
  description: 'Test dragon hoard',
  category: 'prestige',
  unique: true,
  cost: { gold: 800 },
  bonuses: [
    { type: 'flat_production', value: 5, targetType: 'gold', description: '+5 Gold/min' },
    { type: 'storage_bonus', value: 1.0, targetType: 'gold', description: '+100% Gold storage' },
  ],
};

const timeDilationContent: FeatureContent = {
  id: TIME_DILATION_ID,
  name: 'Time Dilation Field',
  __type: 'feature',
  description: 'Test time dilation',
  category: 'prestige',
  cost: { gold: 600 },
  maintenanceCost: { flux: 2 },
  bonuses: [
    { type: 'speed_multiplier', value: 1.50, description: '150% speed' },
  ],
};

const voidGateContent: FeatureContent = {
  id: VOID_GATE_ID,
  name: 'Void Gate',
  __type: 'feature',
  description: 'Test void gate',
  category: 'prestige',
  cost: { gold: 400 },
  bonuses: [
    { type: 'daily_summon', value: 1, description: 'Daily summon' },
  ],
};

const phylacteryContent: FeatureContent = {
  id: PHYLACTERY_ID,
  name: 'Phylactery',
  __type: 'feature',
  description: 'Test phylactery',
  category: 'prestige',
  cost: { gold: 450 },
  bonuses: [
    { type: 'undead_respawn', value: 0.75, description: 'Undead respawn at 75% stats' },
  ],
};

const mockInhabitantContent: InhabitantContent = {
  id: 'mock-inh-def' as InhabitantId,
  name: 'Test Creature',
  __type: 'inhabitant',
  description: 'A test creature',
  type: 'creature',
  tier: 1,
  cost: { gold: 50 },
  stats: { hp: 10, attack: 4, defense: 3, speed: 2, workerEfficiency: 1.0 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
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
  vi.mocked(contentGetEntriesByType).mockReset();
  vi.mocked(rngChoice).mockReset();
  vi.mocked(rngSucceedsChance).mockReset();
});

describe('featureGetSlotCount', () => {
  it('returns maxFeatures from room content definition', () => {
    const room = makeRoom();
    vi.mocked(contentGetEntry).mockReturnValue({ maxFeatures: 3 });
    expect(featureGetSlotCount(room)).toBe(3);
  });

  it('returns default when room content is not found', () => {
    const room = makeRoom();
    vi.mocked(contentGetEntry).mockReturnValue(undefined);
    expect(featureGetSlotCount(room)).toBe(FEATURE_SLOT_COUNT_DEFAULT);
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

describe('featureApplyResourceConversion', () => {
  it('returns original production when room has no converter', () => {
    const room = makeRoom();
    const production = { crystals: 5 };
    expect(featureApplyResourceConversion(production, room)).toEqual({ crystals: 5 });
  });

  it('returns original production when converter exists but no target set', () => {
    vi.mocked(contentGetEntry).mockReturnValue(resourceConverterContent);
    const room = makeRoom({ featureIds: [RESOURCE_CONVERTER_ID] });
    const production = { crystals: 5 };
    expect(featureApplyResourceConversion(production, room)).toEqual({ crystals: 5 });
  });

  it('converts production to target resource at 75% efficiency', () => {
    vi.mocked(contentGetEntry).mockReturnValue(resourceConverterContent);
    const room = makeRoom({
      featureIds: [RESOURCE_CONVERTER_ID],
      convertedOutputResource: 'gold',
    });
    const production = { crystals: 10 };
    const result = featureApplyResourceConversion(production, room);
    expect(result['gold']).toBeCloseTo(7.5); // 10 * 0.75
    expect(result['crystals']).toBeUndefined();
  });

  it('sums all production types when converting', () => {
    vi.mocked(contentGetEntry).mockReturnValue(resourceConverterContent);
    const room = makeRoom({
      featureIds: [RESOURCE_CONVERTER_ID],
      convertedOutputResource: 'food',
    });
    const production = { crystals: 4, flux: 6 };
    const result = featureApplyResourceConversion(production, room);
    expect(result['food']).toBeCloseTo(7.5); // (4 + 6) * 0.75
    expect(result['crystals']).toBeUndefined();
    expect(result['flux']).toBeUndefined();
  });

  it('returns original production when total production is zero', () => {
    vi.mocked(contentGetEntry).mockReturnValue(resourceConverterContent);
    const room = makeRoom({
      featureIds: [RESOURCE_CONVERTER_ID],
      convertedOutputResource: 'gold',
    });
    const production = {};
    const result = featureApplyResourceConversion(production, room);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('switching output type takes effect immediately', () => {
    vi.mocked(contentGetEntry).mockReturnValue(resourceConverterContent);
    const room = makeRoom({
      featureIds: [RESOURCE_CONVERTER_ID],
      convertedOutputResource: 'gold',
    });
    const production = { crystals: 10 };

    // First conversion to gold
    let result = featureApplyResourceConversion(production, room);
    expect(result['gold']).toBeCloseTo(7.5);

    // Switch to food
    room.convertedOutputResource = 'food';
    result = featureApplyResourceConversion(production, room);
    expect(result['food']).toBeCloseTo(7.5);
    expect(result['gold']).toBeUndefined();
  });
});

// --- Prestige Features ---

describe('featureIsUniquePlaced', () => {
  it('returns false when no floors have the feature', () => {
    const floor = makeFloor({ rooms: [makeRoom()] });
    expect(featureIsUniquePlaced([floor], DRAGON_HOARD_ID)).toBe(false);
  });

  it('returns false when rooms have no features at all', () => {
    const room = makeRoom();
    const floor = makeFloor({ rooms: [room] });
    expect(featureIsUniquePlaced([floor], DRAGON_HOARD_ID)).toBe(false);
  });

  it('returns true when the feature is placed on a room', () => {
    const room = makeRoom({ featureIds: [DRAGON_HOARD_ID] });
    const floor = makeFloor({ rooms: [room] });
    expect(featureIsUniquePlaced([floor], DRAGON_HOARD_ID)).toBe(true);
  });

  it('returns true when the feature is on a different floor', () => {
    const room1 = makeRoom();
    const room2 = makeRoom({ id: 'room-2' as PlacedRoomId, featureIds: [DRAGON_HOARD_ID] });
    const floor1 = makeFloor({ rooms: [room1] });
    const floor2 = makeFloor({ id: 'floor-2' as FloorId, rooms: [room2] });
    expect(featureIsUniquePlaced([floor1, floor2], DRAGON_HOARD_ID)).toBe(true);
  });

  it('returns false for a different feature ID', () => {
    const room = makeRoom({ featureIds: [COFFINS_ID] });
    const floor = makeFloor({ rooms: [room] });
    expect(featureIsUniquePlaced([floor], DRAGON_HOARD_ID)).toBe(false);
  });

  it('returns false after the unique feature is removed', () => {
    const room = makeRoom({ featureIds: [DRAGON_HOARD_ID] });
    const floor = makeFloor({ rooms: [room] });
    expect(featureIsUniquePlaced([floor], DRAGON_HOARD_ID)).toBe(true);

    vi.mocked(contentGetEntry).mockReturnValue(undefined);
    featureRemoveFromSlot(room, 0);
    expect(featureIsUniquePlaced([floor], DRAGON_HOARD_ID)).toBe(false);
  });
});

describe('Elder Runes (prestige production_bonus)', () => {
  it('provides 50% production bonus via existing featureCalculateProductionBonus', () => {
    vi.mocked(contentGetEntry).mockReturnValue(elderRunesContent);
    const room = makeRoom({ featureIds: [ELDER_RUNES_ID] });
    expect(featureCalculateProductionBonus(room)).toBeCloseTo(0.50);
  });

  it('stacks with other production bonus features', () => {
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === ELDER_RUNES_ID) return elderRunesContent;
      if (id === VENTS_ID) return ventsContent;
      return undefined;
    });
    const room = makeRoom({ featureIds: [ELDER_RUNES_ID, VENTS_ID] });
    expect(featureCalculateProductionBonus(room, 'gold')).toBeCloseTo(0.65);
  });
});

describe("Dragon's Hoard Core (prestige flat_production + storage_bonus)", () => {
  it('produces 5 gold per minute via flat production', () => {
    vi.mocked(contentGetEntry).mockReturnValue(dragonHoardContent);
    const room = makeRoom({ featureIds: [DRAGON_HOARD_ID] });
    const result = featureCalculateFlatProduction(room, 5);
    expect(result['gold']).toBeCloseTo(1.0); // 5/5 per tick
  });

  it('provides storage bonus', () => {
    vi.mocked(contentGetEntry).mockReturnValue(dragonHoardContent);
    const room = makeRoom({ featureIds: [DRAGON_HOARD_ID] });
    const floor = makeFloor({ rooms: [room] });
    expect(featureCalculateStorageBonusMultiplier([floor])).toBe(2.0);
  });
});

describe('featureCalculateSpeedMultiplier', () => {
  it('returns 1.0 when room has no speed multiplier features', () => {
    const room = makeRoom();
    expect(featureCalculateSpeedMultiplier(room)).toBe(1.0);
  });

  it('returns 1.0 when room has non-speed features', () => {
    vi.mocked(contentGetEntry).mockReturnValue(elderRunesContent);
    const room = makeRoom({ featureIds: [ELDER_RUNES_ID] });
    expect(featureCalculateSpeedMultiplier(room)).toBe(1.0);
  });

  it('returns 1.5 for Time Dilation Field', () => {
    vi.mocked(contentGetEntry).mockReturnValue(timeDilationContent);
    const room = makeRoom({ featureIds: [TIME_DILATION_ID] });
    expect(featureCalculateSpeedMultiplier(room)).toBeCloseTo(1.5);
  });
});

describe('featureMaintenanceProcess', () => {
  it('does nothing for rooms without maintenance features', () => {
    vi.mocked(contentGetEntry).mockReturnValue(elderRunesContent);
    const room = makeRoom({ featureIds: [ELDER_RUNES_ID] });
    const floor = makeFloor({ rooms: [room] });
    const resources = { flux: 100 };
    featureMaintenanceProcess([floor], resources, 5);
    expect(resources.flux).toBe(100);
    expect(room.maintenanceActive).toBeUndefined();
  });

  it('deducts maintenance cost per tick when affordable', () => {
    vi.mocked(contentGetEntry).mockReturnValue(timeDilationContent);
    const room = makeRoom({ featureIds: [TIME_DILATION_ID] });
    const floor = makeFloor({ rooms: [room] });
    const resources = { flux: 100 };
    featureMaintenanceProcess([floor], resources, 5);
    // maintenanceCost: flux 2/min → 0.4/tick at 5 ticks/min
    expect(resources.flux).toBeCloseTo(99.6);
    expect(room.maintenanceActive).toBe(true);
  });

  it('sets maintenanceActive to false when resources insufficient', () => {
    vi.mocked(contentGetEntry).mockReturnValue(timeDilationContent);
    const room = makeRoom({ featureIds: [TIME_DILATION_ID] });
    const floor = makeFloor({ rooms: [room] });
    const resources = { flux: 0 };
    featureMaintenanceProcess([floor], resources, 5);
    expect(resources.flux).toBe(0);
    expect(room.maintenanceActive).toBe(false);
  });

  it('reactivates when resources become available again', () => {
    vi.mocked(contentGetEntry).mockReturnValue(timeDilationContent);
    const room = makeRoom({ featureIds: [TIME_DILATION_ID], maintenanceActive: false });
    const floor = makeFloor({ rooms: [room] });
    const resources = { flux: 10 };
    featureMaintenanceProcess([floor], resources, 5);
    expect(room.maintenanceActive).toBe(true);
    expect(resources.flux).toBeCloseTo(9.6);
  });

  it('accumulates maintenance costs from multiple features', () => {
    const timeDilation2: FeatureContent = { ...timeDilationContent, id: 'td2' as FeatureId };
    vi.mocked(contentGetEntry).mockImplementation((id) => {
      if (id === TIME_DILATION_ID) return timeDilationContent;
      if (id === 'td2') return timeDilation2;
      return undefined;
    });
    const room = makeRoom({ featureIds: [TIME_DILATION_ID, 'td2' as FeatureId] });
    const floor = makeFloor({ rooms: [room] });
    const resources = { flux: 100 };
    featureMaintenanceProcess([floor], resources, 5);
    // Two features: flux 4/min → 0.8/tick
    expect(resources.flux).toBeCloseTo(99.2);
    expect(room.maintenanceActive).toBe(true);
  });
});

// --- Void Gate ---

describe('featureVoidGateProcess', () => {
  it('does nothing when no rooms have daily_summon bonus', () => {
    vi.mocked(contentGetEntry).mockReturnValue(elderRunesContent);
    const room = makeRoom({ featureIds: [ELDER_RUNES_ID] });
    const floor = makeFloor({ rooms: [room] });
    const inhabitants: InhabitantInstance[] = [];
    const results = featureVoidGateProcess([floor], 1, inhabitants);
    expect(results).toHaveLength(0);
    expect(inhabitants).toHaveLength(0);
  });

  it('summons a friendly creature on new day', () => {
    vi.mocked(contentGetEntry).mockReturnValue(voidGateContent);
    vi.mocked(contentGetEntriesByType).mockReturnValue([mockInhabitantContent]);
    vi.mocked(rngChoice).mockReturnValue(mockInhabitantContent);
    vi.mocked(rngSucceedsChance).mockReturnValue(true); // friendly

    const room = makeRoom({ featureIds: [VOID_GATE_ID] });
    const floor = makeFloor({ rooms: [room] });
    const inhabitants: InhabitantInstance[] = [];

    const results = featureVoidGateProcess([floor], 1, inhabitants);
    expect(results).toHaveLength(1);
    expect(results[0].summoned).toBe(true);
    expect(results[0].hostile).toBe(false);
    expect(results[0].inhabitant).toBeDefined();
    expect(inhabitants).toHaveLength(1);
    expect(inhabitants[0].name).toContain('Gatecomer');
    expect(inhabitants[0].isSummoned).toBe(true);
  });

  it('does not summon on the same day twice', () => {
    vi.mocked(contentGetEntry).mockReturnValue(voidGateContent);
    vi.mocked(contentGetEntriesByType).mockReturnValue([mockInhabitantContent]);
    vi.mocked(rngChoice).mockReturnValue(mockInhabitantContent);
    vi.mocked(rngSucceedsChance).mockReturnValue(true);

    const room = makeRoom({ featureIds: [VOID_GATE_ID], voidGateLastSummonDay: 5 });
    const floor = makeFloor({ rooms: [room] });
    const inhabitants: InhabitantInstance[] = [];

    const results = featureVoidGateProcess([floor], 5, inhabitants);
    expect(results).toHaveLength(0);
    expect(inhabitants).toHaveLength(0);
  });

  it('summons on the next day', () => {
    vi.mocked(contentGetEntry).mockReturnValue(voidGateContent);
    vi.mocked(contentGetEntriesByType).mockReturnValue([mockInhabitantContent]);
    vi.mocked(rngChoice).mockReturnValue(mockInhabitantContent);
    vi.mocked(rngSucceedsChance).mockReturnValue(true);

    const room = makeRoom({ featureIds: [VOID_GATE_ID], voidGateLastSummonDay: 5 });
    const floor = makeFloor({ rooms: [room] });
    const inhabitants: InhabitantInstance[] = [];

    const results = featureVoidGateProcess([floor], 6, inhabitants);
    expect(results).toHaveLength(1);
    expect(results[0].summoned).toBe(true);
    expect(room.voidGateLastSummonDay).toBe(6);
  });

  it('reports hostile result when summon fails chance', () => {
    vi.mocked(contentGetEntry).mockReturnValue(voidGateContent);
    vi.mocked(contentGetEntriesByType).mockReturnValue([mockInhabitantContent]);
    vi.mocked(rngChoice).mockReturnValue(mockInhabitantContent);
    vi.mocked(rngSucceedsChance).mockReturnValue(false); // hostile

    const room = makeRoom({ featureIds: [VOID_GATE_ID] });
    const floor = makeFloor({ rooms: [room] });
    const inhabitants: InhabitantInstance[] = [];

    const results = featureVoidGateProcess([floor], 1, inhabitants);
    expect(results).toHaveLength(1);
    expect(results[0].summoned).toBe(true);
    expect(results[0].hostile).toBe(true);
    expect(results[0].damageDealt).toBeDefined();
    // No inhabitant added to roster for hostile summon
    expect(inhabitants).toHaveLength(0);
  });

  it('hostile summon calculates damage from creature stats', () => {
    vi.mocked(contentGetEntry).mockReturnValue(voidGateContent);
    vi.mocked(contentGetEntriesByType).mockReturnValue([mockInhabitantContent]);
    vi.mocked(rngChoice).mockReturnValue(mockInhabitantContent);
    vi.mocked(rngSucceedsChance).mockReturnValue(false);

    const room = makeRoom({ featureIds: [VOID_GATE_ID] });
    const floor = makeFloor({ rooms: [room] });
    const inh1 = makeInhabitant({ assignedRoomId: room.id });
    const inh2 = makeInhabitant({ instanceId: 'i2' as InhabitantInstanceId, assignedRoomId: room.id });
    const inhabitants = [inh1, inh2];

    const results = featureVoidGateProcess([floor], 1, inhabitants);
    // mockInhabitantContent.stats.attack = 4, 2 inhabitants in room → 8 damage
    expect(results[0].damageDealt).toBe(8);
  });
});

// --- Phylactery ---

describe('featurePhylacteryQueueRespawn', () => {
  it('returns false when room has no undead_respawn bonus', () => {
    vi.mocked(contentGetEntry).mockReturnValue(elderRunesContent);
    const room = makeRoom({ featureIds: [ELDER_RUNES_ID] });
    const deadInh = makeInhabitant();
    const queue: PhylacteryRespawnEntry[] = [];
    expect(featurePhylacteryQueueRespawn(room, deadInh, queue)).toBe(false);
    expect(queue).toHaveLength(0);
  });

  it('queues a respawn when room has phylactery with charges', () => {
    vi.mocked(contentGetEntry).mockReturnValue(phylacteryContent);
    const room = makeRoom({ featureIds: [PHYLACTERY_ID] });
    const deadInh = makeInhabitant({ name: 'Fallen Warrior' });
    const queue: PhylacteryRespawnEntry[] = [];

    expect(featurePhylacteryQueueRespawn(room, deadInh, queue)).toBe(true);
    expect(queue).toHaveLength(1);
    expect(queue[0].originalName).toBe('Fallen Warrior');
    expect(queue[0].ticksRemaining).toBe(FEATURE_PHYLACTERY_RESPAWN_TICKS);
    expect(room.phylacteryCharges).toBe(FEATURE_PHYLACTERY_MAX_CHARGES - 1);
  });

  it('returns false when charges are exhausted', () => {
    vi.mocked(contentGetEntry).mockReturnValue(phylacteryContent);
    const room = makeRoom({ featureIds: [PHYLACTERY_ID], phylacteryCharges: 0 });
    const deadInh = makeInhabitant();
    const queue: PhylacteryRespawnEntry[] = [];

    expect(featurePhylacteryQueueRespawn(room, deadInh, queue)).toBe(false);
    expect(queue).toHaveLength(0);
  });

  it('decrements charges on each queue', () => {
    vi.mocked(contentGetEntry).mockReturnValue(phylacteryContent);
    const room = makeRoom({ featureIds: [PHYLACTERY_ID], phylacteryCharges: 2 });
    const deadInh = makeInhabitant();
    const queue: PhylacteryRespawnEntry[] = [];

    featurePhylacteryQueueRespawn(room, deadInh, queue);
    expect(room.phylacteryCharges).toBe(1);

    featurePhylacteryQueueRespawn(room, deadInh, queue);
    expect(room.phylacteryCharges).toBe(0);

    expect(featurePhylacteryQueueRespawn(room, deadInh, queue)).toBe(false);
  });
});

describe('featurePhylacteryProcess', () => {
  it('does nothing with empty queue', () => {
    const queue: PhylacteryRespawnEntry[] = [];
    const result = featurePhylacteryProcess(queue);
    expect(result).toHaveLength(0);
    expect(queue).toHaveLength(0);
  });

  it('ticks down respawn timer', () => {
    const queue: PhylacteryRespawnEntry[] = [{
      definitionId: mockInhabitantContent.id,
      originalName: 'Fallen Warrior',
      ticksRemaining: 10,
      roomId: 'room-1' as PlacedRoomId,
    }];
    const result = featurePhylacteryProcess(queue);
    expect(result).toHaveLength(0);
    expect(queue).toHaveLength(1);
    expect(queue[0].ticksRemaining).toBe(9);
  });

  it('respawns inhabitant when timer reaches 0', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mockInhabitantContent);
    const queue: PhylacteryRespawnEntry[] = [{
      definitionId: mockInhabitantContent.id,
      originalName: 'Fallen Warrior',
      ticksRemaining: 1,
      roomId: 'room-1' as PlacedRoomId,
    }];
    const result = featurePhylacteryProcess(queue);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Fallen Warrior (Undead)');
    expect(result[0].isSummoned).toBe(true);
    expect(queue).toHaveLength(0);
  });

  it('respawned inhabitant has reduced stats via mutationBonuses', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mockInhabitantContent);
    const queue: PhylacteryRespawnEntry[] = [{
      definitionId: mockInhabitantContent.id,
      originalName: 'Test',
      ticksRemaining: 1,
      roomId: 'room-1' as PlacedRoomId,
    }];
    const result = featurePhylacteryProcess(queue);
    expect(result).toHaveLength(1);
    // Stats are 75% of base, so mutationBonuses = -25% of base
    // hp: 10 → floor(10 * -0.25) = floor(-2.5) = -3
    expect(result[0].mutationBonuses?.hp).toBe(-3);
    // attack: 4 → floor(4 * -0.25) = floor(-1) = -1
    expect(result[0].mutationBonuses?.attack).toBe(-1);
    // workerEfficiency: 1.0 → 1.0 * -0.25 = -0.25
    expect(result[0].mutationBonuses?.workerEfficiency).toBeCloseTo(-0.25);
  });

  it('processes multiple entries independently', () => {
    vi.mocked(contentGetEntry).mockReturnValue(mockInhabitantContent);
    const queue: PhylacteryRespawnEntry[] = [
      {
        definitionId: mockInhabitantContent.id,
        originalName: 'Warrior A',
        ticksRemaining: 1,
        roomId: 'room-1' as PlacedRoomId,
      },
      {
        definitionId: mockInhabitantContent.id,
        originalName: 'Warrior B',
        ticksRemaining: 5,
        roomId: 'room-1' as PlacedRoomId,
      },
    ];
    const result = featurePhylacteryProcess(queue);
    // Only first one completes
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Warrior A (Undead)');
    // Second one still in queue
    expect(queue).toHaveLength(1);
    expect(queue[0].originalName).toBe('Warrior B');
    expect(queue[0].ticksRemaining).toBe(4);
  });
});
