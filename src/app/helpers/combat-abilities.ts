import type {
  AbilityActivation,
  AbilityActivationEffect,
  AbilityState,
  CombatAbilityId,
  CombatUnit,
} from '@interfaces';
import type { AbilityEffectContent } from '@interfaces/content-abilityeffect';
import type { CombatAbilityContent, CombatAbilityEffect } from '@interfaces/content-combatability';

import { contentGetEntry } from '@helpers/content';

/**
 * Create initial ability states for a set of abilities (all off cooldown).
 */
export function combatAbilityInitStates(
  abilities: CombatAbilityContent[],
): AbilityState[] {
  return abilities.map((a) => ({
    abilityId: a.id as CombatAbilityId,
    currentCooldown: 0,
    isActive: false,
    remainingDuration: 0,
    passiveActivated: false,
  }));
}

/**
 * Tick all ability states at the start of a combat turn.
 * - Decrements cooldowns (min 0).
 * - Decrements active durations; deactivates when duration reaches 0.
 * Returns new array (does not mutate input).
 */
export function combatAbilityTickStates(
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
export function combatAbilityIsReady(
  ability: CombatAbilityContent,
  states: AbilityState[],
): boolean {
  const state = states.find((s) => s.abilityId === ability.id);
  if (!state) return false;
  return state.currentCooldown === 0;
}

/**
 * Look up the AbilityEffectContent for a single combat ability effect entry.
 */
function getEffectDefinition(
  effect: CombatAbilityEffect,
): AbilityEffectContent | undefined {
  return contentGetEntry<AbilityEffectContent>(effect.effectType);
}

/**
 * Look up all AbilityEffectContent definitions for an ability's effects.
 */
export function getEffectDefinitions(
  ability: CombatAbilityContent,
): AbilityEffectContent[] {
  return ability.effects
    .map((e) => getEffectDefinition(e))
    .filter((e): e is AbilityEffectContent => e !== undefined);
}

/**
 * Try to activate an ability based on its proc chance.
 * Returns undefined if the ability doesn't proc or is on cooldown.
 */
export function combatAbilityTryActivate(
  ability: CombatAbilityContent,
  states: AbilityState[],
  attacker: CombatUnit,
  targetCount: number,
  rng: () => number,
): { activation: AbilityActivation; updatedStates: AbilityState[] } | undefined {
  if (!combatAbilityIsReady(ability, states)) return undefined;

  // Check proc chance
  const roll = rng() * 100;
  if (roll > ability.chance) return undefined;

  const activationEffects: AbilityActivationEffect[] = [];
  let maxDuration = 0;

  for (const abilityEffect of ability.effects) {
    const effectDef = getEffectDefinition(abilityEffect);
    if (!effectDef) continue;

    let damage = 0;
    let statusApplied: string | undefined = undefined;
    let statusDuration = 0;
    let targetsHit = 1;

    if (effectDef.dealsDamage) {
      damage = Math.round(attacker.attack * (abilityEffect.value / 100));
      if (abilityEffect.targetType === 'aoe') {
        targetsHit = targetCount;
      }
    }

    if (effectDef.statusName) {
      statusApplied = effectDef.statusName;
      statusDuration = abilityEffect.duration;
    }

    if (effectDef.overrideTargetsHit !== undefined) {
      targetsHit = effectDef.overrideTargetsHit;
      damage = 0;
    }

    if (abilityEffect.duration > maxDuration) {
      maxDuration = abilityEffect.duration;
    }

    activationEffects.push({
      effectType: abilityEffect.effectType,
      targetType: abilityEffect.targetType,
      damage,
      targetsHit,
      statusApplied,
      statusDuration,
      targetIds: [],
    });
  }

  if (activationEffects.length === 0) return undefined;

  const activation: AbilityActivation = {
    abilityId: ability.id as CombatAbilityId,
    abilityName: ability.name,
    effects: activationEffects,
  };

  // Put ability on cooldown and mark active if any effect has duration
  const updatedStates = states.map((s) => {
    if (s.abilityId !== ability.id) return s;
    return {
      ...s,
      currentCooldown: ability.cooldown,
      isActive: maxDuration > 0,
      remainingDuration: maxDuration,
      passiveActivated: s.passiveActivated,
    };
  });

  return { activation, updatedStates };
}

/**
 * Check if a unit has an active evasion ability that blocks an incoming attack.
 * Returns true if the attack is evaded.
 */
export function combatAbilityCheckEvasion(
  abilities: CombatAbilityContent[],
  states: AbilityState[],
  rng: () => number,
): boolean {
  const evasionAbility = abilities.find((a) => {
    const effects = getEffectDefinitions(a);
    return effects.some((e) => e.overrideTargetsHit === 0);
  });
  if (!evasionAbility) return false;

  // Evasion is a passive — always checked, no cooldown needed
  const roll = rng() * 100;
  return roll <= evasionAbility.chance;
}

/**
 * Apply berserk buff: returns modified attack stat.
 * value is the percentage bonus (e.g. 100 = +100% attack).
 */
export function combatAbilityApplyBerserkBuff(
  baseAttack: number,
  abilities: CombatAbilityContent[],
  states: AbilityState[],
  unit: CombatUnit,
): number {
  const berserkAbility = abilities.find((a) => {
    const effects = getEffectDefinitions(a);
    return effects.some((e) => e.statusName === 'berserk');
  });
  if (!berserkAbility) return baseAttack;

  const berserkEffect = berserkAbility.effects.find((e) => {
    const def = getEffectDefinition(e);
    return def?.statusName === 'berserk';
  });
  if (!berserkEffect) return baseAttack;

  // Check if berserk should be active (HP below threshold)
  // chance represents the HP threshold, value represents the attack bonus percentage
  const hpPercent = (unit.hp / unit.maxHp) * 100;
  if (hpPercent > berserkAbility.chance) return baseAttack;

  return Math.round(baseAttack * (1 + berserkEffect.value / 100));
}

/**
 * Apply shield buff: returns modified defense stat.
 * Only applies if the shield ability is currently active.
 */
export function combatAbilityApplyShieldBuff(
  baseDefense: number,
  abilities: CombatAbilityContent[],
  states: AbilityState[],
): number {
  const shieldAbility = abilities.find((a) => {
    const effects = getEffectDefinitions(a);
    return effects.some((e) => e.statusName === 'shielded');
  });
  if (!shieldAbility) return baseDefense;

  const state = states.find((s) => s.abilityId === shieldAbility.id);
  if (!state?.isActive) return baseDefense;

  const shieldEffect = shieldAbility.effects.find((e) => {
    const def = getEffectDefinition(e);
    return def?.statusName === 'shielded';
  });
  if (!shieldEffect) return baseDefense;

  return Math.round(baseDefense * (1 + shieldEffect.value / 100));
}
