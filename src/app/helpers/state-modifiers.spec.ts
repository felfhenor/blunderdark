import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  InhabitantDefinition,
  InhabitantInstance,
  InhabitantState,
  IsContentItem,
  StateModifier,
} from '@interfaces';

const mockEntries = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockEntries.get(id) ?? undefined,
}));

import {
  DEFAULT_FEAR_TOLERANCE,
  calculatePerCreatureProductionModifier,
  getAttackMultiplier,
  getDefenseMultiplier,
  getFearTolerance,
  getFoodConsumptionMultiplier,
  getProductionMultiplier,
  getStateModifier,
  isInhabitantScared,
} from '@helpers/state-modifiers';

function makeInhabitant(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
  return {
    instanceId: 'inst-1',
    definitionId: 'goblin',
    name: 'Goblin Worker',
    state: 'normal' as InhabitantState,
    assignedRoomId: null,
    ...overrides,
  };
}

function registerDef(
  id: string,
  overrides: Partial<InhabitantDefinition & IsContentItem> = {},
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

// --- isInhabitantScared ---

describe('isInhabitantScared', () => {
  it('should return true when room fear exceeds tolerance', () => {
    registerDef('goblin', { fearTolerance: 1 });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' });
    expect(isInhabitantScared(inhabitant, 2)).toBe(true);
  });

  it('should return false when room fear equals tolerance', () => {
    registerDef('goblin', { fearTolerance: 2 });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' });
    expect(isInhabitantScared(inhabitant, 2)).toBe(false);
  });

  it('should return false when room fear is below tolerance', () => {
    registerDef('goblin', { fearTolerance: 3 });
    const inhabitant = makeInhabitant({ definitionId: 'goblin' });
    expect(isInhabitantScared(inhabitant, 1)).toBe(false);
  });

  it('should use default tolerance when not defined on creature', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin' });
    // Default tolerance is 2, so fear level 3 should scare
    expect(isInhabitantScared(inhabitant, 3)).toBe(true);
    // Fear level 2 should not scare (equals tolerance)
    expect(isInhabitantScared(inhabitant, 2)).toBe(false);
  });

  it('should use default tolerance when definition not found', () => {
    const inhabitant = makeInhabitant({ definitionId: 'missing' });
    expect(isInhabitantScared(inhabitant, 3)).toBe(true);
    expect(isInhabitantScared(inhabitant, 2)).toBe(false);
  });

  it('should handle zero fear tolerance (always scared at fear > 0)', () => {
    registerDef('slime', { fearTolerance: 0 });
    const inhabitant = makeInhabitant({ definitionId: 'slime' });
    expect(isInhabitantScared(inhabitant, 1)).toBe(true);
    expect(isInhabitantScared(inhabitant, 0)).toBe(false);
  });

  it('should handle high fear tolerance (rarely scared)', () => {
    registerDef('skeleton', { fearTolerance: 4 });
    const inhabitant = makeInhabitant({ definitionId: 'skeleton' });
    expect(isInhabitantScared(inhabitant, 4)).toBe(false);
    expect(isInhabitantScared(inhabitant, 5)).toBe(true);
  });
});

// --- getFearTolerance ---

describe('getFearTolerance', () => {
  it('should return creature fear tolerance', () => {
    registerDef('goblin', { fearTolerance: 1 });
    expect(getFearTolerance('goblin')).toBe(1);
  });

  it('should return default when not defined', () => {
    registerDef('goblin', {});
    expect(getFearTolerance('goblin')).toBe(DEFAULT_FEAR_TOLERANCE);
  });

  it('should return default when definition not found', () => {
    expect(getFearTolerance('missing')).toBe(DEFAULT_FEAR_TOLERANCE);
  });
});

// --- getStateModifier ---

describe('getStateModifier', () => {
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

    const result = getStateModifier('kobold', 'scared');
    expect(result).toEqual(scaredMod);
  });

  it('should return default modifier when creature has no stateModifiers', () => {
    registerDef('goblin', {});
    const result = getStateModifier('goblin', 'scared');
    expect(result.productionMultiplier).toBe(0.5);
    expect(result.foodConsumptionMultiplier).toBe(1.0);
  });

  it('should return default modifier when state not defined on creature', () => {
    registerDef('goblin', {
      stateModifiers: {
        normal: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
      },
    });
    const result = getStateModifier('goblin', 'hungry');
    expect(result.productionMultiplier).toBe(0.75);
  });

  it('should return default modifier when definition not found', () => {
    const result = getStateModifier('missing', 'normal');
    expect(result.productionMultiplier).toBe(1.0);
  });

  it('should return normal defaults for normal state', () => {
    registerDef('goblin', {});
    const result = getStateModifier('goblin', 'normal');
    expect(result.productionMultiplier).toBe(1.0);
    expect(result.foodConsumptionMultiplier).toBe(1.0);
  });
});

// --- getProductionMultiplier ---

