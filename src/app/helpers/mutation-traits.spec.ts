import type {
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  MutationTraitContent,
  MutationTraitId,
} from '@interfaces';
import { describe, expect, it, vi } from 'vitest';
import seedrandom from 'seedrandom';

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => ({})),
  updateGamestate: vi.fn(),
}));

const mockTraits: MutationTraitContent[] = [];

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn(() => mockTraits),
}));

const {
  mutationTraitRoll,
  mutationTraitRollNegative,
  mutationTraitApply,
} = await import('@helpers/mutation-traits');

function makeTrait(overrides: Partial<MutationTraitContent> = {}): MutationTraitContent {
  return {
    id: 'mt-test' as MutationTraitId,
    name: 'Test Trait',
    __type: 'mutationtrait',
    description: '',
    modifiers: [{ stat: 'attack', bonus: 2 }],
    rarity: 'common',
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

describe('mutationTraitRoll', () => {
  it('should return a trait from the pool', () => {
    const traitA = makeTrait({ id: 'a' as MutationTraitId, rarity: 'common' });
    const traitB = makeTrait({ id: 'b' as MutationTraitId, rarity: 'uncommon' });
    mockTraits.length = 0;
    mockTraits.push(traitA, traitB);

    const rng = seedrandom('roll');
    const result = mutationTraitRoll(true, [], rng);
    expect(result).toBeDefined();
    expect(['a', 'b']).toContain(result!.id);
  });

  it('should exclude already-owned traits', () => {
    const traitA = makeTrait({ id: 'a' as MutationTraitId, rarity: 'common' });
    const traitB = makeTrait({ id: 'b' as MutationTraitId, rarity: 'common' });
    mockTraits.length = 0;
    mockTraits.push(traitA, traitB);

    const rng = seedrandom('exclude');
    const result = mutationTraitRoll(true, ['a'], rng);
    expect(result).toBeDefined();
    expect(result!.id).toBe('b');
  });

  it('should exclude negative traits when includeNegative is false', () => {
    const traitPos = makeTrait({ id: 'pos' as MutationTraitId, rarity: 'common' });
    const traitNeg = makeTrait({ id: 'neg' as MutationTraitId, rarity: 'common', isNegative: true });
    mockTraits.length = 0;
    mockTraits.push(traitPos, traitNeg);

    for (let i = 0; i < 20; i++) {
      const rng = seedrandom(`no-neg-${i}`);
      const result = mutationTraitRoll(false, [], rng);
      expect(result).toBeDefined();
      expect(result!.id).toBe('pos');
    }
  });

  it('should include negative traits when includeNegative is true', () => {
    const traitNeg = makeTrait({ id: 'neg' as MutationTraitId, rarity: 'common', isNegative: true });
    mockTraits.length = 0;
    mockTraits.push(traitNeg);

    const rng = seedrandom('inc-neg');
    const result = mutationTraitRoll(true, [], rng);
    expect(result).toBeDefined();
    expect(result!.id).toBe('neg');
  });

  it('should return undefined when pool is exhausted', () => {
    const trait = makeTrait({ id: 'only' as MutationTraitId, rarity: 'common' });
    mockTraits.length = 0;
    mockTraits.push(trait);

    const rng = seedrandom('exhausted');
    const result = mutationTraitRoll(true, ['only'], rng);
    expect(result).toBeUndefined();
  });
});

describe('mutationTraitRollNegative', () => {
  it('should return only negative traits', () => {
    const traitPos = makeTrait({ id: 'pos' as MutationTraitId });
    const traitNeg = makeTrait({ id: 'neg' as MutationTraitId, isNegative: true });
    mockTraits.length = 0;
    mockTraits.push(traitPos, traitNeg);

    const rng = seedrandom('neg-only');
    const result = mutationTraitRollNegative([], rng);
    expect(result).toBeDefined();
    expect(result!.id).toBe('neg');
  });

  it('should exclude already-owned traits', () => {
    const traitNeg1 = makeTrait({ id: 'neg1' as MutationTraitId, isNegative: true });
    const traitNeg2 = makeTrait({ id: 'neg2' as MutationTraitId, isNegative: true });
    mockTraits.length = 0;
    mockTraits.push(traitNeg1, traitNeg2);

    const rng = seedrandom('neg-excl');
    const result = mutationTraitRollNegative(['neg1'], rng);
    expect(result).toBeDefined();
    expect(result!.id).toBe('neg2');
  });

  it('should return undefined when no negative traits available', () => {
    const traitPos = makeTrait({ id: 'pos' as MutationTraitId });
    mockTraits.length = 0;
    mockTraits.push(traitPos);

    const rng = seedrandom('no-neg');
    const result = mutationTraitRollNegative([], rng);
    expect(result).toBeUndefined();
  });
});

describe('mutationTraitApply', () => {
  it('should add trait to empty mutationTraitIds', () => {
    const inst = makeInstance();
    const trait = makeTrait({ id: 'mt-1' as MutationTraitId });
    const result = mutationTraitApply(inst, trait);
    expect(result.mutationTraitIds).toEqual(['mt-1']);
    expect(result.mutated).toBe(true);
  });

  it('should append to existing mutationTraitIds', () => {
    const inst = makeInstance({ mutationTraitIds: ['mt-old'] });
    const trait = makeTrait({ id: 'mt-new' as MutationTraitId });
    const result = mutationTraitApply(inst, trait);
    expect(result.mutationTraitIds).toEqual(['mt-old', 'mt-new']);
  });

  it('should not mutate the original instance', () => {
    const inst = makeInstance({ mutationTraitIds: ['mt-old'] });
    const trait = makeTrait({ id: 'mt-new' as MutationTraitId });
    mutationTraitApply(inst, trait);
    expect(inst.mutationTraitIds).toEqual(['mt-old']);
  });
});
