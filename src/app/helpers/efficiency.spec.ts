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
        effectType: 'production_bonus',
        effectValue: 0.2,
        targetResourceType: 'crystals',
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
        effectType: 'production_bonus',
        effectValue: 0.15,
        targetResourceType: 'food',
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
        effectType: 'defense_bonus',
        effectValue: 0.3,
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
        effectType: 'versatility',
        effectValue: 1.0,
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
        effectType: 'production_bonus',
        effectValue: 0.1,
        targetResourceType: 'all',
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

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(),
}));

import type {
  FloorId,
  InhabitantInstance,
  InhabitantInstanceId,
  InhabitantTrait,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomProduction,
  RoomShapeId,
} from '@interfaces';
import type { InhabitantContent, InhabitantId } from '@interfaces/content-inhabitant';
import {
  efficiencyCalculateInhabitantContribution,
  efficiencyCalculateMatchedInhabitantBonus,
  efficiencyCalculateRoom,
  efficiencyDoesTraitApply,
  efficiencyGetTraits,
  efficiencyTotalBonusForResource,
} from '@helpers/efficiency';
import { gamestate } from '@helpers/state-game';
import { contentGetEntry } from '@helpers/content';

// Helper to get a definition from the mock
function getDef(id: string): InhabitantContent {
  return contentGetEntry<InhabitantContent>(id)!;
}

