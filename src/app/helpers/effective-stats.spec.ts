import type {
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  MutationTraitContent,
  MutationTraitId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => ({})),
  updateGamestate: vi.fn(),
}));

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((id: string) => mockContent.get(id)),
}));

const { effectiveStatsCalculate } = await import('@helpers/effective-stats');

function makeDef(overrides: Partial<InhabitantContent> = {}): InhabitantContent {
  return {
    id: 'def-1' as InhabitantId,
    name: 'Test Creature',
    __type: 'inhabitant',
    type: 'beast',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 10,
      attack: 5,
      defense: 3,
      speed: 4,
      workerEfficiency: 1.0,
    },
    inhabitantTraitIds: [],
    traits: [],
    restrictionTags: [],
    rulerBonuses: {},
    rulerFearLevel: 0,
    fearModifier: 0,
    fearPropagationDistance: 1,
    foodConsumptionRate: 0,
    corruptionGeneration: 0,
    ...overrides,
  };
}

function makeInstance(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
  return {
    instanceId: 'inst-1' as InhabitantInstanceId,
    definitionId: 'def-1' as InhabitantId,
    name: 'Test',
    state: 'normal',
    assignedRoomId: undefined,
    ...overrides,
  };
}

function makeTrait(overrides: Partial<MutationTraitContent> = {}): MutationTraitContent {
  return {
    id: 'trait-1' as MutationTraitId,
    name: 'Test Trait',
    __type: 'mutationtrait',
    description: '',
    modifiers: [{ stat: 'attack', bonus: 2 }],
    rarity: 'common',
    ...overrides,
  };
}

describe('effectiveStatsCalculate', () => {
  it('should return base stats when no bonuses', () => {
    const def = makeDef();
    const inst = makeInstance();
    const result = effectiveStatsCalculate(def, inst);
    expect(result).toEqual({
      hp: 10,
      attack: 5,
      defense: 3,
      speed: 4,
      workerEfficiency: 1.0,
    });
  });

  it('should add training bonuses', () => {
    const def = makeDef();
    const inst = makeInstance({ trainingBonuses: { attack: 3, defense: 2 } });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.attack).toBe(8);
    expect(result.defense).toBe(5);
  });

  it('should add instanceStatBonuses', () => {
    const def = makeDef();
    const inst = makeInstance({
      instanceStatBonuses: { hp: 5, attack: 2, speed: 1 },
    });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.hp).toBe(15);
    expect(result.attack).toBe(7);
    expect(result.speed).toBe(5);
  });

  it('should add mutation trait bonuses', () => {
    const trait = makeTrait({ id: 'mt-1' as MutationTraitId, modifiers: [{ stat: 'attack', bonus: 4 }] });
    mockContent.set('mt-1', trait);

    const def = makeDef();
    const inst = makeInstance({ mutationTraitIds: ['mt-1'] });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.attack).toBe(9);

    mockContent.delete('mt-1');
  });

  it('should combine all bonus types', () => {
    const trait = makeTrait({ id: 'mt-2' as MutationTraitId, modifiers: [{ stat: 'hp', bonus: 10 }] });
    mockContent.set('mt-2', trait);

    const def = makeDef();
    const inst = makeInstance({
      trainingBonuses: { attack: 2, defense: 1 },
      instanceStatBonuses: { hp: 3, workerEfficiency: 0.2 },
      mutationTraitIds: ['mt-2'],
    });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.hp).toBe(23); // 10 + 3 + 10
    expect(result.attack).toBe(7); // 5 + 2
    expect(result.defense).toBe(4); // 3 + 1
    expect(result.workerEfficiency).toBe(1.2); // 1.0 + 0.2

    mockContent.delete('mt-2');
  });

  it('should clamp hp to minimum 1', () => {
    const def = makeDef({ stats: { hp: 2, attack: 0, defense: 0, speed: 1, workerEfficiency: 1.0 } });
    const inst = makeInstance({ instanceStatBonuses: { hp: -5 } });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.hp).toBe(1);
  });

  it('should clamp attack to minimum 0', () => {
    const def = makeDef();
    const inst = makeInstance({ instanceStatBonuses: { attack: -20 } });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.attack).toBe(0);
  });

  it('should clamp defense to minimum 0', () => {
    const def = makeDef();
    const inst = makeInstance({ instanceStatBonuses: { defense: -20 } });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.defense).toBe(0);
  });

  it('should clamp speed to minimum 1', () => {
    const def = makeDef();
    const inst = makeInstance({ instanceStatBonuses: { speed: -20 } });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.speed).toBe(1);
  });

  it('should clamp workerEfficiency to minimum 0.1', () => {
    const def = makeDef();
    const inst = makeInstance({ instanceStatBonuses: { workerEfficiency: -5.0 } });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.workerEfficiency).toBe(0.1);
  });

  it('should handle multiple mutation traits', () => {
    const trait1 = makeTrait({ id: 'mt-a' as MutationTraitId, modifiers: [{ stat: 'attack', bonus: 2 }] });
    const trait2 = makeTrait({ id: 'mt-b' as MutationTraitId, modifiers: [{ stat: 'attack', bonus: 4 }] });
    mockContent.set('mt-a', trait1);
    mockContent.set('mt-b', trait2);

    const def = makeDef();
    const inst = makeInstance({ mutationTraitIds: ['mt-a', 'mt-b'] });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.attack).toBe(11); // 5 + 2 + 4

    mockContent.delete('mt-a');
    mockContent.delete('mt-b');
  });

  it('should ignore unknown mutation trait IDs', () => {
    const def = makeDef();
    const inst = makeInstance({ mutationTraitIds: ['nonexistent'] });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.attack).toBe(5);
  });

  it('should handle negative mutation traits', () => {
    const trait = makeTrait({ id: 'mt-neg' as MutationTraitId, modifiers: [{ stat: 'defense', bonus: -2 }], isNegative: true });
    mockContent.set('mt-neg', trait);

    const def = makeDef();
    const inst = makeInstance({ mutationTraitIds: ['mt-neg'] });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.defense).toBe(1); // 3 - 2

    mockContent.delete('mt-neg');
  });

  it('should round workerEfficiency to 2 decimal places', () => {
    const trait = makeTrait({ id: 'mt-eff' as MutationTraitId, modifiers: [{ stat: 'workerEfficiency', bonus: 0.15 }] });
    mockContent.set('mt-eff', trait);

    const def = makeDef();
    const inst = makeInstance({ mutationTraitIds: ['mt-eff'] });
    const result = effectiveStatsCalculate(def, inst);
    expect(result.workerEfficiency).toBe(1.15);

    mockContent.delete('mt-eff');
  });
});
