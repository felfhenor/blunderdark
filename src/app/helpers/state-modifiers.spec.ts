import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  InhabitantState,
  StateModifier,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

const mockEntries = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockEntries.get(id) ?? undefined,
}));

import {
  STATE_MODIFIER_FEAR_TOLERANCE_DEFAULT,
  stateModifierCalculatePerCreatureProduction,
  stateModifierGetAttackMultiplier,
  stateModifierGetDefenseMultiplier,
  stateModifierGetFearTolerance,
  stateModifierGetFoodConsumptionMultiplier,
  stateModifierGetProductionMultiplier,
  stateModifierGet,
  stateModifierIsInhabitantScared,
} from '@helpers/state-modifiers';

function makeInhabitant(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
  return {
    instanceId: 'inst-1' as InhabitantInstanceId,
    definitionId: 'goblin' as InhabitantId as InhabitantId,
    name: 'Goblin Worker',
    state: 'normal' as InhabitantState,
    assignedRoomId: undefined,
    ...overrides,
  };
}

function registerDef(
  id: string,
  overrides: Partial<InhabitantContent> = {},
): void {
  mockEntries.set(id, {
    __id: id,
    id,
    name: 'Test Creature',
    type: 'creature',
    tier: 1,
    description: '',
    cost: {},
    stats: { hp: 30, attack: 10, defense: 8, speed: 12, workerEfficiency: 1.0 },
    traits: [],
    restrictionTags: [],
    rulerBonuses: {},
    rulerFearLevel: 0,
    ...overrides,
  });
}

beforeEach(() => {
  mockEntries.clear();
});

// --- stateModifierIsInhabitantScared ---

describe('stateModifierIsInhabitantScared', () => {
  it('should return true when room fear exceeds tolerance', () => {
    registerDef('goblin', { fearTolerance: 1 });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId });
    expect(stateModifierIsInhabitantScared(inhabitant, 2)).toBe(true);
  });

  it('should return false when room fear equals tolerance', () => {
    registerDef('goblin', { fearTolerance: 2 });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId });
    expect(stateModifierIsInhabitantScared(inhabitant, 2)).toBe(false);
  });

  it('should return false when room fear is below tolerance', () => {
    registerDef('goblin', { fearTolerance: 3 });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId });
    expect(stateModifierIsInhabitantScared(inhabitant, 1)).toBe(false);
  });

  it('should use default tolerance when not defined on creature', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId });
    // Default tolerance is 2, so fear level 3 should scare
    expect(stateModifierIsInhabitantScared(inhabitant, 3)).toBe(true);
    // Fear level 2 should not scare (equals tolerance)
    expect(stateModifierIsInhabitantScared(inhabitant, 2)).toBe(false);
  });

  it('should use default tolerance when definition not found', () => {
    const inhabitant = makeInhabitant({ definitionId: 'missing' as InhabitantId });
    expect(stateModifierIsInhabitantScared(inhabitant, 3)).toBe(true);
    expect(stateModifierIsInhabitantScared(inhabitant, 2)).toBe(false);
  });

  it('should handle zero fear tolerance (always scared at fear > 0)', () => {
    registerDef('slime', { fearTolerance: 0 });
    const inhabitant = makeInhabitant({ definitionId: 'slime' as InhabitantId });
    expect(stateModifierIsInhabitantScared(inhabitant, 1)).toBe(true);
    expect(stateModifierIsInhabitantScared(inhabitant, 0)).toBe(false);
  });

  it('should handle high fear tolerance (rarely scared)', () => {
    registerDef('skeleton', { fearTolerance: 4 });
    const inhabitant = makeInhabitant({ definitionId: 'skeleton' as InhabitantId });
    expect(stateModifierIsInhabitantScared(inhabitant, 4)).toBe(false);
    expect(stateModifierIsInhabitantScared(inhabitant, 5)).toBe(true);
  });
});

// --- stateModifierGetFearTolerance ---