describe('efficiencyGetTraits', () => {
  it('should return production_bonus traits from a definition', () => {
    const def = getDef('def-goblin');
    const traits = efficiencyGetTraits(def);
    expect(traits).toHaveLength(1);
    expect(traits[0].traitName).toBe('Miner');
    expect(traits[0].effectValue).toBe(0.2);
    expect(traits[0].targetResourceType).toBe('crystals');
  });

  it('should return empty array when no production_bonus traits', () => {
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

  it('should return true when trait targets a resource the room produces', () => {
    const trait: InhabitantTrait = {
      id: 't1',
      name: 'Miner',
      description: '',
      effectType: 'production_bonus',
      effectValue: 0.2,
      targetResourceType: 'crystals',
    };
    expect(efficiencyDoesTraitApply(trait, crystalProduction)).toBe(true);
  });

  it('should return false when trait targets a resource the room does NOT produce', () => {
    const trait: InhabitantTrait = {
      id: 't1',
      name: 'Miner',
      description: '',
      effectType: 'production_bonus',
      effectValue: 0.2,
      targetResourceType: 'crystals',
    };
    expect(efficiencyDoesTraitApply(trait, foodProduction)).toBe(false);
  });

  it('should return true when trait has targetResourceType "all"', () => {
    const trait: InhabitantTrait = {
      id: 't1',
      name: 'Industrious',
      description: '',
      effectType: 'production_bonus',
      effectValue: 0.1,
      targetResourceType: 'all',
    };
    expect(efficiencyDoesTraitApply(trait, crystalProduction)).toBe(true);
    expect(efficiencyDoesTraitApply(trait, foodProduction)).toBe(true);
    expect(efficiencyDoesTraitApply(trait, emptyProduction)).toBe(true);
  });

  it('should return true when trait has no targetResourceType (undefined)', () => {
    const trait: InhabitantTrait = {
      id: 't1',
      name: 'Generic',
      description: '',
      effectType: 'production_bonus',
      effectValue: 0.1,
    };
    expect(efficiencyDoesTraitApply(trait, crystalProduction)).toBe(true);
    expect(efficiencyDoesTraitApply(trait, emptyProduction)).toBe(true);
  });

  it('should return false for empty production when trait targets a specific resource', () => {
    const trait: InhabitantTrait = {
      id: 't1',
      name: 'Farmer',
      description: '',
      effectType: 'production_bonus',
      effectValue: 0.15,
      targetResourceType: 'food',
    };
    expect(efficiencyDoesTraitApply(trait, emptyProduction)).toBe(false);
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
    const result = efficiencyCalculateInhabitantContribution(instance, crystalProduction);
    expect(result).toBeDefined();
    expect(result!.name).toBe('Goblin');
    // workerEfficiency: 1.0 → 0 bonus, Miner trait matches crystals: +0.2
    expect(result!.workerEfficiencyBonus).toBe(0);
    expect(result!.traitBonuses).toHaveLength(1);
    expect(result!.traitBonuses[0].applies).toBe(true);
    expect(result!.traitBonuses[0].bonus).toBe(0.2);
    expect(result!.totalBonus).toBeCloseTo(0.2);
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
    const result = efficiencyCalculateInhabitantContribution(instance, foodProduction);
    expect(result).toBeDefined();
    expect(result!.traitBonuses[0].applies).toBe(false);
    // Only workerEfficiency bonus: 1.0 - 1.0 = 0
    expect(result!.totalBonus).toBeCloseTo(0);
  });

  it('should include workerEfficiency bonus regardless of trait match', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-myconid' as InhabitantId,
      name: 'Myconid',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
    };
    // Myconid in crystal mine: workerEfficiency 1.3 → 0.3, but Farmer targets food → no match
    const result = efficiencyCalculateInhabitantContribution(instance, crystalProduction);
    expect(result).toBeDefined();
    expect(result!.workerEfficiencyBonus).toBeCloseTo(0.3);
    expect(result!.traitBonuses[0].applies).toBe(false);
    expect(result!.totalBonus).toBeCloseTo(0.3);
  });

  it('should return null for unknown definition', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-nonexistent' as InhabitantId,
      name: 'Unknown',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
    };
    const result = efficiencyCalculateInhabitantContribution(instance, crystalProduction);
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
    const result = efficiencyCalculateInhabitantContribution(instance, crystalProduction);
    expect(result).toBeDefined();
    // workerEfficiency 0.7 → -0.3, no production_bonus traits
    expect(result!.workerEfficiencyBonus).toBeCloseTo(-0.3);
    expect(result!.traitBonuses).toHaveLength(0);
    expect(result!.totalBonus).toBeCloseTo(-0.3);
  });

  it('should apply "all" trait to any room', () => {
    const instance: InhabitantInstance = {
      instanceId: 'inst-1' as InhabitantInstanceId,
      definitionId: 'def-allbonus' as InhabitantId,
      name: 'AllBonus Worker',
      state: 'normal',
      assignedRoomId: 'room-1' as PlacedRoomId,
    };
    const resultCrystal = efficiencyCalculateInhabitantContribution(instance, crystalProduction);
    expect(resultCrystal!.traitBonuses[0].applies).toBe(true);
    expect(resultCrystal!.totalBonus).toBeCloseTo(0.1);

    const resultFood = efficiencyCalculateInhabitantContribution(instance, foodProduction);
    expect(resultFood!.traitBonuses[0].applies).toBe(true);
    expect(resultFood!.totalBonus).toBeCloseTo(0.1);
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
    // Goblin in crystal mine: 0 workerEff + 0.2 trait = 0.2
    // totalMultiplier = 1.0 + 0.2 = 1.2
    expect(result.baseEfficiency).toBe(1.0);
    expect(result.inhabitantBonuses).toHaveLength(1);
    expect(result.totalMultiplier).toBeCloseTo(1.2);
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
    // workerEfficiency 1.0 → 0, trait doesn't match → 0
    expect(result.totalMultiplier).toBeCloseTo(1.0);
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
    // Two goblins: (0 + 0.2) * 2 = 0.4
    // totalMultiplier = 1.0 + 0.4 = 1.4
    expect(result.inhabitantBonuses).toHaveLength(2);
    expect(result.totalMultiplier).toBeCloseTo(1.4);
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
    // Goblin: 0 workerEff + 0.2 crystal trait = 0.2
    // Myconid: 0.3 workerEff + 0 food trait (doesn't match crystals) = 0.3
    // Total = 0.5, multiplier = 1.5
    expect(result.totalMultiplier).toBeCloseTo(1.5);
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
    // Goblin in barracks: workerEff 0, Miner trait targets crystals → barracks has no production → no match
    expect(result.inhabitantBonuses).toHaveLength(1);
    expect(result.inhabitantBonuses[0].totalBonus).toBeCloseTo(0);
    expect(result.totalMultiplier).toBeCloseTo(1.0);
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
    // Skeleton: workerEff 0.7 → -0.3, defense_bonus trait not production_bonus → 0
    // totalMultiplier = 1.0 + (-0.3) = 0.7
    expect(result.totalMultiplier).toBeCloseTo(0.7);
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
    const result = efficiencyCalculateMatchedInhabitantBonus(crystalMine, inhabitants);
    // Goblin in crystal mine: 0 workerEff + 0.2 Miner (crystals match) = 0.2
    expect(result.bonus).toBeCloseTo(0.2);
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
    const result = efficiencyCalculateMatchedInhabitantBonus(mushroomGrove, inhabitants);
    expect(result.bonus).toBeCloseTo(0);
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
    const result = efficiencyCalculateMatchedInhabitantBonus(mushroomGrove, inhabitants);
    // Myconid: 0.3 workerEff + 0.15 Farmer (food match) = 0.45
    expect(result.bonus).toBeCloseTo(0.45);
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
    const result = efficiencyCalculateMatchedInhabitantBonus(crystalMine, inhabitants);
    // workerEff 0 + 0.1 (all) = 0.1
    expect(result.bonus).toBeCloseTo(0.1);
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
    // Crystal mine with goblin: multiplier = 1.2, bonus = 0.2
    expect(bonus).toBeCloseTo(0.2);
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
    // Two mines, each with a goblin: 0.2 + 0.2 = 0.4
    expect(bonus).toBeCloseTo(0.4);
  });
});
