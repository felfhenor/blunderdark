import type {
  AbilityActivation,
  AbilityState,
  CombatAbility,
  CombatUnit,
} from '@interfaces';

/**
 * Create initial ability states for a set of abilities (all off cooldown).
 */
export function initAbilityStates(
  abilities: CombatAbility[],
): AbilityState[] {
  return abilities.map((a) => ({
    abilityId: a.id,
    currentCooldown: 0,
    isActive: false,
    remainingDuration: 0,
  }));
}

/**
 * Tick all ability states at the start of a combat turn.
 * - Decrements cooldowns (min 0).
 * - Decrements active durations; deactivates when duration reaches 0.
 * Returns new array (does not mutate input).
 */
export function tickAbilityStates(
  states: AbilityState[],
): AbilityState[] {
  return states.map((s) => {
    const newCooldown = Math.max(0, s.currentCooldown - 1);
    let newDuration = s.remainingDuration;
    let newActive = s.isActive;

    if (s.isActive) {
      newDuration = Math.max(0, s.remainingDuration - 1);
      if (newDuration === 0) {
        newActive = false;
      }
    }

    return {
      ...s,
      currentCooldown: newCooldown,
      isActive: newActive,
      remainingDuration: newDuration,
    };
  });
}

/**
 * Check if an ability is ready to use (off cooldown).
 */
export function isAbilityReady(
  ability: CombatAbility,
  states: AbilityState[],
): boolean {
  const state = states.find((s) => s.abilityId === ability.id);
  if (!state) return false;
  return state.currentCooldown === 0;
}

/**
 * Try to activate an ability based on its proc chance.
 * Returns null if the ability doesn't proc or is on cooldown.
 */
export function tryActivateAbility(
  ability: CombatAbility,
  states: AbilityState[],
  attacker: CombatUnit,
  targetCount: number,
  rng: () => number,
): { activation: AbilityActivation; updatedStates: AbilityState[] } | null {
  if (!isAbilityReady(ability, states)) return null;

  // Check proc chance
  const roll = rng() * 100;
  if (roll > ability.chance) return null;

  // Calculate damage based on effect type
  let damage = 0;
  let statusApplied: string | null = null;
  let statusDuration = 0;
  let targetsHit = 1;

  switch (ability.effectType) {
    case 'damage': {
      damage = Math.round(attacker.attack * (ability.value / 100));
      if (ability.targetType === 'aoe') {
        targetsHit = targetCount;
      }
      break;
    }
    case 'stun': {
      statusApplied = 'stunned';
      statusDuration = ability.duration;
      break;
    }
    case 'buff_attack': {
      statusApplied = 'berserk';
      statusDuration = ability.duration;
      break;
    }
    case 'buff_defense': {
      statusApplied = 'shielded';
      statusDuration = ability.duration;
      break;
    }
    case 'evasion': {
      statusApplied = 'phased';
      statusDuration = 0;
      targetsHit = 0;
      damage = 0;
      break;
    }
    case 'resurrect': {
      statusApplied = 'resurrected';
      statusDuration = 0;
      targetsHit = 1;
      break;
    }
  }

  const activation: AbilityActivation = {
    abilityId: ability.id,
    abilityName: ability.name,
    effectType: ability.effectType,
    targetType: ability.targetType,
    damage,
    targetsHit,
    statusApplied,
    statusDuration,
  };

  // Put ability on cooldown and mark active if it has duration
  const updatedStates = states.map((s) => {
    if (s.abilityId !== ability.id) return s;
    return {
      ...s,
      currentCooldown: ability.cooldown,
      isActive: ability.duration > 0,
      remainingDuration: ability.duration,
    };
  });

  return { activation, updatedStates };
}

/**
 * Check if a unit has an active evasion ability that blocks an incoming attack.
 * Returns true if the attack is evaded.
 */
export function checkEvasion(
  abilities: CombatAbility[],
  states: AbilityState[],
  rng: () => number,
): boolean {
  const evasionAbility = abilities.find((a) => a.effectType === 'evasion');
  if (!evasionAbility) return false;

  // Evasion is a passive — always checked, no cooldown needed
  const roll = rng() * 100;
  return roll <= evasionAbility.chance;
}

/**
 * Apply berserk buff: returns modified attack stat.
 * value is the percentage bonus (e.g. 100 = +100% attack).
 */
export function applyBerserkBuff(
  baseAttack: number,
  abilities: CombatAbility[],
  states: AbilityState[],
  unit: CombatUnit,
): number {
  const berserkAbility = abilities.find((a) => a.effectType === 'buff_attack');
  if (!berserkAbility) return baseAttack;

  // Check if berserk should be active (HP below threshold)
  // value represents the attack bonus percentage, chance represents the HP threshold
  const hpPercent = (unit.hp / unit.maxHp) * 100;
  if (hpPercent > berserkAbility.chance) return baseAttack;

  return Math.round(baseAttack * (1 + berserkAbility.value / 100));
}

/**
 * Apply shield buff: returns modified defense stat.
 * Only applies if the shield ability is currently active.
 */
export function applyShieldBuff(
  baseDefense: number,
  abilities: CombatAbility[],
  states: AbilityState[],
): number {
  const shieldAbility = abilities.find((a) => a.effectType === 'buff_defense');
  if (!shieldAbility) return baseDefense;

  const state = states.find((s) => s.abilityId === shieldAbility.id);
  if (!state?.isActive) return baseDefense;

  return Math.round(baseDefense * (1 + shieldAbility.value / 100));
}