describe('stateModifierGetFearTolerance', () => {
  it('should return creature fear tolerance', () => {
    registerDef('goblin', { fearTolerance: 1 });
    expect(stateModifierGetFearTolerance('goblin')).toBe(1);
  });

  it('should return default when not defined', () => {
    registerDef('goblin', {});
    expect(stateModifierGetFearTolerance('goblin')).toBe(STATE_MODIFIER_FEAR_TOLERANCE_DEFAULT);
  });

  it('should return default when definition not found', () => {
    expect(stateModifierGetFearTolerance('missing')).toBe(STATE_MODIFIER_FEAR_TOLERANCE_DEFAULT);
  });
});

// --- stateModifierGet ---

describe('stateModifierGet', () => {
  it('should return creature-specific modifier when defined', () => {
    const scaredMod: StateModifier = {
      productionMultiplier: 1.1,
      foodConsumptionMultiplier: 2.0,
      attackMultiplier: 1.2,
      defenseMultiplier: 0.8,
    };
    registerDef('kobold', {
      stateModifiers: { scared: scaredMod },
    });

    const result = stateModifierGet('kobold', 'scared');
    expect(result).toEqual(scaredMod);
  });

  it('should return default modifier when creature has no stateModifiers', () => {
    registerDef('goblin', {});
    const result = stateModifierGet('goblin', 'scared');
    expect(result.productionMultiplier).toBe(0.5);
    expect(result.foodConsumptionMultiplier).toBe(1.0);
  });

  it('should return default modifier when state not defined on creature', () => {
    registerDef('goblin', {
      stateModifiers: {
        normal: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
      },
    });
    const result = stateModifierGet('goblin', 'hungry');
    expect(result.productionMultiplier).toBe(0.5);
  });

  it('should return default modifier when definition not found', () => {
    const result = stateModifierGet('missing', 'normal');
    expect(result.productionMultiplier).toBe(1.0);
  });

  it('should return normal defaults for normal state', () => {
    registerDef('goblin', {});
    const result = stateModifierGet('goblin', 'normal');
    expect(result.productionMultiplier).toBe(1.0);
    expect(result.foodConsumptionMultiplier).toBe(1.0);
  });
});

// --- stateModifierGetProductionMultiplier ---

describe('stateModifierGetProductionMultiplier', () => {
  it('should return creature-specific production multiplier', () => {
    registerDef('kobold', {
      stateModifiers: {
        scared: { productionMultiplier: 1.1, foodConsumptionMultiplier: 2.0 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'kobold' as InhabitantId, state: 'scared' });
    expect(stateModifierGetProductionMultiplier(inhabitant)).toBe(1.1);
  });

  it('should return default for normal state', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'normal' });
    expect(stateModifierGetProductionMultiplier(inhabitant)).toBe(1.0);
  });

  it('should return default scared multiplier when no creature data', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'scared' });
    expect(stateModifierGetProductionMultiplier(inhabitant)).toBe(0.5);
  });
});

// --- stateModifierGetFoodConsumptionMultiplier ---

describe('stateModifierGetFoodConsumptionMultiplier', () => {
  it('should return creature-specific food multiplier', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'scared' });
    expect(stateModifierGetFoodConsumptionMultiplier(inhabitant)).toBe(1.5);
  });

  it('should return 1.0 for normal state', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'normal' });
    expect(stateModifierGetFoodConsumptionMultiplier(inhabitant)).toBe(1.0);
  });
});

// --- stateModifierGetAttackMultiplier ---

describe('stateModifierGetAttackMultiplier', () => {
  it('should return creature-specific attack multiplier', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5, attackMultiplier: 0.7 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'scared' });
    expect(stateModifierGetAttackMultiplier(inhabitant)).toBe(0.7);
  });

  it('should return 1.0 when attack multiplier not defined', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'scared' });
    expect(stateModifierGetAttackMultiplier(inhabitant)).toBe(1.0);
  });

  it('should return 1.0 for normal state with no combat modifiers', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'normal' });
    expect(stateModifierGetAttackMultiplier(inhabitant)).toBe(1.0);
  });
});

