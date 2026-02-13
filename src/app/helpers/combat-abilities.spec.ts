import type {
  AbilityEffectDefinition,
  AbilityState,
  CombatAbility,
  CombatUnit,
} from '@interfaces';
import { describe, expect, it, vi } from 'vitest';

import {
  combatAbilityApplyBerserkBuff,
  combatAbilityApplyShieldBuff,
  combatAbilityCheckEvasion,
  combatAbilityInitStates,
  combatAbilityIsReady,
  combatAbilityTickStates,
  combatAbilityTryActivate,
} from '@helpers/combat-abilities';

// --- Effect definitions (mirrors gamedata/abilityeffect/base.yml) ---

const effectDefinitions: Record<string, AbilityEffectDefinition> = {
  Damage: {
    id: 'ae000001-0000-4000-a000-000000000001',
    name: 'Damage',
    __type: 'abilityeffect',
    dealsDamage: true,
    statusName: undefined,
    overrideTargetsHit: undefined,
  },
  Stun: {
    id: 'ae000001-0000-4000-a000-000000000002',
    name: 'Stun',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'stunned',
    overrideTargetsHit: undefined,
  },
  'Buff Attack': {
    id: 'ae000001-0000-4000-a000-000000000003',
    name: 'Buff Attack',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'berserk',
    overrideTargetsHit: undefined,
  },
  'Buff Defense': {
    id: 'ae000001-0000-4000-a000-000000000004',
    name: 'Buff Defense',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'shielded',
    overrideTargetsHit: undefined,
  },
  Evasion: {
    id: 'ae000001-0000-4000-a000-000000000005',
    name: 'Evasion',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'phased',
    overrideTargetsHit: 0,
  },
  Resurrect: {
    id: 'ae000001-0000-4000-a000-000000000006',
    name: 'Resurrect',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'resurrected',
    overrideTargetsHit: 1,
  },
};

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((nameOrId: string) => {
    return effectDefinitions[nameOrId] ?? Object.values(effectDefinitions).find((e) => e.id === nameOrId);
  }),
  contentGetEntriesByType: vi.fn(() => []),
  contentAllIdsByName: vi.fn(() => new Map()),
  contentAllById: vi.fn(() => new Map()),
  contentSetAllIdsByName: vi.fn(),
  contentSetAllById: vi.fn(),
}));

// --- Helpers ---

function fixedRng(value: number): () => number {
  return () => value;
}

function makeUnit(overrides: Partial<CombatUnit> = {}): CombatUnit {
  return {
    attack: 10,
    defense: 8,
    hp: 30,
    maxHp: 30,
    ...overrides,
  };
}

const breathWeapon: CombatAbility = {
  id: 'ability-breath-weapon',
  name: 'Breath Weapon',
  __type: 'combatability',
  description: 'AOE fire damage',
  effectType: 'Damage',
  value: 150, // 150% of attack
  chance: 100, // always fires when off cooldown
  cooldown: 3,
  targetType: 'aoe',
  duration: 0,
};

const petrifyingGaze: CombatAbility = {
  id: 'ability-petrifying-gaze',
  name: 'Petrifying Gaze',
  __type: 'combatability',
  description: 'Stuns a single target',
  effectType: 'Stun',
  value: 0,
  chance: 10, // 10% proc
  cooldown: 0,
  targetType: 'single',
  duration: 3,
};

const wraithEvasion: CombatAbility = {
  id: 'ability-intangible',
  name: 'Intangible',
  __type: 'combatability',
  description: '50% chance to evade physical attacks',
  effectType: 'Evasion',
  value: 0,
  chance: 50,
  cooldown: 0,
  targetType: 'self',
  duration: 0,
};

const berserkRage: CombatAbility = {
  id: 'ability-berserk-rage',
  name: 'Berserk Rage',
  __type: 'combatability',
  description: '+100% attack when below 50% HP',
  effectType: 'Buff Attack',
  value: 100, // +100% attack
  chance: 50, // HP threshold: 50%
  cooldown: 0,
  targetType: 'self',
  duration: 0, // lasts until combat ends
};

const lichShield: CombatAbility = {
  id: 'ability-shield',
  name: 'Arcane Shield',
  __type: 'combatability',
  description: '+50% defense for 3 turns',
  effectType: 'Buff Defense',
  value: 50,
  chance: 100,
  cooldown: 4,
  targetType: 'self',
  duration: 3,
};

