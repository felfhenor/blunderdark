import {
  addReputation,
  getReputation,
  getReputationLevel,
  getReputationLevelLabel,
  resetReputation,
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

describe('getReputationLevel', () => {
  it('should return none for 0 points', () => {
    expect(getReputationLevel(0)).toBe('none');
  });

  it('should return low at 50 points', () => {
    expect(getReputationLevel(50)).toBe('low');
  });

  it('should return low at 149 points', () => {
    expect(getReputationLevel(149)).toBe('low');
  });

  it('should return medium at 150 points', () => {
    expect(getReputationLevel(150)).toBe('medium');
  });

  it('should return high at 350 points', () => {
    expect(getReputationLevel(350)).toBe('high');
  });

  it('should return legendary at 700 points', () => {
    expect(getReputationLevel(700)).toBe('legendary');
  });

  it('should return legendary for very high points', () => {
    expect(getReputationLevel(10000)).toBe('legendary');
  });

  it('should return none for points below low threshold', () => {
    expect(getReputationLevel(49)).toBe('none');
  });
});

describe('getReputation', () => {
  it('should return the correct value for a type', () => {
    const state = { ...freshState(), terror: 100, wealth: 200 };
    expect(getReputation(state, 'terror')).toBe(100);
    expect(getReputation(state, 'wealth')).toBe(200);
    expect(getReputation(state, 'knowledge')).toBe(0);
  });
});

describe('addReputation', () => {
  it('should add points to the specified type', () => {
    const state = freshState();
    const result = addReputation(state, 'terror', 50);
    expect(result.terror).toBe(50);
    expect(result.wealth).toBe(0);
  });

  it('should not mutate the original state', () => {
    const state = freshState();
    addReputation(state, 'terror', 50);
    expect(state.terror).toBe(0);
  });

  it('should handle negative points (reducing reputation)', () => {
    const state = { ...freshState(), terror: 100 };
    const result = addReputation(state, 'terror', -30);
    expect(result.terror).toBe(70);
  });

  it('should floor at 0 when subtracting more than available', () => {
    const state = { ...freshState(), terror: 20 };
    const result = addReputation(state, 'terror', -50);
    expect(result.terror).toBe(0);
  });

  it('should accumulate points across multiple additions', () => {
    let state = freshState();
    state = addReputation(state, 'wealth', 100);
    state = addReputation(state, 'wealth', 200);
    expect(state.wealth).toBe(300);
  });
});

describe('resetReputation', () => {
  it('should return all values at 0', () => {
    const state = resetReputation();
    expect(state.terror).toBe(0);
    expect(state.wealth).toBe(0);
    expect(state.knowledge).toBe(0);
    expect(state.harmony).toBe(0);
    expect(state.chaos).toBe(0);
  });
});

describe('getReputationLevelLabel', () => {
  it('should return human-readable labels', () => {
    expect(getReputationLevelLabel('none')).toBe('None');
    expect(getReputationLevelLabel('low')).toBe('Low');
    expect(getReputationLevelLabel('medium')).toBe('Medium');
    expect(getReputationLevelLabel('high')).toBe('High');
    expect(getReputationLevelLabel('legendary')).toBe('Legendary');
  });
});

describe('serialization', () => {
  it('should survive JSON round-trip', () => {
    let state = freshState();
    state = addReputation(state, 'terror', 500);
    state = addReputation(state, 'knowledge', 200);

    const serialized = JSON.stringify(state);
    const deserialized: ReputationState = JSON.parse(serialized);

    expect(deserialized.terror).toBe(500);
    expect(deserialized.knowledge).toBe(200);
    expect(deserialized.wealth).toBe(0);
  });
});