// --- stateModifierGetDefenseMultiplier ---

describe('stateModifierGetDefenseMultiplier', () => {
  it('should return creature-specific defense multiplier', () => {
    registerDef('kobold', {
      stateModifiers: {
        scared: { productionMultiplier: 1.1, foodConsumptionMultiplier: 2.0, defenseMultiplier: 0.8 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'kobold' as InhabitantId, state: 'scared' });
    expect(stateModifierGetDefenseMultiplier(inhabitant)).toBe(0.8);
  });

  it('should return 1.0 when defense multiplier not defined', () => {
    registerDef('goblin', {
      stateModifiers: {
        hungry: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.0 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'hungry' });
    expect(stateModifierGetDefenseMultiplier(inhabitant)).toBe(1.0);
  });
});

// --- stateModifierCalculatePerCreatureProduction ---

describe('stateModifierCalculatePerCreatureProduction', () => {
  it('should return 1.0 for empty list', () => {
    expect(stateModifierCalculatePerCreatureProduction([])).toBe(1.0);
  });

  it('should return single inhabitant multiplier', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5 },
      },
    });
    const inhabitants = [makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'scared' })];
    expect(stateModifierCalculatePerCreatureProduction(inhabitants)).toBe(0.5);
  });

  it('should average multipliers across inhabitants', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5 },
        normal: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
      },
    });
    const inhabitants = [
      makeInhabitant({ instanceId: 'i1' as InhabitantInstanceId, definitionId: 'goblin' as InhabitantId, state: 'scared' }),
      makeInhabitant({ instanceId: 'i2' as InhabitantInstanceId, definitionId: 'goblin' as InhabitantId, state: 'normal' }),
    ];
    // (0.5 + 1.0) / 2 = 0.75
    expect(stateModifierCalculatePerCreatureProduction(inhabitants)).toBe(0.75);
  });

  it('should handle mixed creature types', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5 },
      },
    });
    registerDef('kobold', {
      stateModifiers: {
        scared: { productionMultiplier: 1.1, foodConsumptionMultiplier: 2.0 },
      },
    });
    const inhabitants = [
      makeInhabitant({ instanceId: 'i1' as InhabitantInstanceId, definitionId: 'goblin' as InhabitantId, state: 'scared' }),
      makeInhabitant({ instanceId: 'i2' as InhabitantInstanceId, definitionId: 'kobold' as InhabitantId, state: 'scared' }),
    ];
    // (0.5 + 1.1) / 2 = 0.8
    expect(stateModifierCalculatePerCreatureProduction(inhabitants)).toBeCloseTo(0.8);
  });

  it('should use default multipliers when creature has no stateModifiers', () => {
    registerDef('goblin', {});
    const inhabitants = [makeInhabitant({ definitionId: 'goblin' as InhabitantId, state: 'hungry' })];
    // Default hungry = 0.5
    expect(stateModifierCalculatePerCreatureProduction(inhabitants)).toBe(0.5);
  });

  it('should handle all normal inhabitants returning 1.0', () => {
    registerDef('goblin', {
      stateModifiers: {
        normal: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
      },
    });
    const inhabitants = [
      makeInhabitant({ instanceId: 'i1' as InhabitantInstanceId, definitionId: 'goblin' as InhabitantId, state: 'normal' }),
      makeInhabitant({ instanceId: 'i2' as InhabitantInstanceId, definitionId: 'goblin' as InhabitantId, state: 'normal' }),
    ];
    expect(stateModifierCalculatePerCreatureProduction(inhabitants)).toBe(1.0);
  });

  it('should handle kobold scared boost (>1.0 multiplier)', () => {
    registerDef('kobold', {
      stateModifiers: {
        scared: { productionMultiplier: 1.1, foodConsumptionMultiplier: 2.0 },
      },
    });
    const inhabitants = [makeInhabitant({ definitionId: 'kobold' as InhabitantId, state: 'scared' })];
    expect(stateModifierCalculatePerCreatureProduction(inhabitants)).toBe(1.1);
  });
});

