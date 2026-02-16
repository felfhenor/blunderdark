import {
  reputationEffectGetActive,
  reputationEffectGetByType,
  reputationEffectGetInvasionRateMultiplier,
  reputationEffectGetProductionMultiplier,
  reputationEffectHas,
} from '@helpers/reputation-effects';
import type {
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
): ReputationEffectContent {
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
  } as ReputationEffectContent;
}

const terrorInvasionEffect = makeEffect({
  name: 'Terror - Increased Invasions',
  reputationType: 'terror',
  minimumLevel: 'high',
  effectType: 'modify_invasion_rate',
  effectValue: 1.25,
});

const terrorDarkInvasions = makeEffect({
  name: 'Terror - Dark Invasions',
  reputationType: 'terror',
  minimumLevel: 'high',
  effectType: 'modify_event_rate',
  effectValue: 1,
});

const terrorUnlockTortureChamber = makeEffect({
  name: 'Terror - Unlock Torture Chamber',
  reputationType: 'terror',
  minimumLevel: 'high',
  effectType: 'unlock_room',
  effectValue: 1,
  targetId: 'Torture Chamber',
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

const harmonyPeacefulCreatures = makeEffect({
  name: 'Harmony - Peaceful Creatures',
  reputationType: 'harmony',
  minimumLevel: 'high',
  effectType: 'attract_creature',
  effectValue: 1,
});

const harmonyUniqueCreatures = makeEffect({
  name: 'Harmony - Unique Peaceful Creatures',
  reputationType: 'harmony',
  minimumLevel: 'legendary',
  effectType: 'attract_creature',
  effectValue: 2,
});

const wealthThiefRaids = makeEffect({
  name: 'Wealth - Thief Raids',
  reputationType: 'wealth',
  minimumLevel: 'high',
  effectType: 'modify_event_rate',
  effectValue: 1,
});

const wealthVaultUpgrades = makeEffect({
  name: 'Wealth - Treasure Vault Upgrades',
  reputationType: 'wealth',
  minimumLevel: 'high',
  effectType: 'unlock_room',
  effectValue: 1,
  targetId: 'Treasure Vault',
});

const wealthGoldBonus = makeEffect({
  name: 'Wealth - Gold Production Bonus',
  reputationType: 'wealth',
  minimumLevel: 'legendary',
  effectType: 'modify_production',
  effectValue: 1.1,
  targetId: 'gold',
});

const knowledgeAdvancedResearch = makeEffect({
  name: 'Knowledge - Advanced Research',
  reputationType: 'knowledge',
  minimumLevel: 'high',
  effectType: 'modify_event_rate',
  effectValue: 1,
});

const knowledgeResearchSpeed = makeEffect({
  name: 'Knowledge - Research Speed Bonus',
  reputationType: 'knowledge',
  minimumLevel: 'high',
  effectType: 'modify_production',
  effectValue: 0.85,
  targetId: 'research_speed',
});

const knowledgeForbidden = makeEffect({
  name: 'Knowledge - Forbidden Knowledge',
  reputationType: 'knowledge',
  minimumLevel: 'legendary',
  effectType: 'modify_event_rate',
  effectValue: 1,
});

const chaosRandomEvents = makeEffect({
  name: 'Chaos - Increased Random Events',
  reputationType: 'chaos',
  minimumLevel: 'high',
  effectType: 'modify_event_rate',
  effectValue: 1.5,
});

const chaosDoubleOrNothing = makeEffect({
  name: 'Chaos - Double or Nothing',
  reputationType: 'chaos',
  minimumLevel: 'high',
  effectType: 'modify_event_rate',
  effectValue: 0.2,
});

const chaosSurges = makeEffect({
  name: 'Chaos - Chaos Surges',
  reputationType: 'chaos',
  minimumLevel: 'legendary',
  effectType: 'modify_event_rate',
  effectValue: 1,
});

const allEffects = [
  terrorInvasionEffect,
  terrorDarkInvasions,
  terrorUnlockTortureChamber,
  terrorLegendaryInvasionEffect,
  harmonyReducedInvasions,
  harmonyLegendaryInvasions,
  harmonyPeacefulCreatures,
  harmonyUniqueCreatures,
  wealthThiefRaids,
  wealthVaultUpgrades,
  wealthGoldBonus,
  knowledgeAdvancedResearch,
  knowledgeResearchSpeed,
  knowledgeForbidden,
  chaosRandomEvents,
  chaosDoubleOrNothing,
  chaosSurges,
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
    const terrorEffects = active.filter(
      (e) => e.reputationType === 'terror',
    );
    expect(terrorEffects).toHaveLength(3); // invasion, dark, unlock
  });

  it('should activate legendary effects at legendary level', () => {
    const state = { ...freshState(), terror: 700 }; // legendary
    const active = reputationEffectGetActive(state, allEffects);
    const terrorEffects = active.filter(
      (e) => e.reputationType === 'terror',
    );
    expect(terrorEffects).toHaveLength(4); // 3 high + 1 legendary
  });

  it('should activate effects from multiple reputation types', () => {
    const state = { ...freshState(), terror: 350, harmony: 350 };
    const active = reputationEffectGetActive(state, allEffects);
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
    expect(harmonyEffects).toHaveLength(4); // 2 high + 2 legendary
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
    };
    const invasionEffects = reputationEffectGetByType(
      'modify_invasion_rate',
      state,
      allEffects,
    );
    expect(invasionEffects).toHaveLength(2);
    expect(
      invasionEffects.every(
        (e) => e.effectType === 'modify_invasion_rate',
      ),
    ).toBe(true);
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
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(0.5);
  });

  it('should combine terror and harmony multipliers', () => {
    const state = { ...freshState(), terror: 350, harmony: 350 };
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

// --- Terror threshold tests (US-003) ---
describe('Terror effects thresholds', () => {
  it('should activate invasion increase at High Terror (350)', () => {
    const state = { ...freshState(), terror: 350 };
    expect(
      reputationEffectHas('Terror - Increased Invasions', state, allEffects),
    ).toBe(true);
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(1.25);
  });

  it('should activate dark invasions at High Terror', () => {
    const state = { ...freshState(), terror: 350 };
    expect(
      reputationEffectHas('Terror - Dark Invasions', state, allEffects),
    ).toBe(true);
  });

  it('should unlock Torture Chamber at High Terror', () => {
    const state = { ...freshState(), terror: 350 };
    const unlocks = reputationEffectGetByType('unlock_room', state, allEffects);
    expect(unlocks.some((e) => e.targetId === 'Torture Chamber')).toBe(true);
  });

  it('should double dark invasion frequency at Legendary Terror (700)', () => {
    const state = { ...freshState(), terror: 700 };
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(2.0);
  });

  it('should remove Terror effects when Terror drops below High', () => {
    const state = { ...freshState(), terror: 349 };
    expect(
      reputationEffectHas('Terror - Increased Invasions', state, allEffects),
    ).toBe(false);
    expect(
      reputationEffectHas('Terror - Dark Invasions', state, allEffects),
    ).toBe(false);
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(1.0);
  });
});

// --- Wealth threshold tests (US-004) ---
describe('Wealth effects thresholds', () => {
  it('should activate thief raids at High Wealth (350)', () => {
    const state = { ...freshState(), wealth: 350 };
    expect(
      reputationEffectHas('Wealth - Thief Raids', state, allEffects),
    ).toBe(true);
  });

  it('should unlock Treasure Vault upgrades at High Wealth', () => {
    const state = { ...freshState(), wealth: 350 };
    const unlocks = reputationEffectGetByType('unlock_room', state, allEffects);
    expect(unlocks.some((e) => e.targetId === 'Treasure Vault')).toBe(true);
  });

  it('should grant +10% gold production at Legendary Wealth (700)', () => {
    const state = { ...freshState(), wealth: 700 };
    expect(
      reputationEffectGetProductionMultiplier('gold', state, allEffects),
    ).toBeCloseTo(1.1);
  });

  it('should remove Wealth effects when Wealth drops below High', () => {
    const state = { ...freshState(), wealth: 349 };
    expect(
      reputationEffectHas('Wealth - Thief Raids', state, allEffects),
    ).toBe(false);
    expect(
      reputationEffectGetProductionMultiplier('gold', state, allEffects),
    ).toBe(1.0);
  });
});

// --- Knowledge threshold tests (US-005) ---
describe('Knowledge effects thresholds', () => {
  it('should unlock advanced research at High Knowledge (350)', () => {
    const state = { ...freshState(), knowledge: 350 };
    expect(
      reputationEffectHas('Knowledge - Advanced Research', state, allEffects),
    ).toBe(true);
  });

  it('should increase research speed by 15% at High Knowledge', () => {
    const state = { ...freshState(), knowledge: 350 };
    expect(
      reputationEffectGetProductionMultiplier('research_speed', state, allEffects),
    ).toBeCloseTo(0.85);
  });

  it('should unlock forbidden knowledge at Legendary Knowledge (700)', () => {
    const state = { ...freshState(), knowledge: 700 };
    expect(
      reputationEffectHas('Knowledge - Forbidden Knowledge', state, allEffects),
    ).toBe(true);
  });

  it('should remove Knowledge effects when Knowledge drops below High', () => {
    const state = { ...freshState(), knowledge: 349 };
    expect(
      reputationEffectHas('Knowledge - Advanced Research', state, allEffects),
    ).toBe(false);
    expect(
      reputationEffectGetProductionMultiplier('research_speed', state, allEffects),
    ).toBe(1.0);
  });
});

// --- Harmony threshold tests (US-006) ---
describe('Harmony effects thresholds', () => {
  it('should reduce invasions by 30% at High Harmony (350)', () => {
    const state = { ...freshState(), harmony: 350 };
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBeCloseTo(0.7);
  });

  it('should attract peaceful creatures at High Harmony', () => {
    const state = { ...freshState(), harmony: 350 };
    const creatures = reputationEffectGetByType('attract_creature', state, allEffects);
    expect(creatures).toHaveLength(1);
  });

  it('should reduce invasions by 50% at Legendary Harmony (700)', () => {
    const state = { ...freshState(), harmony: 700 };
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(0.5);
  });

  it('should attract unique peaceful creatures at Legendary Harmony', () => {
    const state = { ...freshState(), harmony: 700 };
    const creatures = reputationEffectGetByType('attract_creature', state, allEffects);
    expect(creatures).toHaveLength(2);
    expect(creatures.some((e) => e.effectValue === 2)).toBe(true);
  });

  it('should remove Harmony effects when Harmony drops below High', () => {
    const state = { ...freshState(), harmony: 349 };
    expect(
      reputationEffectGetInvasionRateMultiplier(state, allEffects),
    ).toBe(1.0);
    const creatures = reputationEffectGetByType('attract_creature', state, allEffects);
    expect(creatures).toHaveLength(0);
  });
});

// --- Chaos threshold tests (US-007) ---
describe('Chaos effects thresholds', () => {
  it('should increase random events by 50% at High Chaos (350)', () => {
    const state = { ...freshState(), chaos: 350 };
    expect(
      reputationEffectHas('Chaos - Increased Random Events', state, allEffects),
    ).toBe(true);
  });

  it('should enable double reward/penalty chance at High Chaos', () => {
    const state = { ...freshState(), chaos: 350 };
    expect(
      reputationEffectHas('Chaos - Double or Nothing', state, allEffects),
    ).toBe(true);
  });

  it('should enable chaos surges at Legendary Chaos (700)', () => {
    const state = { ...freshState(), chaos: 700 };
    expect(
      reputationEffectHas('Chaos - Chaos Surges', state, allEffects),
    ).toBe(true);
  });

  it('should remove Chaos effects when Chaos drops below High', () => {
    const state = { ...freshState(), chaos: 349 };
    expect(
      reputationEffectHas('Chaos - Increased Random Events', state, allEffects),
    ).toBe(false);
    expect(
      reputationEffectHas('Chaos - Double or Nothing', state, allEffects),
    ).toBe(false);
  });
});
