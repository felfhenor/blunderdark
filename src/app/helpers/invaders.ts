import { getEntriesByType, getEntry } from '@helpers/content';
import { rngUuid } from '@helpers/rng';
import type {
  AbilityEffectDefinition,
  CombatAbility,
  IsContentItem,
} from '@interfaces';
import type {
  AbilityResult,
  InvaderDefinition,
  InvaderInstance,
} from '@interfaces/invader';

// --- Content access ---

export function getAllInvaderDefinitions(): (InvaderDefinition &
  IsContentItem)[] {
  return getEntriesByType<InvaderDefinition & IsContentItem>('invader');
}

export function getInvaderDefinitionById(
  id: string,
): (InvaderDefinition & IsContentItem) | undefined {
  return getEntry<InvaderDefinition & IsContentItem>(id);
}

// --- Instance creation ---

export function createInvaderInstance(
  definition: InvaderDefinition,
): InvaderInstance {
  return {
    id: rngUuid(),
    definitionId: definition.id,
    currentHp: definition.baseStats.hp,
    maxHp: definition.baseStats.hp,
    statusEffects: [],
    abilityStates: definition.abilityIds.map((abilityName) => {
      const ability = getEntry<CombatAbility & IsContentItem>(abilityName);
      return {
        abilityId: ability?.id ?? abilityName,
        currentCooldown: 0,
        isActive: false,
        remainingDuration: 0,
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
export function resolveInvaderAbility(
  invader: InvaderInstance,
  ability: CombatAbility,
  targetIds: string[],
  rng: () => number = Math.random,
): AbilityResult | null {
  // Check cooldown
  const state = invader.abilityStates.find((s) => s.abilityId === ability.id);
  if (!state || state.currentCooldown > 0) return null;

  // Look up effect definition by ability's effectType (name-based lookup)
  const effect = getEntry<AbilityEffectDefinition & IsContentItem>(
    ability.effectType,
  );
  if (!effect) return null;

  let value = 0;

  if (effect.dealsDamage) {
    // Damage abilities: value based on invader attack * ability value percentage
    const definition = getInvaderDefinitionById(invader.definitionId);
    const attack = definition?.baseStats.attack ?? 0;
    value = Math.round(attack * (ability.value / 100));
  } else if (effect.statusName === 'healing') {
    // Heal: value is percentage of target's max HP (use invader's maxHp for self-heal)
    value = Math.round(invader.maxHp * (ability.value / 100));
  } else if (effect.statusName === 'disarm') {
    // Disarm: roll for success. value = 1 (success) or 0 (failure)
    const roll = rng() * 100;
    value = roll <= ability.value ? 1 : 0;
  } else if (effect.statusName === 'marked') {
    // Mark: value is the damage amplification percentage
    value = ability.value;
  } else if (effect.statusName === 'shielded') {
    // Shield/damage reduction: value is the defense buff percentage
    value = ability.value;
  } else if (effect.statusName === 'scouting') {
    // Scout: value is rooms to reveal
    value = ability.value;
  }
  // courage, dispel: value stays 0

  // Determine affected targets
  const affectedTargetIds: string[] = [];
  if (ability.targetType === 'self') {
    affectedTargetIds.push(invader.id);
  } else if (ability.targetType === 'aoe') {
    affectedTargetIds.push(...targetIds);
  } else if (targetIds.length > 0) {
    // single target — first target
    affectedTargetIds.push(targetIds[0]);
  }

  return {
    effectType: ability.effectType,
    value,
    duration: ability.duration,
    targetIds: affectedTargetIds,
    cooldownApplied: ability.cooldown,
  };
}

// --- Cooldown management ---

/**
 * Apply cooldown to a specific ability on an invader instance.
 * Returns a new instance (does not mutate).
 */
export function applyCooldown(
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
export function tickCooldowns(invader: InvaderInstance): InvaderInstance {
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
export function applyStatusEffect(
  invader: InvaderInstance,
  statusName: string,
  duration: number,
): InvaderInstance {
  const existing = invader.statusEffects.find((s) => s.name === statusName);
  if (existing) {
    return {
      ...invader,
      statusEffects: invader.statusEffects.map((s) =>
        s.name === statusName
          ? { ...s, remainingDuration: duration }
          : s,
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
export function tickStatusEffects(invader: InvaderInstance): InvaderInstance {
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
export function hasStatusEffect(
  invader: InvaderInstance,
  statusName: string,
): boolean {
  return invader.statusEffects.some((s) => s.name === statusName);
}

/**
 * Remove all status effects from an invader (for Dispel).
 */
export function clearStatusEffects(invader: InvaderInstance): InvaderInstance {
  return { ...invader, statusEffects: [] };
}

/**
 * Apply healing to an invader (capped at maxHp).
 */
export function applyHealing(
  invader: InvaderInstance,
  amount: number,
): InvaderInstance {
  return {
    ...invader,
    currentHp: Math.min(invader.maxHp, invader.currentHp + amount),
  };
}