// --- Orc-specific behavior tests ---

describe('Orc Berserk behavior (scared state)', () => {
  const ORC_ID = 'orc-def' as InhabitantId;

  beforeEach(() => {
    registerDef(ORC_ID, {
      fearTolerance: 3,
      stateModifiers: {
        scared: {
          productionMultiplier: 0.3,
          foodConsumptionMultiplier: 1.5,
          attackMultiplier: 1.5,
          defenseMultiplier: 0.5,
        },
        normal: {
          productionMultiplier: 1.0,
          foodConsumptionMultiplier: 1.0,
        },
      },
    });
  });

  it('should grant +50% attack when Berserk (scared)', () => {
    const orc = makeInhabitant({ definitionId: ORC_ID, state: 'scared' });
    expect(stateModifierGetAttackMultiplier(orc)).toBe(1.5);
  });

  it('should impose -50% defense when Berserk (scared)', () => {
    const orc = makeInhabitant({ definitionId: ORC_ID, state: 'scared' });
    expect(stateModifierGetDefenseMultiplier(orc)).toBe(0.5);
  });

  it('should reduce production to 30% when Berserk (scared)', () => {
    const orc = makeInhabitant({ definitionId: ORC_ID, state: 'scared' });
    expect(stateModifierGetProductionMultiplier(orc)).toBe(0.3);
  });

  it('should not be scared when fear is at or below tolerance of 3', () => {
    const orc = makeInhabitant({ definitionId: ORC_ID });
    expect(stateModifierIsInhabitantScared(orc, 3)).toBe(false);
    expect(stateModifierIsInhabitantScared(orc, 2)).toBe(false);
  });

  it('should become scared when fear exceeds tolerance of 3', () => {
    const orc = makeInhabitant({ definitionId: ORC_ID });
    expect(stateModifierIsInhabitantScared(orc, 4)).toBe(true);
  });

  it('should return normal attack/defense multipliers when not scared', () => {
    const orc = makeInhabitant({ definitionId: ORC_ID, state: 'normal' });
    expect(stateModifierGetAttackMultiplier(orc)).toBe(1.0);
    expect(stateModifierGetDefenseMultiplier(orc)).toBe(1.0);
  });
});

describe('Orc Grumpy behavior (hungry state)', () => {
  const ORC_ID = 'orc-def' as InhabitantId;

  beforeEach(() => {
    registerDef(ORC_ID, {
      stateModifiers: {
        hungry: {
          productionMultiplier: 0.8,
          foodConsumptionMultiplier: 1.0,
          attackMultiplier: 0.9,
          defenseMultiplier: 0.9,
        },
        normal: {
          productionMultiplier: 1.0,
          foodConsumptionMultiplier: 1.0,
        },
      },
    });
  });

  it('should reduce room productivity by 20% when Grumpy (hungry)', () => {
    const orc = makeInhabitant({ definitionId: ORC_ID, state: 'hungry' });
    expect(stateModifierGetProductionMultiplier(orc)).toBe(0.8);
  });

  it('should reduce per-creature production average when mixed with normal inhabitants', () => {
    registerDef('goblin' as string, {
      stateModifiers: {
        normal: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
      },
    });
    const inhabitants = [
      makeInhabitant({ instanceId: 'i1' as InhabitantInstanceId, definitionId: ORC_ID, state: 'hungry' }),
      makeInhabitant({ instanceId: 'i2' as InhabitantInstanceId, definitionId: 'goblin' as InhabitantId, state: 'normal' }),
    ];
    // (0.8 + 1.0) / 2 = 0.9
    expect(stateModifierCalculatePerCreatureProduction(inhabitants)).toBeCloseTo(0.9);
  });

  it('should return normal productivity when not hungry', () => {
    const orc = makeInhabitant({ definitionId: ORC_ID, state: 'normal' });
    expect(stateModifierGetProductionMultiplier(orc)).toBe(1.0);
  });
});
