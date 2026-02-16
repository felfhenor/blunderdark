import { contentGetEntry } from '@helpers/content';
import type {
  Floor,
  InhabitantInstance,
  InhabitantTrait,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type { TrapTriggerResult } from '@interfaces/trap';

const MIMIC_LIVING_TRAP_DAMAGE = 8;
const MIMIC_LIVING_TRAP_SLOW_DURATION = 2;

/**
 * Calculate bonus defense from defense_bonus traits that target a specific room.
 * Returns the total defense bonus from matching traits.
 *
 * Traits with targetRoomId only apply when the assigned room matches.
 * Traits without targetRoomId apply unconditionally.
 */
export function mimicCalculateDefenseBonus(
  traits: InhabitantTrait[],
  assignedRoomTypeId: string | undefined,
): number {
  if (!assignedRoomTypeId) return 0;

  const roomDef = contentGetEntry<RoomContent>(assignedRoomTypeId);
  if (!roomDef) return 0;

  let bonus = 0;
  for (const trait of traits) {
    if (trait.effectType !== 'defense_bonus') continue;
    if (!trait.targetRoomId) {
      bonus += trait.effectValue;
    } else if (roomDef.id === trait.targetRoomId) {
      bonus += trait.effectValue;
    }
  }

  return bonus;
}

/**
 * Calculate surprise attack damage for first-hit bonus.
 * Returns the total damage after applying attack_bonus traits on the first attack.
 *
 * Shapeshifter trait: +100% damage (effectValue: 1.0 means 100% bonus) on first attack.
 */
export function mimicCalculateSurpriseAttackDamage(
  baseDamage: number,
  traits: InhabitantTrait[],
  isFirstAttack: boolean,
): number {
  if (!isFirstAttack) return baseDamage;

  let multiplier = 1.0;
  for (const trait of traits) {
    if (trait.effectType === 'attack_bonus') {
      multiplier += trait.effectValue;
    }
  }

  return Math.floor(baseDamage * multiplier);
}

/**
 * Check whether an inhabitant has the living trap capability (attack_bonus trait).
 * Inhabitants with the Shapeshifter trait can function as living traps.
 */
export function mimicHasLivingTrap(def: InhabitantContent): boolean {
  return def.traits.some((t) => t.effectType === 'attack_bonus');
}

/**
 * Generate a pseudo-trap trigger result for a living trap inhabitant.
 * Living traps deal physical damage with a slow effect and never get destroyed.
 * They do not consume trap charges and coexist with regular traps.
 */
export function mimicTriggerLivingTrap(
  def: InhabitantContent,
): TrapTriggerResult {
  if (!mimicHasLivingTrap(def)) {
    return {
      triggered: false,
      disarmed: false,
      damage: 0,
      effectType: '',
      duration: 0,
      trapDestroyed: false,
      trapName: '',
      moralePenalty: 0,
    };
  }

  return {
    triggered: true,
    disarmed: false,
    damage: MIMIC_LIVING_TRAP_DAMAGE,
    effectType: 'debuff',
    duration: MIMIC_LIVING_TRAP_SLOW_DURATION,
    trapDestroyed: false,
    trapName: `${def.name} (Living Trap)`,
    moralePenalty: 5,
  };
}

/**
 * Find all living-trap-capable inhabitants assigned to rooms on a floor.
 * Returns instances paired with their content definition.
 */
export function mimicGetLivingTrapsOnFloor(
  floor: Floor,
): { instance: InhabitantInstance; def: InhabitantContent }[] {
  const results: { instance: InhabitantInstance; def: InhabitantContent }[] = [];

  for (const instance of floor.inhabitants) {
    if (!instance.assignedRoomId) continue;

    const def = contentGetEntry<InhabitantContent>(instance.definitionId);
    if (!def) continue;

    if (mimicHasLivingTrap(def)) {
      results.push({ instance, def });
    }
  }

  return results;
}
