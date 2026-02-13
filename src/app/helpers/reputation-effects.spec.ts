import {
  reputationEffectGetActive,
  reputationEffectGetByType,
  reputationEffectGetInvasionRateMultiplier,
  reputationEffectGetProductionMultiplier,
  reputationEffectHas,
} from '@helpers/reputation-effects';
import type {
  IsContentItem,
  ReputationEffectContent,
  ReputationState,
} from '@interfaces';
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

function makeEffect(
  overrides: Partial<ReputationEffectContent>,
): ReputationEffectContent & IsContentItem {
  return {
    id: 'test-effect-id',
    name: 'Test Effect',
    __type: 'reputationeffect',
    description: 'A test effect',
    reputationType: 'terror',
    minimumLevel: 'high',
    effectType: 'modify_production',
    effectValue: 1.0,
    targetId: undefined,
    ...overrides,
  } as ReputationEffectContent & IsContentItem;
}

const terrorInvasionEffect = makeEffect({
  name: 'Terror - Increased Invasions',
  reputationType: 'terror',
  minimumLevel: 'high',
  effectType: 'modify_invasion_rate',
  effectValue: 1.25,
});

const terrorLegendaryInvasionEffect = makeEffect({
  name: 'Terror - Legendary Dark Invasions',
  reputationType: 'terror',
  minimumLevel: 'legendary',
  effectType: 'modify_invasion_rate',
  effectValue: 2.0,
});

const harmonyReducedInvasions = makeEffect({
  name: 'Harmony - Reduced Invasions',
  reputationType: 'harmony',
  minimumLevel: 'high',
  effectType: 'modify_invasion_rate',
  effectValue: 0.7,
});

const harmonyLegendaryInvasions = makeEffect({
  name: 'Harmony - Legendary Invasion Reduction',
  reputationType: 'harmony',
  minimumLevel: 'legendary',
  effectType: 'modify_invasion_rate',
  effectValue: 0.5,
});

const wealthGoldBonus = makeEffect({
  name: 'Wealth - Gold Production Bonus',
  reputationType: 'wealth',
  minimumLevel: 'legendary',
  effectType: 'modify_production',
  effectValue: 1.1,
  targetId: 'gold',
});

const knowledgeResearchSpeed = makeEffect({
  name: 'Knowledge - Research Speed Bonus',
  reputationType: 'knowledge',
  minimumLevel: 'high',
  effectType: 'modify_production',
  effectValue: 0.85,
  targetId: 'research_speed',
});

const chaosRandomEvents = makeEffect({
  name: 'Chaos - Increased Random Events',
  reputationType: 'chaos',
  minimumLevel: 'high',
  effectType: 'modify_event_rate',
  effectValue: 1.5,
});

const allEffects = [
  terrorInvasionEffect,
  terrorLegendaryInvasionEffect,
  harmonyReducedInvasions,
  harmonyLegendaryInvasions,
  wealthGoldBonus,
  knowledgeResearchSpeed,
  chaosRandomEvents,
];

describe('reputationEffectGetActive', () => {
  it('should return no effects when all reputation is zero', () => {
    const state = freshState();
    const active = reputationEffectGetActive(state, allEffects);
    expect(active).toHaveLength(0);
  });

  it('should activate effects when reputation meets minimum level', () => {
    const state = { ...freshState(), terror: 350 }; // high
    const active = reputationEffectGetActive(state, allEffects);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('Terror - Increased Invasions');
  });

  it('should activate legendary effects at legendary level', () => {
    const state = { ...freshState(), terror: 700 }; // legendary
    const active = reputationEffectGetActive(state, allEffects);
    const terrorEffects = active.filter(
      (e) => e.reputationType === 'terror',
    );
    expect(terrorEffects).toHaveLength(2);
  });

  it('should activate effects from multiple reputation types', () => {
    const state = { ...freshState(), terror: 350, harmony: 350 };
    const active = reputationEffectGetActive(state, allEffects);
    expect(active).toHaveLength(2);
    expect(active.map((e) => e.reputationType)).toContain('terror');
    expect(active.map((e) => e.reputationType)).toContain('harmony');
  });

  it('should deactivate effects when reputation drops below threshold', () => {
    const state = { ...freshState(), terror: 349 }; // just below high
    const active = reputationEffectGetActive(state, allEffects);
    const terrorEffects = active.filter(
      (e) => e.reputationType === 'terror',
    );
    expect(terrorEffects).toHaveLength(0);
  });

  it('should activate high effects at legendary level', () => {
    const state = { ...freshState(), harmony: 700 }; // legendary
    const active = reputationEffectGetActive(state, allEffects);
    const harmonyEffects = active.filter(
      (e) => e.reputationType === 'harmony',
    );
    // Both high and legendary effects should be active
    expect(harmonyEffects).toHaveLength(2);
  });
});