const deathBolt: CombatAbility = {
  id: 'ability-death-bolt',
  name: 'Death Bolt',
  __type: 'combatability',
  description: 'Single target 200% magic damage',
  effectType: 'Damage',
  value: 200,
  chance: 100,
  cooldown: 2,
  targetType: 'single',
  duration: 0,
};

// --- Tests ---

describe('combatAbilityInitStates', () => {
  it('should create states for all abilities with 0 cooldown', () => {
    const states = combatAbilityInitStates([breathWeapon, petrifyingGaze]);
    expect(states).toHaveLength(2);
    expect(states[0].abilityId).toBe('ability-breath-weapon');
    expect(states[0].currentCooldown).toBe(0);
    expect(states[0].isActive).toBe(false);
    expect(states[0].remainingDuration).toBe(0);
  });

  it('should return empty array for no abilities', () => {
    expect(combatAbilityInitStates([])).toEqual([]);
  });
});

describe('combatAbilityTickStates', () => {
  it('should decrement cooldowns by 1', () => {
    const states: AbilityState[] = [
      { abilityId: 'a', currentCooldown: 3, isActive: false, remainingDuration: 0 },
    ];
    const ticked = combatAbilityTickStates(states);
    expect(ticked[0].currentCooldown).toBe(2);
  });

  it('should not go below 0 cooldown', () => {
    const states: AbilityState[] = [
      { abilityId: 'a', currentCooldown: 0, isActive: false, remainingDuration: 0 },
    ];
    const ticked = combatAbilityTickStates(states);
    expect(ticked[0].currentCooldown).toBe(0);
  });

  it('should decrement active duration and deactivate at 0', () => {
    const states: AbilityState[] = [
      { abilityId: 'a', currentCooldown: 0, isActive: true, remainingDuration: 1 },
    ];
    const ticked = combatAbilityTickStates(states);
    expect(ticked[0].isActive).toBe(false);
    expect(ticked[0].remainingDuration).toBe(0);
  });

  it('should keep active with remaining duration > 1', () => {
    const states: AbilityState[] = [
      { abilityId: 'a', currentCooldown: 0, isActive: true, remainingDuration: 3 },
    ];
    const ticked = combatAbilityTickStates(states);
    expect(ticked[0].isActive).toBe(true);
    expect(ticked[0].remainingDuration).toBe(2);
  });

  it('should not mutate original states', () => {
    const states: AbilityState[] = [
      { abilityId: 'a', currentCooldown: 2, isActive: false, remainingDuration: 0 },
    ];
    combatAbilityTickStates(states);
    expect(states[0].currentCooldown).toBe(2);
  });
});

describe('combatAbilityIsReady', () => {
  it('should return true when cooldown is 0', () => {
    const states: AbilityState[] = [
      { abilityId: 'ability-breath-weapon', currentCooldown: 0, isActive: false, remainingDuration: 0 },
    ];
    expect(combatAbilityIsReady(breathWeapon, states)).toBe(true);
  });

  it('should return false when cooldown > 0', () => {
    const states: AbilityState[] = [
      { abilityId: 'ability-breath-weapon', currentCooldown: 2, isActive: false, remainingDuration: 0 },
    ];
    expect(combatAbilityIsReady(breathWeapon, states)).toBe(false);
  });

  it('should return false when ability not found in states', () => {
    expect(combatAbilityIsReady(breathWeapon, [])).toBe(false);
  });
});

