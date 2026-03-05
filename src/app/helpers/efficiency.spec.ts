import { describe, expect, it, vi } from 'vitest';

vi.mock('@helpers/content', () => {
  const entries = new Map<string, unknown>();

  entries.set('room-crystal-mine', {
    id: 'room-crystal-mine',
    name: 'Crystal Mine',
    __type: 'room',
    description: '',
    shapeId: 'shape-1' as RoomShapeId,
    cost: {},
    production: { crystals: 1.0 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });
  entries.set('room-mushroom-grove', {
    id: 'room-mushroom-grove',
    name: 'Mushroom Grove',
    __type: 'room',
    description: '',
    shapeId: 'shape-1' as RoomShapeId,
    cost: {},
    production: { food: 0.8 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });
  entries.set('room-barracks', {
    id: 'room-barracks',
    name: 'Barracks',
    __type: 'room',
    description: '',
    shapeId: 'shape-1' as RoomShapeId,
    cost: {},
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
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
        effects: [{ effectType: 'production_multiplier', effectValue: 0.2, targetResourceType: 'crystals' }],
      },
    ],
  });
  entries.set('def-myconid', {
    id: 'def-myconid',
    name: 'Myconid',
    __type: 'inhabitant',
    type: 'fungal',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 25,
      attack: 5,
      defense: 10,
      speed: 8,
      workerEfficiency: 1.3,
    },
    traits: [
      {
        id: 'trait-myconid-farmer',
        name: 'Farmer',
        description: '',
        effects: [{ effectType: 'production_multiplier', effectValue: 0.15, targetResourceType: 'food' }],
      },
    ],
  });
  entries.set('def-skeleton', {
    id: 'def-skeleton',
    name: 'Skeleton',
    __type: 'inhabitant',
    type: 'undead',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 40,
      attack: 12,
      defense: 15,
      speed: 6,
      workerEfficiency: 0.7,
    },
    traits: [
      {
        id: 'trait-skeleton-guardian',
        name: 'Guardian',
        description: '',
        effects: [{ effectType: 'defense_multiplier', effectValue: 0.3 }],
      },
    ],
  });
  entries.set('def-slime', {
    id: 'def-slime',
    name: 'Slime',
    __type: 'inhabitant',
    type: 'ooze',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 15,
      attack: 3,
      defense: 3,
      speed: 5,
      workerEfficiency: 0.6,
    },
    traits: [
      {
        id: 'trait-slime-adaptable',
        name: 'Adaptable',
        description: '',
        effects: [{ effectType: 'worker_efficiency_multiplier', effectValue: 0.1 }],
      },
    ],
  });
  // Inhabitant with an 'all' target resource type trait
  entries.set('def-allbonus', {
    id: 'def-allbonus',
    name: 'AllBonus Worker',
    __type: 'inhabitant',
    type: 'creature',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 20,
      attack: 5,
      defense: 5,
      speed: 10,
      workerEfficiency: 1.0,
    },
    traits: [
      {
        id: 'trait-all-production',
        name: 'Industrious',
        description: '',
        effects: [{ effectType: 'production_multiplier', effectValue: 0.1, targetResourceType: 'all' }],
      },
    ],
  });

  // Equipment trait for testing
  entries.set('eq-trait-research', {
    id: 'eq-trait-research',
    name: 'Shadow Study',
    __type: 'inhabitanttrait',
    description: '',
    effects: [{ effectType: 'production_multiplier', effectValue: 0.2, targetResourceType: 'crystals' }],
    fusionPassChance: 0,
    isFromTraining: false,
  });
  entries.set('eq-trait-all', {
    id: 'eq-trait-all',
    name: 'Harvest Enchantment',
    __type: 'inhabitanttrait',
    description: '',
    effects: [{ effectType: 'production_multiplier', effectValue: 0.1, targetResourceType: 'all' }],
    fusionPassChance: 0,
    isFromTraining: false,
  });

  return {
    contentGetEntry: vi.fn((id: string) => entries.get(id)),
    contentGetEntriesByType: vi.fn(() => []),
    getEntries: vi.fn(),
    contentAllIdsByName: vi.fn(() => new Map()),
  };
});

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(),
}));