describe('reputationEffectHas', () => {
  it('should return true for an active effect', () => {
    const state = { ...freshState(), terror: 350 };
    expect(
      reputationEffectHas(
        'Terror - Increased Invasions',
        state,
        allEffects,
      ),
    ).toBe(true);
  });

  it('should return false for an inactive effect', () => {
    const state = freshState();
    expect(
      reputationEffectHas(
        'Terror - Increased Invasions',
        state,
        allEffects,
      ),
    ).toBe(false);
  });

  it('should return false for a non-existent effect', () => {
    const state = { ...freshState(), terror: 700 };
    expect(
      reputationEffectHas('Non Existent Effect', state, allEffects),
    ).toBe(false);
  });
});

describe('reputationEffectGetByType', () => {
  it('should filter effects by type', () => {
    const state = {
      ...freshState(),
      terror: 350,
      harmony: 350,
      chaos: 350,
    };
    const invasionEffects = reputationEffectGetByType(
      'modify_invasion_rate',
      state,
      allEffects,
    );
    expect(invasionEffects).toHaveLength(2);
    expect(invasionEffects.every((e) => e.effectType === 'modify_invasion_rate')).toBe(true);
  });

  it('should return empty array when no effects of that type are active', () => {
    const state = freshState();
    const effects = reputationEffectGetByType(
      'modify_invasion_rate',
      state,
      allEffects,
    );
    expect(effects).toHaveLength(0);
  });
});

describe('reputationEffectGetInvasionRateMultiplier', () => {
  it('should return 1.0 when no effects active', () => {
    const state = freshState();
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(1.0);
  });

  it('should return terror multiplier when terror is high', () => {
    const state = { ...freshState(), terror: 350 };
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(1.25);
  });

  it('should use strongest terror multiplier at legendary', () => {
    const state = { ...freshState(), terror: 700 };
    // Legendary terror: takes max of 1.25 and 2.0 = 2.0
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(2.0);
  });

  it('should return harmony multiplier when harmony is high', () => {
    const state = { ...freshState(), harmony: 350 };
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBeCloseTo(0.7);
  });

  it('should use strongest harmony multiplier at legendary', () => {
    const state = { ...freshState(), harmony: 700 };
    // Legendary harmony: takes min of 0.7 and 0.5 = 0.5
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(0.5);
  });

  it('should combine terror and harmony multipliers', () => {
    const state = { ...freshState(), terror: 350, harmony: 350 };
    // Terror 1.25 * Harmony 0.7 = 0.875
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBeCloseTo(0.875);
  });
});

describe('reputationEffectGetProductionMultiplier', () => {
  it('should return 1.0 when no effects active', () => {
    const state = freshState();
    expect(
      reputationEffectGetProductionMultiplier('gold', state, allEffects),
    ).toBe(1.0);
  });

  it('should return gold multiplier at legendary wealth', () => {
    const state = { ...freshState(), wealth: 700 };
    expect(
      reputationEffectGetProductionMultiplier('gold', state, allEffects),
    ).toBeCloseTo(1.1);
  });

  it('should return 1.0 for non-matching resource type', () => {
    const state = { ...freshState(), wealth: 700 };
    expect(
      reputationEffectGetProductionMultiplier(
        'crystals',
        state,
        allEffects,
      ),
    ).toBe(1.0);
  });

  it('should return research speed multiplier at high knowledge', () => {
    const state = { ...freshState(), knowledge: 350 };
    expect(
      reputationEffectGetProductionMultiplier(
        'research_speed',
        state,
        allEffects,
      ),
    ).toBeCloseTo(0.85);
  });
});