describe('combatAbilityTryActivate: damage abilities', () => {
  it('should activate breath weapon with AOE damage', () => {
    const states = combatAbilityInitStates([breathWeapon]);
    const attacker = makeUnit({ attack: 80 });
    const result = combatAbilityTryActivate(breathWeapon, states, attacker, 3, fixedRng(0.5));
    expect(result).toBeDefined();
    expect(result!.activation.abilityName).toBe('Breath Weapon');
    expect(result!.activation.damage).toBe(120); // 80 * 150/100
    expect(result!.activation.targetsHit).toBe(3);
    expect(result!.activation.targetType).toBe('aoe');
  });

  it('should put ability on cooldown after activation', () => {
    const states = combatAbilityInitStates([breathWeapon]);
    const attacker = makeUnit({ attack: 80 });
    const result = combatAbilityTryActivate(breathWeapon, states, attacker, 3, fixedRng(0.5));
    const updatedState = result!.updatedStates.find((s) => s.abilityId === 'ability-breath-weapon');
    expect(updatedState!.currentCooldown).toBe(3);
  });

  it('should not activate when on cooldown', () => {
    const states: AbilityState[] = [
      { abilityId: 'ability-breath-weapon', currentCooldown: 2, isActive: false, remainingDuration: 0 },
    ];
    const attacker = makeUnit({ attack: 80 });
    const result = combatAbilityTryActivate(breathWeapon, states, attacker, 3, fixedRng(0.5));
    expect(result).toBeUndefined();
  });

  it('should activate death bolt with single target damage', () => {
    const states = combatAbilityInitStates([deathBolt]);
    const attacker = makeUnit({ attack: 40 });
    const result = combatAbilityTryActivate(deathBolt, states, attacker, 5, fixedRng(0.5));
    expect(result).toBeDefined();
    expect(result!.activation.damage).toBe(80); // 40 * 200/100
    expect(result!.activation.targetsHit).toBe(1); // single target
  });
});

describe('combatAbilityTryActivate: stun (petrifying gaze)', () => {
  it('should apply stun when proc succeeds', () => {
    const states = combatAbilityInitStates([petrifyingGaze]);
    const attacker = makeUnit();
    // 10% chance, roll 5 (5 <= 10, success)
    const result = combatAbilityTryActivate(petrifyingGaze, states, attacker, 1, fixedRng(0.05));
    expect(result).toBeDefined();
    expect(result!.activation.statusApplied).toBe('stunned');
    expect(result!.activation.statusDuration).toBe(3);
  });

  it('should not proc when roll exceeds chance', () => {
    const states = combatAbilityInitStates([petrifyingGaze]);
    const attacker = makeUnit();
    // 10% chance, roll 50 (50 > 10, fail)
    const result = combatAbilityTryActivate(petrifyingGaze, states, attacker, 1, fixedRng(0.5));
    expect(result).toBeUndefined();
  });
});

describe('combatAbilityTryActivate: shield buff', () => {
  it('should activate shield with duration', () => {
    const states = combatAbilityInitStates([lichShield]);
    const attacker = makeUnit();
    const result = combatAbilityTryActivate(lichShield, states, attacker, 0, fixedRng(0.5));
    expect(result).toBeDefined();
    expect(result!.activation.statusApplied).toBe('shielded');
    const shieldState = result!.updatedStates.find((s) => s.abilityId === 'ability-shield');
    expect(shieldState!.isActive).toBe(true);
    expect(shieldState!.remainingDuration).toBe(3);
    expect(shieldState!.currentCooldown).toBe(4);
  });
});

describe('combatAbilityCheckEvasion', () => {
  it('should evade when roll is within chance', () => {
    const states = combatAbilityInitStates([wraithEvasion]);
    // 50% chance, roll 25 (25 <= 50, evade)
    expect(combatAbilityCheckEvasion([wraithEvasion], states, fixedRng(0.25))).toBe(true);
  });

  it('should not evade when roll exceeds chance', () => {
    const states = combatAbilityInitStates([wraithEvasion]);
    // 50% chance, roll 75 (75 > 50, no evade)
    expect(combatAbilityCheckEvasion([wraithEvasion], states, fixedRng(0.75))).toBe(false);
  });

  it('should not evade when no evasion ability exists', () => {
    expect(combatAbilityCheckEvasion([breathWeapon], [], fixedRng(0.1))).toBe(false);
  });

  it('should evade at exactly the threshold', () => {
    const states = combatAbilityInitStates([wraithEvasion]);
    // 50% chance, roll 50 (50 <= 50, evade)
    expect(combatAbilityCheckEvasion([wraithEvasion], states, fixedRng(0.5))).toBe(true);
  });
});

