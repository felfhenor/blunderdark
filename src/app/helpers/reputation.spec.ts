import {
  reputationAdd,
  reputationGet,
  reputationGetAction,
  reputationGetLevel,
  reputationGetLevelLabel,
  reputationAward$,
  reputationLevelUp$,
  reputationReset,
} from '@helpers/reputation';
import type { ReputationState } from '@interfaces';
import { describe, expect, it } from 'vitest';

function freshState(): ReputationState {
  return {
    terror: 0,
    wealth: 0,
    knowledge: 0,
    harmony: 0,
    chaos: 0,
  };
}

describe('reputationGetLevel', () => {
  it('should return none for 0 points', () => {
    expect(reputationGetLevel(0)).toBe('none');
  });

  it('should return low at 50 points', () => {
    expect(reputationGetLevel(50)).toBe('low');
  });

  it('should return low at 149 points', () => {
    expect(reputationGetLevel(149)).toBe('low');
  });

  it('should return medium at 150 points', () => {
    expect(reputationGetLevel(150)).toBe('medium');
  });

  it('should return high at 350 points', () => {
    expect(reputationGetLevel(350)).toBe('high');
  });

  it('should return legendary at 700 points', () => {
    expect(reputationGetLevel(700)).toBe('legendary');
  });

  it('should return legendary for very high points', () => {
    expect(reputationGetLevel(10000)).toBe('legendary');
  });

  it('should return none for points below low threshold', () => {
    expect(reputationGetLevel(49)).toBe('none');
  });
});

describe('reputationGet', () => {
  it('should return the correct value for a type', () => {
    const state = { ...freshState(), terror: 100, wealth: 200 };
    expect(reputationGet(state, 'terror')).toBe(100);
    expect(reputationGet(state, 'wealth')).toBe(200);
    expect(reputationGet(state, 'knowledge')).toBe(0);
  });
});

describe('reputationAdd', () => {
  it('should add points to the specified type', () => {
    const state = freshState();
    const result = reputationAdd(state, 'terror', 50);
    expect(result.terror).toBe(50);
    expect(result.wealth).toBe(0);
  });

  it('should not mutate the original state', () => {
    const state = freshState();
    reputationAdd(state, 'terror', 50);
    expect(state.terror).toBe(0);
  });

  it('should handle negative points (reducing reputation)', () => {
    const state = { ...freshState(), terror: 100 };
    const result = reputationAdd(state, 'terror', -30);
    expect(result.terror).toBe(70);
  });

  it('should floor at 0 when subtracting more than available', () => {
    const state = { ...freshState(), terror: 20 };
    const result = reputationAdd(state, 'terror', -50);
    expect(result.terror).toBe(0);
  });

  it('should accumulate points across multiple additions', () => {
    let state = freshState();
    state = reputationAdd(state, 'wealth', 100);
    state = reputationAdd(state, 'wealth', 200);
    expect(state.wealth).toBe(300);
  });
});

describe('reputationReset', () => {
  it('should return all values at 0', () => {
    const state = reputationReset();
    expect(state.terror).toBe(0);
    expect(state.wealth).toBe(0);
    expect(state.knowledge).toBe(0);
    expect(state.harmony).toBe(0);
    expect(state.chaos).toBe(0);
  });
});

describe('reputationGetLevelLabel', () => {
  it('should return human-readable labels', () => {
    expect(reputationGetLevelLabel('none')).toBe('None');
    expect(reputationGetLevelLabel('low')).toBe('Low');
    expect(reputationGetLevelLabel('medium')).toBe('Medium');
    expect(reputationGetLevelLabel('high')).toBe('High');
    expect(reputationGetLevelLabel('legendary')).toBe('Legendary');
  });
});

describe('serialization', () => {
  it('should survive JSON round-trip', () => {
    let state = freshState();
    state = reputationAdd(state, 'terror', 500);
    state = reputationAdd(state, 'knowledge', 200);

    const serialized = JSON.stringify(state);
    const deserialized: ReputationState = JSON.parse(serialized);

    expect(deserialized.terror).toBe(500);
    expect(deserialized.knowledge).toBe(200);
    expect(deserialized.wealth).toBe(0);
  });
});

describe('level-up detection', () => {
  it('should detect none to low transition at 50 points', () => {
    const previousLevel = reputationGetLevel(0);
    const newLevel = reputationGetLevel(50);
    expect(previousLevel).toBe('none');
    expect(newLevel).toBe('low');
    expect(previousLevel !== newLevel).toBe(true);
  });

  it('should detect low to medium transition at 150 points', () => {
    const previousLevel = reputationGetLevel(100);
    const newLevel = reputationGetLevel(150);
    expect(previousLevel).toBe('low');
    expect(newLevel).toBe('medium');
    expect(previousLevel !== newLevel).toBe(true);
  });

  it('should not trigger level-up within same tier', () => {
    const previousLevel = reputationGetLevel(100);
    const newLevel = reputationGetLevel(140);
    expect(previousLevel).toBe('low');
    expect(newLevel).toBe('low');
    expect(previousLevel === newLevel).toBe(true);
  });

  it('should detect multi-tier jump from none to medium', () => {
    const previousLevel = reputationGetLevel(0);
    const newLevel = reputationGetLevel(200);
    expect(previousLevel).toBe('none');
    expect(newLevel).toBe('medium');
  });
});

describe('reputation observables', () => {
  it('should export reputationAward$ observable', () => {
    expect(reputationAward$).toBeDefined();
    expect(typeof reputationAward$.subscribe).toBe('function');
  });

  it('should export reputationLevelUp$ observable', () => {
    expect(reputationLevelUp$).toBeDefined();
    expect(typeof reputationLevelUp$.subscribe).toBe('function');
  });
});

describe('reputationGetAction', () => {
  it('should return undefined for non-existent action', () => {
    // Content not loaded in test environment
    expect(reputationGetAction('nonexistent-action')).toBeUndefined();
  });
});