describe('getProductionMultiplier', () => {
  it('should return creature-specific production multiplier', () => {
    registerDef('kobold', {
      stateModifiers: {
        scared: { productionMultiplier: 1.1, foodConsumptionMultiplier: 2.0 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'kobold', state: 'scared' });
    expect(getProductionMultiplier(inhabitant)).toBe(1.1);
  });

  it('should return default for normal state', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin', state: 'normal' });
    expect(getProductionMultiplier(inhabitant)).toBe(1.0);
  });

  it('should return default scared multiplier when no creature data', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin', state: 'scared' });
    expect(getProductionMultiplier(inhabitant)).toBe(0.5);
  });
});

// --- getFoodConsumptionMultiplier ---

describe('getFoodConsumptionMultiplier', () => {
  it('should return creature-specific food multiplier', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'goblin', state: 'scared' });
    expect(getFoodConsumptionMultiplier(inhabitant)).toBe(1.5);
  });

  it('should return 1.0 for normal state', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin', state: 'normal' });
    expect(getFoodConsumptionMultiplier(inhabitant)).toBe(1.0);
  });
});

// --- getAttackMultiplier ---

describe('getAttackMultiplier', () => {
  it('should return creature-specific attack multiplier', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5, attackMultiplier: 0.7 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'goblin', state: 'scared' });
    expect(getAttackMultiplier(inhabitant)).toBe(0.7);
  });

  it('should return 1.0 when attack multiplier not defined', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'goblin', state: 'scared' });
    expect(getAttackMultiplier(inhabitant)).toBe(1.0);
  });

  it('should return 1.0 for normal state with no combat modifiers', () => {
    registerDef('goblin', {});
    const inhabitant = makeInhabitant({ definitionId: 'goblin', state: 'normal' });
    expect(getAttackMultiplier(inhabitant)).toBe(1.0);
  });
});

// --- getDefenseMultiplier ---

describe('getDefenseMultiplier', () => {
  it('should return creature-specific defense multiplier', () => {
    registerDef('kobold', {
      stateModifiers: {
        scared: { productionMultiplier: 1.1, foodConsumptionMultiplier: 2.0, defenseMultiplier: 0.8 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'kobold', state: 'scared' });
    expect(getDefenseMultiplier(inhabitant)).toBe(0.8);
  });

  it('should return 1.0 when defense multiplier not defined', () => {
    registerDef('goblin', {
      stateModifiers: {
        hungry: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.0 },
      },
    });
    const inhabitant = makeInhabitant({ definitionId: 'goblin', state: 'hungry' });
    expect(getDefenseMultiplier(inhabitant)).toBe(1.0);
  });
});

// --- calculatePerCreatureProductionModifier ---

describe('calculatePerCreatureProductionModifier', () => {
  it('should return 1.0 for empty list', () => {
    expect(calculatePerCreatureProductionModifier([])).toBe(1.0);
  });

  it('should return single inhabitant multiplier', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5 },
      },
    });
    const inhabitants = [makeInhabitant({ definitionId: 'goblin', state: 'scared' })];
    expect(calculatePerCreatureProductionModifier(inhabitants)).toBe(0.5);
  });

  it('should average multipliers across inhabitants', () => {
    registerDef('goblin', {
      stateModifiers: {
        scared: { productionMultiplier: 0.5, foodConsumptionMultiplier: 1.5 },
        normal: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
      },
    });
    const inhabitants = [
      makeInhabitant({ instanceId: 'i1', definitionId: 'goblin', state: 'scared' }),
      makeInhabitant({ instanceId: 'i2', definitionId: 'goblin', state: 'normal' }),
    ];
    // (0.5 + 1.0) / 2 = 0.75
    expect(calculatePerCreatureProductionModifier(inhabitants)).toBe(0.75);
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
      makeInhabitant({ instanceId: 'i1', definitionId: 'goblin', state: 'scared' }),
      makeInhabitant({ instanceId: 'i2', definitionId: 'kobold', state: 'scared' }),
    ];
    // (0.5 + 1.1) / 2 = 0.8
    expect(calculatePerCreatureProductionModifier(inhabitants)).toBeCloseTo(0.8);
  });

  it('should use default multipliers when creature has no stateModifiers', () => {
    registerDef('goblin', {});
    const inhabitants = [makeInhabitant({ definitionId: 'goblin', state: 'hungry' })];
    // Default hungry = 0.75
    expect(calculatePerCreatureProductionModifier(inhabitants)).toBe(0.75);
  });

  it('should handle all normal inhabitants returning 1.0', () => {
    registerDef('goblin', {
      stateModifiers: {
        normal: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
      },
    });
    const inhabitants = [
      makeInhabitant({ instanceId: 'i1', definitionId: 'goblin', state: 'normal' }),
      makeInhabitant({ instanceId: 'i2', definitionId: 'goblin', state: 'normal' }),
    ];
    expect(calculatePerCreatureProductionModifier(inhabitants)).toBe(1.0);
  });

  it('should handle kobold scared boost (>1.0 multiplier)', () => {
    registerDef('kobold', {
      stateModifiers: {
        scared: { productionMultiplier: 1.1, foodConsumptionMultiplier: 2.0 },
      },
    });
    const inhabitants = [makeInhabitant({ definitionId: 'kobold', state: 'scared' })];
    expect(calculatePerCreatureProductionModifier(inhabitants)).toBe(1.1);
  });
});