import { contentGetEntry } from '@helpers/content';
import {
  efficiencyCalculateInhabitantContribution,
  efficiencyCalculateMatchedInhabitantBonus,
  efficiencyCalculateRoom,
  efficiencyDoesTraitApply,
  efficiencyGetTraits,
  efficiencyTotalBonusForResource,
} from '@helpers/efficiency';
import { gamestate } from '@helpers/state-game';
import type {
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomProduction,
  TraitEffect,
  RoomShapeId,
} from '@interfaces';
import type {
  InhabitantContent,
  InhabitantId,
} from '@interfaces/content-inhabitant';

// Helper to get a definition from the mock
function getDef(id: string): InhabitantContent {
  return contentGetEntry<InhabitantContent>(id)!;
}

describe('efficiencyGetTraits', () => {
  it('should return production_multiplier traits from a definition', () => {
    const def = getDef('def-goblin');
    const traits = efficiencyGetTraits(def);
    expect(traits).toHaveLength(1);
    expect(traits[0].traitName).toBe('Miner');
    expect(traits[0].effectValue).toBe(0.2);
    expect(traits[0].targetResourceType).toBe('crystals');
  });

  it('should return empty array when no production_multiplier traits', () => {
    const def = getDef('def-skeleton');
    const traits = efficiencyGetTraits(def);
    expect(traits).toHaveLength(0);
  });

  it('should return empty for versatility traits', () => {
    const def = getDef('def-slime');
    const traits = efficiencyGetTraits(def);
    expect(traits).toHaveLength(0);
  });

  it('should return trait with "all" targetResourceType', () => {
    const def = getDef('def-allbonus');
    const traits = efficiencyGetTraits(def);
    expect(traits).toHaveLength(1);
    expect(traits[0].targetResourceType).toBe('all');
  });
});

describe('efficiencyDoesTraitApply', () => {
  const crystalProduction: RoomProduction = { crystals: 1.0 };
  const foodProduction: RoomProduction = { food: 0.8 };
  const emptyProduction: RoomProduction = {};

  it('should return true when effect targets a resource the room produces', () => {
    const effect: TraitEffect = { effectType: 'production_multiplier', effectValue: 0.2, targetResourceType: 'crystals' };
    expect(efficiencyDoesTraitApply(effect, crystalProduction)).toBe(true);
  });

  it('should return false when effect targets a resource the room does NOT produce', () => {
    const effect: TraitEffect = { effectType: 'production_multiplier', effectValue: 0.2, targetResourceType: 'crystals' };
    expect(efficiencyDoesTraitApply(effect, foodProduction)).toBe(false);
  });

  it('should return true when effect has targetResourceType "all"', () => {
    const effect: TraitEffect = { effectType: 'production_multiplier', effectValue: 0.1, targetResourceType: 'all' };
    expect(efficiencyDoesTraitApply(effect, crystalProduction)).toBe(true);
    expect(efficiencyDoesTraitApply(effect, foodProduction)).toBe(true);
    expect(efficiencyDoesTraitApply(effect, emptyProduction)).toBe(true);
  });

  it('should return true when effect has no targetResourceType (undefined)', () => {
    const effect: TraitEffect = { effectType: 'production_multiplier', effectValue: 0.1 };
    expect(efficiencyDoesTraitApply(effect, crystalProduction)).toBe(true);
    expect(efficiencyDoesTraitApply(effect, emptyProduction)).toBe(true);
  });

  it('should return false for empty production when effect targets a specific resource', () => {
    const effect: TraitEffect = { effectType: 'production_multiplier', effectValue: 0.15, targetResourceType: 'food' };
    expect(efficiencyDoesTraitApply(effect, emptyProduction)).toBe(false);
  });
});

