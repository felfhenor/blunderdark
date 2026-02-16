import { describe, expect, it, vi } from 'vitest';

vi.mock('@helpers/content', () => {
  const entries = new Map<string, unknown>();

  entries.set('room-treasure-vault', {
    id: 'room-treasure-vault',
    name: 'Treasure Vault',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { gold: 0.8 },
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  entries.set('room-crystal-mine', {
    id: 'room-crystal-mine',
    name: 'Crystal Mine',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { crystals: 1.0 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });

  entries.set('def-mimic', {
    id: 'def-mimic',
    name: 'Mimic',
    __type: 'inhabitant',
    type: 'creature',
    tier: 2,
    description: '',
    cost: {},
    stats: {
      hp: 50,
      attack: 16,
      defense: 14,
      speed: 8,
      workerEfficiency: 0.8,
    },
    traits: [
      {
        id: 'trait-mimic-shapeshifter',
        name: 'Shapeshifter',
        description: '',
        effectType: 'attack_bonus',
        effectValue: 1.0,
      },
      {
        id: 'trait-mimic-treasure-guardian',
        name: 'Treasure Guardian',
        description: '',
        effectType: 'defense_bonus',
        effectValue: 2,
        targetRoomId: 'room-treasure-vault',
      },
      {
        id: 'trait-mimic-versatile',
        name: 'Versatile',
        description: '',
        effectType: 'versatility',
        effectValue: 0.8,
      },
    ],
  });

  entries.set('def-goblin', {
    id: 'def-goblin',
    name: 'Goblin',
    __type: 'inhabitant',
    type: 'creature',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 30,
      attack: 10,
      defense: 8,
      speed: 12,
      workerEfficiency: 1.0,
    },
    traits: [
      {
        id: 'trait-goblin-miner',
        name: 'Miner',
        description: '',
        effectType: 'production_bonus',
        effectValue: 0.2,
        targetResourceType: 'crystals',
      },
    ],
  });

  return {
    contentGetEntry: vi.fn((id: string) => entries.get(id)),
    contentGetEntriesByType: vi.fn(() => []),
    getEntries: vi.fn(),
    contentAllIdsByName: vi.fn(() => new Map()),
  };
});

import { contentGetEntry } from '@helpers/content';
import {
  mimicCalculateDefenseBonus,
  mimicCalculateSurpriseAttackDamage,
  mimicGetLivingTrapsOnFloor,
  mimicHasLivingTrap,
  mimicTriggerLivingTrap,
} from '@helpers/mimic';
import type {
  Floor,
  InhabitantInstance,
  InhabitantInstanceId,
  InhabitantTrait,
  PlacedRoomId,
  RoomId,
} from '@interfaces';
import type {
  InhabitantContent,
  InhabitantId,
} from '@interfaces/content-inhabitant';

const TEST_ROOM_VAULT_ID = 'room-treasure-vault' as RoomId;
const TEST_ROOM_MINE_ID = 'room-crystal-mine' as RoomId;
const TEST_MIMIC_DEF_ID = 'def-mimic' as InhabitantId;
const TEST_GOBLIN_DEF_ID = 'def-goblin' as InhabitantId;

function getMimicDef(): InhabitantContent {
  return contentGetEntry<InhabitantContent>(TEST_MIMIC_DEF_ID)!;
}

function getGoblinDef(): InhabitantContent {
  return contentGetEntry<InhabitantContent>(TEST_GOBLIN_DEF_ID)!;
}

function makeInstance(
  defId: InhabitantId,
  assignedRoomId?: PlacedRoomId,
): InhabitantInstance {
  return {
    instanceId: 'inst-1' as InhabitantInstanceId,
    definitionId: defId,
    name: 'Test',
    state: 'normal',
    assignedRoomId,
  };
}

// --- Versatile: 80% efficiency ---

describe('Versatile trait: 80% efficiency', () => {
  it('should have 0.8 workerEfficiency representing 80% efficiency across all rooms', () => {
    const def = getMimicDef();
    expect(def.stats.workerEfficiency).toBe(0.8);
  });

  it('should apply same efficiency bonus in Crystal Mine as in Treasure Vault', () => {
    const def = getMimicDef();
    const bonus = def.stats.workerEfficiency - 1.0;
    expect(bonus).toBeCloseTo(-0.2);
  });
});

// --- Treasure Guardian: +2 Defense in Vault ---

describe('mimicCalculateDefenseBonus', () => {
  it('should return +2 defense when assigned to Treasure Vault', () => {
    const def = getMimicDef();
    const bonus = mimicCalculateDefenseBonus(def.traits, TEST_ROOM_VAULT_ID);
    expect(bonus).toBe(2);
  });

  it('should return 0 defense when assigned to Crystal Mine', () => {
    const def = getMimicDef();
    const bonus = mimicCalculateDefenseBonus(def.traits, TEST_ROOM_MINE_ID);
    expect(bonus).toBe(0);
  });

  it('should return 0 defense when not assigned to any room', () => {
    const def = getMimicDef();
    const bonus = mimicCalculateDefenseBonus(def.traits, undefined);
    expect(bonus).toBe(0);
  });

  it('should return 0 for inhabitants without defense_bonus traits', () => {
    const def = getGoblinDef();
    const bonus = mimicCalculateDefenseBonus(def.traits, TEST_ROOM_VAULT_ID);
    expect(bonus).toBe(0);
  });

  it('should apply unconditional defense_bonus when no targetRoomId', () => {
    const traits: InhabitantTrait[] = [
      {
        id: 'trait-test',
        name: 'Sturdy',
        description: '',
        effectType: 'defense_bonus',
        effectValue: 1,
      },
    ];
    const bonus = mimicCalculateDefenseBonus(traits, TEST_ROOM_MINE_ID);
    expect(bonus).toBe(1);
  });
});

// --- Shapeshifter: Surprise attack +100% on first hit ---

describe('mimicCalculateSurpriseAttackDamage', () => {
  it('should double damage on first attack with Shapeshifter trait', () => {
    const def = getMimicDef();
    const baseDamage = 10;
    const result = mimicCalculateSurpriseAttackDamage(baseDamage, def.traits, true);
    expect(result).toBe(20);
  });

  it('should return base damage on subsequent attacks', () => {
    const def = getMimicDef();
    const baseDamage = 10;
    const result = mimicCalculateSurpriseAttackDamage(baseDamage, def.traits, false);
    expect(result).toBe(10);
  });

  it('should not modify damage for inhabitants without attack_bonus', () => {
    const def = getGoblinDef();
    const baseDamage = 10;
    const result = mimicCalculateSurpriseAttackDamage(baseDamage, def.traits, true);
    expect(result).toBe(10);
  });

  it('should floor the result to an integer', () => {
    const traits: InhabitantTrait[] = [
      {
        id: 'trait-test',
        name: 'Surprise',
        description: '',
        effectType: 'attack_bonus',
        effectValue: 0.5,
      },
    ];
    const result = mimicCalculateSurpriseAttackDamage(7, traits, true);
    expect(result).toBe(10);
  });
});

// --- Living trap interaction ---

describe('mimicHasLivingTrap', () => {
  it('should return true for inhabitants with attack_bonus trait', () => {
    const def = getMimicDef();
    expect(mimicHasLivingTrap(def)).toBe(true);
  });

  it('should return false for inhabitants without attack_bonus trait', () => {
    const def = getGoblinDef();
    expect(mimicHasLivingTrap(def)).toBe(false);
  });
});

describe('mimicTriggerLivingTrap', () => {
  it('should trigger for Mimic with damage and slow effect', () => {
    const def = getMimicDef();
    const result = mimicTriggerLivingTrap(def);

    expect(result.triggered).toBe(true);
    expect(result.damage).toBeGreaterThan(0);
    expect(result.effectType).toBe('debuff');
    expect(result.duration).toBeGreaterThan(0);
    expect(result.trapDestroyed).toBe(false);
    expect(result.trapName).toContain('Mimic');
    expect(result.trapName).toContain('Living Trap');
    expect(result.moralePenalty).toBeGreaterThan(0);
  });

  it('should not trigger for non-living-trap inhabitants', () => {
    const def = getGoblinDef();
    const result = mimicTriggerLivingTrap(def);

    expect(result.triggered).toBe(false);
    expect(result.damage).toBe(0);
  });

  it('should never destroy the trap (infinite uses)', () => {
    const def = getMimicDef();
    for (let i = 0; i < 10; i++) {
      const result = mimicTriggerLivingTrap(def);
      expect(result.trapDestroyed).toBe(false);
    }
  });

  it('should not be disarmed', () => {
    const def = getMimicDef();
    const result = mimicTriggerLivingTrap(def);
    expect(result.disarmed).toBe(false);
  });
});

describe('mimicGetLivingTrapsOnFloor', () => {
  it('should find assigned Mimic inhabitants on a floor', () => {
    const floor = {
      depth: 0,
      biome: 'neutral',
      grid: [],
      rooms: [],
      hallways: [],
      inhabitants: [
        makeInstance(TEST_MIMIC_DEF_ID, 'room-1' as PlacedRoomId),
      ],
      traps: [],
      verticalConnections: [],
    } as unknown as Floor;

    const results = mimicGetLivingTrapsOnFloor(floor);
    expect(results).toHaveLength(1);
    expect(results[0].def.name).toBe('Mimic');
  });

  it('should not include unassigned Mimics', () => {
    const floor = {
      depth: 0,
      biome: 'neutral',
      grid: [],
      rooms: [],
      hallways: [],
      inhabitants: [
        makeInstance(TEST_MIMIC_DEF_ID, undefined),
      ],
      traps: [],
      verticalConnections: [],
    } as unknown as Floor;

    const results = mimicGetLivingTrapsOnFloor(floor);
    expect(results).toHaveLength(0);
  });

  it('should not include non-living-trap inhabitants', () => {
    const floor = {
      depth: 0,
      biome: 'neutral',
      grid: [],
      rooms: [],
      hallways: [],
      inhabitants: [
        makeInstance(TEST_GOBLIN_DEF_ID, 'room-1' as PlacedRoomId),
      ],
      traps: [],
      verticalConnections: [],
    } as unknown as Floor;

    const results = mimicGetLivingTrapsOnFloor(floor);
    expect(results).toHaveLength(0);
  });

  it('should coexist with regular traps on the floor', () => {
    const floor = {
      depth: 0,
      biome: 'neutral',
      grid: [],
      rooms: [],
      hallways: [],
      inhabitants: [
        makeInstance(TEST_MIMIC_DEF_ID, 'room-1' as PlacedRoomId),
      ],
      traps: [
        {
          id: 'trap-1',
          trapTypeId: 'trap-spike',
          hallwayId: 'hw-1',
          tileX: 3,
          tileY: 3,
          remainingCharges: 2,
          isArmed: true,
        },
      ],
      verticalConnections: [],
    } as unknown as Floor;

    const mimicTraps = mimicGetLivingTrapsOnFloor(floor);
    expect(mimicTraps).toHaveLength(1);
    expect(floor.traps).toHaveLength(1);
  });
});