describe('combatAbilityApplyBerserkBuff', () => {
  it('should double attack when HP is below threshold', () => {
    const unit = makeUnit({ attack: 20, hp: 10, maxHp: 30 }); // 33% HP
    const result = combatAbilityApplyBerserkBuff(20, [berserkRage], [], unit);
    expect(result).toBe(40); // 20 * (1 + 100/100)
  });

  it('should not buff when HP is above threshold', () => {
    const unit = makeUnit({ attack: 20, hp: 25, maxHp: 30 }); // 83% HP
    const result = combatAbilityApplyBerserkBuff(20, [berserkRage], [], unit);
    expect(result).toBe(20);
  });

  it('should activate at exactly 50% HP', () => {
    const unit = makeUnit({ attack: 20, hp: 15, maxHp: 30 }); // 50% HP
    const result = combatAbilityApplyBerserkBuff(20, [berserkRage], [], unit);
    expect(result).toBe(40);
  });

  it('should return base attack when no berserk ability', () => {
    const unit = makeUnit({ attack: 20, hp: 5, maxHp: 30 });
    const result = combatAbilityApplyBerserkBuff(20, [breathWeapon], [], unit);
    expect(result).toBe(20);
  });
});

describe('combatAbilityApplyShieldBuff', () => {
  it('should increase defense when shield is active', () => {
    const states: AbilityState[] = [
      { abilityId: 'ability-shield', currentCooldown: 4, isActive: true, remainingDuration: 2 },
    ];
    const result = combatAbilityApplyShieldBuff(30, [lichShield], states);
    expect(result).toBe(45); // 30 * (1 + 50/100)
  });

  it('should not buff when shield is inactive', () => {
    const states: AbilityState[] = [
      { abilityId: 'ability-shield', currentCooldown: 2, isActive: false, remainingDuration: 0 },
    ];
    const result = combatAbilityApplyShieldBuff(30, [lichShield], states);
    expect(result).toBe(30);
  });

  it('should return base defense when no shield ability', () => {
    const result = combatAbilityApplyShieldBuff(30, [breathWeapon], []);
    expect(result).toBe(30);
  });
});

describe('full cooldown lifecycle', () => {
  it('should go through activate → cooldown → ready cycle', () => {
    let states = combatAbilityInitStates([breathWeapon]);
    const attacker = makeUnit({ attack: 80 });

    // Turn 1: activate (cooldown 0 → fires → cooldown set to 3)
    const result = combatAbilityTryActivate(breathWeapon, states, attacker, 2, fixedRng(0.5));
    expect(result).toBeDefined();
    states = result!.updatedStates;
    expect(states[0].currentCooldown).toBe(3);

    // Turn 2: tick (3→2), can't fire
    states = combatAbilityTickStates(states);
    expect(states[0].currentCooldown).toBe(2);
    expect(combatAbilityTryActivate(breathWeapon, states, attacker, 2, fixedRng(0.5))).toBeUndefined();

    // Turn 3: tick (2→1)
    states = combatAbilityTickStates(states);
    expect(states[0].currentCooldown).toBe(1);

    // Turn 4: tick (1→0), now ready
    states = combatAbilityTickStates(states);
    expect(states[0].currentCooldown).toBe(0);
    expect(combatAbilityIsReady(breathWeapon, states)).toBe(true);

    // Turn 5: can activate again
    const result2 = combatAbilityTryActivate(breathWeapon, states, attacker, 2, fixedRng(0.5));
    expect(result2).toBeDefined();
  });
});

describe('duration lifecycle', () => {
  it('should deactivate after duration expires', () => {
    let states = combatAbilityInitStates([lichShield]);
    const attacker = makeUnit();

    // Activate shield (duration 3)
    const result = combatAbilityTryActivate(lichShield, states, attacker, 0, fixedRng(0.5));
    states = result!.updatedStates;
    expect(states[0].isActive).toBe(true);
    expect(states[0].remainingDuration).toBe(3);

    // Tick 1: 3→2
    states = combatAbilityTickStates(states);
    expect(states[0].isActive).toBe(true);
    expect(states[0].remainingDuration).toBe(2);

    // Tick 2: 2→1
    states = combatAbilityTickStates(states);
    expect(states[0].isActive).toBe(true);
    expect(states[0].remainingDuration).toBe(1);

    // Tick 3: 1→0, deactivates
    states = combatAbilityTickStates(states);
    expect(states[0].isActive).toBe(false);
    expect(states[0].remainingDuration).toBe(0);
  });
});