describe('efficiencyCalculateInhabitantContribution', () => {
  const crystalProduction: RoomProduction = { crystals: 1.0 };
  const foodProduction: RoomProduction = { food: 0.8 };

  it('should calculate contribution for matching trait', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-goblin' as InhabitantId,
      name: 'Goblin',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
    };
    const result = efficiencyCalculateInhabitantContribution(
      instance,
      crystalProduction,
    );
    expect(result).toBeDefined();
    expect(result!.name).toBe('Goblin');
    // workerEfficiency: 1.0, Miner trait matches crystals: +0.2
    expect(result!.workerEfficiencyBonus).toBe(1.0);
    expect(result!.traitBonuses).toHaveLength(1);
    expect(result!.traitBonuses[0].applies).toBe(true);
    expect(result!.traitBonuses[0].bonus).toBe(0.2);
    expect(result!.totalBonus).toBeCloseTo(1.2);
  });

  it('should return 0 trait bonus for non-matching trait', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-goblin' as InhabitantId,
      name: 'Goblin',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
    };
    // Goblin Miner targets crystals, food room doesn't produce crystals
    const result = efficiencyCalculateInhabitantContribution(
      instance,
      foodProduction,
    );
    expect(result).toBeDefined();
    expect(result!.traitBonuses[0].applies).toBe(false);
    // Only workerEfficiency bonus: 1.0
    expect(result!.totalBonus).toBeCloseTo(1.0);
  });

  it('should include workerEfficiency bonus regardless of trait match', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-myconid' as InhabitantId,
      name: 'Myconid',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
    };
    // Myconid in crystal mine: workerEfficiency 1.3, but Farmer targets food → no match
    const result = efficiencyCalculateInhabitantContribution(
      instance,
      crystalProduction,
    );
    expect(result).toBeDefined();
    expect(result!.workerEfficiencyBonus).toBeCloseTo(1.3);
    expect(result!.traitBonuses[0].applies).toBe(false);
    expect(result!.totalBonus).toBeCloseTo(1.3);
  });

  it('should return null for unknown definition', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-nonexistent' as InhabitantId,
      name: 'Unknown',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
    };
    const result = efficiencyCalculateInhabitantContribution(
      instance,
      crystalProduction,
    );
    expect(result).toBeUndefined();
  });

  it('should handle inhabitant with no efficiency traits', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-skeleton' as InhabitantId,
      name: 'Skeleton',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
    };
    const result = efficiencyCalculateInhabitantContribution(
      instance,
      crystalProduction,
    );
    expect(result).toBeDefined();
    // workerEfficiency 0.7, no production_multiplier traits
    expect(result!.workerEfficiencyBonus).toBeCloseTo(0.7);
    expect(result!.traitBonuses).toHaveLength(0);
    expect(result!.totalBonus).toBeCloseTo(0.7);
  });

  it('should apply "all" trait to any room', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-allbonus' as InhabitantId,
      name: 'AllBonus Worker',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
    };
    const resultCrystal = efficiencyCalculateInhabitantContribution(
      instance,
      crystalProduction,
    );
    expect(resultCrystal!.traitBonuses[0].applies).toBe(true);
    expect(resultCrystal!.totalBonus).toBeCloseTo(1.1);

    const resultFood = efficiencyCalculateInhabitantContribution(
      instance,
      foodProduction,
    );
    expect(resultFood!.traitBonuses[0].applies).toBe(true);
    expect(resultFood!.totalBonus).toBeCloseTo(1.1);
  });

  it('should apply production_multiplier from equippedTraitIds matching room resource', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-skeleton' as InhabitantId,
      name: 'Skeleton',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
      equippedTraitIds: ['eq-trait-research'],
    };
    const result = efficiencyCalculateInhabitantContribution(
      instance,
      crystalProduction,
    );
    expect(result).toBeDefined();
    // Skeleton: workerEff 0.7, no def traits, equipment trait +0.2 crystals applies
    expect(result!.traitBonuses).toHaveLength(1);
    expect(result!.traitBonuses[0].applies).toBe(true);
    expect(result!.totalBonus).toBeCloseTo(0.9);
  });

  it('should apply "all" equipped trait production_multiplier to any room', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-skeleton' as InhabitantId,
      name: 'Skeleton',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
      equippedTraitIds: ['eq-trait-all'],
    };
    const result = efficiencyCalculateInhabitantContribution(
      instance,
      foodProduction,
    );
    expect(result).toBeDefined();
    // Skeleton: workerEff 0.7, equipment +0.1 all applies
    expect(result!.totalBonus).toBeCloseTo(0.8);
  });
});

