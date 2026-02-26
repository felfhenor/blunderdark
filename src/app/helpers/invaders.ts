import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { rngUuid } from '@helpers/rng';
import type { AbilityEffectContent } from '@interfaces/content-abilityeffect';
import type { CombatAbilityContent, CombatAbilityId } from '@interfaces/content-combatability';
import type { InvaderContent } from '@interfaces/content-invader';
import type {
  AbilityResult,
  AbilityResultEffect,
  InvaderInstance,
  InvaderInstanceId,
} from '@interfaces/invader';
import type { CombatantId } from '@interfaces/invasion';

// --- Content access ---

export function invaderGetAllDefinitions(): InvaderContent[] {
  return contentGetEntriesByType<InvaderContent>('invader');
}

export function invaderGetDefinitionById(
  id: string,
): InvaderContent | undefined {
  return contentGetEntry<InvaderContent>(id);
}

// --- Instance creation ---

export function invaderCreateInstance(
  definition: InvaderContent,
): InvaderInstance {
  return {
    id: rngUuid<InvaderInstanceId>(),
    definitionId: definition.id,
    currentHp: definition.baseStats.hp,
    maxHp: definition.baseStats.hp,
    isLeader: false,
    statusEffects: [],
    abilityStates: definition.combatAbilityIds.map((abilityName) => {
      const ability = contentGetEntry<CombatAbilityContent>(
        abilityName,
      );
      return {
        abilityId: (ability?.id ?? abilityName) as CombatAbilityId,
        currentCooldown: 0,
        isActive: false,
        remainingDuration: 0,
        passiveActivated: false,
      };
    }),
  };
}

// --- Ability resolution ---

/**
 * Resolve an invader ability against targets.
 * Returns null if the ability is on cooldown or effect definition is missing.
 * Pure function — caller applies results to state.
 */
export function invaderResolveAbility(
  invader: InvaderInstance,
  ability: CombatAbilityContent,
  targetIds: CombatantId[],
  rng: () => number = Math.random,
): AbilityResult | undefined {
  // Check cooldown
  const state = invader.abilityStates.find((s) => s.abilityId === ability.id);
  if (!state || state.currentCooldown > 0) return undefined;

  const resultEffects: AbilityResultEffect[] = [];

  for (const abilityEffect of ability.effects) {
    const effectDef = contentGetEntry<AbilityEffectContent>(abilityEffect.effectType);
    if (!effectDef) continue;

    let value = 0;

    if (effectDef.dealsDamage) {
      const definition = invaderGetDefinitionById(invader.definitionId);
      const attack = definition?.baseStats.attack ?? 0;
      value = Math.round(attack * (abilityEffect.value / 100));
    } else if (effectDef.statusName === 'healing') {
      value = Math.round(invader.maxHp * (abilityEffect.value / 100));
    } else if (effectDef.statusName === 'disarm') {
      const roll = rng() * 100;
      value = roll <= abilityEffect.value ? 1 : 0;
    } else if (effectDef.statusName === 'marked') {
      value = abilityEffect.value;
    } else if (effectDef.statusName === 'shielded') {
      value = abilityEffect.value;
    } else if (effectDef.statusName === 'scouting') {
      value = abilityEffect.value;
    }
    // courage, dispel: value stays 0

    // Determine affected targets per effect
    const affectedTargetIds: CombatantId[] = [];
    if (abilityEffect.targetType === 'self') {
      affectedTargetIds.push(invader.id as unknown as CombatantId);
    } else if (abilityEffect.targetType === 'aoe') {
      affectedTargetIds.push(...targetIds);
    } else if (targetIds.length > 0) {
      affectedTargetIds.push(targetIds[0]);
    }

    resultEffects.push({
      effectType: abilityEffect.effectType,
      value,
      duration: abilityEffect.duration,
      targetIds: affectedTargetIds,
    });
  }

  if (resultEffects.length === 0) return undefined;

  return {
    effects: resultEffects,
    cooldownApplied: ability.cooldown,
  };
}

// --- Cooldown management ---

/**
 * Apply cooldown to a specific ability on an invader instance.
 * Returns a new instance (does not mutate).
 */
export function invaderApplyCooldown(
  invader: InvaderInstance,
  abilityId: string,
  cooldown: number,
): InvaderInstance {
  return {
    ...invader,
    abilityStates: invader.abilityStates.map((s) =>
      s.abilityId === abilityId ? { ...s, currentCooldown: cooldown } : s,
    ),
  };
}

/**
 * Tick all ability cooldowns down by 1 (min 0).
 * Returns a new instance (does not mutate).
 */
export function invaderTickCooldowns(
  invader: InvaderInstance,
): InvaderInstance {
  return {
    ...invader,
    abilityStates: invader.abilityStates.map((s) => ({
      ...s,
      currentCooldown: Math.max(0, s.currentCooldown - 1),
    })),
  };
}

// --- Status effect helpers ---

/**
 * Apply or refresh a status effect on an invader.
 */
export function invaderApplyStatusEffect(
  invader: InvaderInstance,
  statusName: string,
  duration: number,
): InvaderInstance {
  const existing = invader.statusEffects.find((s) => s.name === statusName);
  if (existing) {
    return {
      ...invader,
      statusEffects: invader.statusEffects.map((s) =>
        s.name === statusName ? { ...s, remainingDuration: duration } : s,
      ),
    };
  }
  return {
    ...invader,
    statusEffects: [
      ...invader.statusEffects,
      { name: statusName, remainingDuration: duration },
    ],
  };
}

/**
 * Tick all status effects and remove expired ones.
 */
export function invaderTickStatusEffects(
  invader: InvaderInstance,
): InvaderInstance {
  return {
    ...invader,
    statusEffects: invader.statusEffects
      .map((s) => ({ ...s, remainingDuration: s.remainingDuration - 1 }))
      .filter((s) => s.remainingDuration > 0),
  };
}

/**
 * Check if an invader has a specific status effect.
 */
export function invaderHasStatusEffect(
  invader: InvaderInstance,
  statusName: string,
): boolean {
  return invader.statusEffects.some((s) => s.name === statusName);
}

/**
 * Remove all status effects from an invader (for Dispel).
 */
export function invaderClearStatusEffects(
  invader: InvaderInstance,
): InvaderInstance {
  return { ...invader, statusEffects: [] };
}

/**
 * Apply healing to an invader (capped at maxHp).
 */
export function invaderApplyHealing(
  invader: InvaderInstance,
  amount: number,
): InvaderInstance {
  return {
    ...invader,
    currentHp: Math.min(invader.maxHp, invader.currentHp + amount),
  };
}