describe('efficiencyCalculateRoom', () => {
  const crystalMine: PlacedRoom = {
    id: 'placed-mine-1' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  const mushroomGrove: PlacedRoom = {
    id: 'placed-grove-1' as PlacedRoomId,
    roomTypeId: 'room-mushroom-grove' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  const barracks: PlacedRoom = {
    id: 'placed-barracks-1' as PlacedRoomId,
    roomTypeId: 'room-barracks' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  it('should return 1.0 multiplier for room with no inhabitants', () => {
    const result = efficiencyCalculateRoom(crystalMine, []);
    expect(result.baseEfficiency).toBe(1.0);
    expect(result.inhabitantBonuses).toHaveLength(0);
    expect(result.totalMultiplier).toBe(1.0);
  });

  it('should return correct multiplier for one matching worker', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
      },
    ];
    const result = efficiencyCalculateRoom(crystalMine, inhabitants);
    // Goblin in crystal mine: 1.0 workerEff + 0.2 trait = 1.2
    // totalMultiplier = 1.0 + 1.2 = 2.2
    expect(result.baseEfficiency).toBe(1.0);
    expect(result.inhabitantBonuses).toHaveLength(1);
    expect(result.totalMultiplier).toBeCloseTo(2.2);
  });

  it('should not apply mismatched trait bonus', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-grove-1' as PlacedRoomId,
      },
    ];
    // Goblin Miner targets crystals, but Mushroom Grove produces food
    const result = efficiencyCalculateRoom(mushroomGrove, inhabitants);
    // workerEfficiency 1.0, trait doesn't match → 0
    expect(result.totalMultiplier).toBeCloseTo(2.0);
  });

  it('should stack bonuses additively for multiple workers', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 2',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
      },
    ];
    const result = efficiencyCalculateRoom(crystalMine, inhabitants);
    // Two goblins: (1.0 + 0.2) * 2 = 2.4
    // totalMultiplier = 1.0 + 2.4 = 3.4
    expect(result.inhabitantBonuses).toHaveLength(2);
    expect(result.totalMultiplier).toBeCloseTo(3.4);
  });

  it('should handle mixed workers with different trait matches', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
      },
      {
        instanceId: 'inst-2' as InhabitantInstanceId,
        definitionId: 'def-myconid' as InhabitantId,
        name: 'Myconid',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
      },
    ];
    const result = efficiencyCalculateRoom(crystalMine, inhabitants);
    // Goblin: 1.0 workerEff + 0.2 crystal trait = 1.2
    // Myconid: 1.3 workerEff + 0 food trait (doesn't match crystals) = 1.3
    // Total = 2.5, multiplier = 3.5
    expect(result.totalMultiplier).toBeCloseTo(3.5);
  });

  it('should ignore inhabitants assigned to other rooms', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'other-room' as PlacedRoomId,
      },
    ];
    const result = efficiencyCalculateRoom(crystalMine, inhabitants);
    expect(result.inhabitantBonuses).toHaveLength(0);
    expect(result.totalMultiplier).toBe(1.0);
  });

  it('should handle room with no production (barracks)', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-barracks-1' as PlacedRoomId,
      },
    ];
    const result = efficiencyCalculateRoom(barracks, inhabitants);
    // Goblin in barracks: workerEff 1.0, Miner trait targets crystals → barracks has no production → no match
    expect(result.inhabitantBonuses).toHaveLength(1);
    expect(result.inhabitantBonuses[0].totalBonus).toBeCloseTo(1.0);
    expect(result.totalMultiplier).toBeCloseTo(2.0);
  });

  it('should handle worker with below-1.0 efficiency and no matching traits', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
      },
    ];
    const result = efficiencyCalculateRoom(crystalMine, inhabitants);
    // Skeleton: workerEff 0.7, defense_multiplier trait not production_multiplier → 0
    // totalMultiplier = 1.0 + 0.7 = 1.7
    expect(result.totalMultiplier).toBeCloseTo(1.7);
  });
});

describe('efficiencyCalculateMatchedInhabitantBonus', () => {
  const crystalMine: PlacedRoom = {
    id: 'placed-mine-1' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  const mushroomGrove: PlacedRoom = {
    id: 'placed-grove-1' as PlacedRoomId,
    roomTypeId: 'room-mushroom-grove' as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
  };

  it('should return 0 bonus and hasWorkers false for empty room', () => {
    const result = efficiencyCalculateMatchedInhabitantBonus(crystalMine, []);
    expect(result.bonus).toBe(0);
    expect(result.hasWorkers).toBe(false);
  });

  it('should apply matching trait bonus', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
      },
    ];
    const result = efficiencyCalculateMatchedInhabitantBonus(
      crystalMine,
      inhabitants,
    );
    // Goblin in crystal mine: 1.0 workerEff + 0.2 Miner (crystals match) = 1.2
    expect(result.bonus).toBeCloseTo(1.2);
    expect(result.hasWorkers).toBe(true);
  });

  it('should not apply mismatched trait bonus', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin',
        state: 'normal',
        assignedRoomId: 'placed-grove-1' as PlacedRoomId,
      },
    ];
    // Goblin Miner targets crystals, grove produces food → no trait bonus
    const result = efficiencyCalculateMatchedInhabitantBonus(
      mushroomGrove,
      inhabitants,
    );
    expect(result.bonus).toBeCloseTo(1.0);
    expect(result.hasWorkers).toBe(true);
  });

  it('should apply matching Myconid trait in food room', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-myconid' as InhabitantId,
        name: 'Myconid',
        state: 'normal',
        assignedRoomId: 'placed-grove-1' as PlacedRoomId,
      },
    ];
    const result = efficiencyCalculateMatchedInhabitantBonus(
      mushroomGrove,
      inhabitants,
    );
    // Myconid: 1.3 workerEff + 0.15 Farmer (food match) = 1.45
    expect(result.bonus).toBeCloseTo(1.45);
    expect(result.hasWorkers).toBe(true);
  });

  it('should apply "all" trait to any room', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-allbonus' as InhabitantId,
        name: 'AllBonus',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
      },
    ];
    const result = efficiencyCalculateMatchedInhabitantBonus(
      crystalMine,
      inhabitants,
    );
    // workerEff 1.0 + 0.1 (all) = 1.1
    expect(result.bonus).toBeCloseTo(1.1);
    expect(result.hasWorkers).toBe(true);
  });

  it('should include equipped trait production_multiplier in matched bonus', () => {
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton',
        state: 'normal',
        assignedRoomId: 'placed-mine-1' as PlacedRoomId,
        equippedTraitIds: ['eq-trait-research'],
      },
    ];
    const result = efficiencyCalculateMatchedInhabitantBonus(
      crystalMine,
      inhabitants,
    );
    // Skeleton: workerEff 0.7 + equipped trait 0.2 (crystals match) = 0.9
    expect(result.bonus).toBeCloseTo(0.9);
    expect(result.hasWorkers).toBe(true);
  });
});

describe('efficiencyTotalBonusForResource', () => {
  it('should sum efficiency bonuses across rooms for a given resource', () => {
    const mockGamestate = vi.mocked(gamestate);
    mockGamestate.mockReturnValue({
      world: {
        floors: [
          {
            id: 'floor-1',
            name: 'Floor 1',
            depth: 1,
            biome: 'neutral',
            grid: { tiles: [] },
            rooms: [
              {
                id: 'placed-mine-1',
                roomTypeId: 'room-crystal-mine' as RoomId,
                shapeId: 'shape-1' as RoomShapeId,
                anchorX: 0,
                anchorY: 0,
              },
            ],
            hallways: [],
            inhabitants: [
              {
                instanceId: 'inst-1' as InhabitantInstanceId,
                definitionId: 'def-goblin' as InhabitantId,
                name: 'Goblin',
                state: 'normal',
                assignedRoomId: 'placed-mine-1' as PlacedRoomId,
              },
            ],
            connections: [],
          },
        ],
      },
    } as unknown as ReturnType<typeof gamestate>);

    const bonus = efficiencyTotalBonusForResource('crystals');
    // Crystal mine with goblin: multiplier = 2.2, bonus = 1.2
    expect(bonus).toBeCloseTo(1.2);
  });

  it('should return 0 when no rooms produce the given resource', () => {
    const mockGamestate = vi.mocked(gamestate);
    mockGamestate.mockReturnValue({
      world: {
        floors: [
          {
            id: 'floor-1',
            name: 'Floor 1',
            depth: 1,
            biome: 'neutral',
            grid: { tiles: [] },
            rooms: [
              {
                id: 'placed-mine-1',
                roomTypeId: 'room-crystal-mine' as RoomId,
                shapeId: 'shape-1' as RoomShapeId,
                anchorX: 0,
                anchorY: 0,
              },
            ],
            hallways: [],
            inhabitants: [],
            connections: [],
          },
        ],
      },
    } as unknown as ReturnType<typeof gamestate>);

    // Crystal mine produces crystals, not food
    const bonus = efficiencyTotalBonusForResource('food');
    expect(bonus).toBe(0);
  });

  it('should aggregate across multiple rooms and floors', () => {
    const mockGamestate = vi.mocked(gamestate);
    mockGamestate.mockReturnValue({
      world: {
        floors: [
          {
            id: 'floor-1',
            name: 'Floor 1',
            depth: 1,
            biome: 'neutral',
            grid: { tiles: [] },
            rooms: [
              {
                id: 'placed-mine-1',
                roomTypeId: 'room-crystal-mine' as RoomId,
                shapeId: 'shape-1' as RoomShapeId,
                anchorX: 0,
                anchorY: 0,
              },
              {
                id: 'placed-mine-2',
                roomTypeId: 'room-crystal-mine' as RoomId,
                shapeId: 'shape-1' as RoomShapeId,
                anchorX: 4,
                anchorY: 0,
              },
            ],
            hallways: [],
            inhabitants: [
              {
                instanceId: 'inst-1' as InhabitantInstanceId,
                definitionId: 'def-goblin' as InhabitantId,
                name: 'Goblin 1',
                state: 'normal',
                assignedRoomId: 'placed-mine-1' as PlacedRoomId,
              },
              {
                instanceId: 'inst-2' as InhabitantInstanceId,
                definitionId: 'def-goblin' as InhabitantId,
                name: 'Goblin 2',
                state: 'normal',
                assignedRoomId: 'placed-mine-2',
              },
            ],
            connections: [],
          },
        ],
      },
    } as unknown as ReturnType<typeof gamestate>);

    const bonus = efficiencyTotalBonusForResource('crystals');
    // Two mines, each with a goblin: 1.2 + 1.2 = 2.4
    expect(bonus).toBeCloseTo(2.4);
  });
});
