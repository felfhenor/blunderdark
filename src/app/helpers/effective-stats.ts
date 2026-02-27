import { contentGetEntry } from '@helpers/content';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { throneRoomRulerBonus } from '@helpers/throne-room';
import type { InhabitantStats } from '@interfaces/inhabitant';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { InhabitantInstance } from '@interfaces/inhabitant';
import type { MutationTraitContent } from '@interfaces/content-mutationtrait';

/**
 * Compute effective stats for an inhabitant:
 * base stats + training bonuses + instanceStatBonuses + mutation trait bonuses.
 * Clamps: hp >= 1, attack >= 0, defense >= 0, speed >= 1, workerEfficiency >= 0.1
 */
export function effectiveStatsCalculate(
  definition: InhabitantContent,
  instance: InhabitantInstance,
): InhabitantStats {
  const base = definition.stats;

  let hp = base.hp;
  let attack = base.attack;
  let defense = base.defense;
  let speed = base.speed;
  let workerEfficiency = base.workerEfficiency;

  // Training bonuses
  if (instance.trainingBonuses) {
    attack += instance.trainingBonuses.attack;
    defense += instance.trainingBonuses.defense;
  }

  // Instance stat bonuses (from hybrids, summoning, phylactery)
  if (instance.instanceStatBonuses) {
    hp += instance.instanceStatBonuses.hp ?? 0;
    attack += instance.instanceStatBonuses.attack ?? 0;
    defense += instance.instanceStatBonuses.defense ?? 0;
    speed += instance.instanceStatBonuses.speed ?? 0;
    workerEfficiency += instance.instanceStatBonuses.workerEfficiency ?? 0;
  }

  // Mutation trait bonuses
  if (instance.mutationTraitIds) {
    for (const traitId of instance.mutationTraitIds) {
      const trait = contentGetEntry<MutationTraitContent>(traitId);
      if (!trait) continue;
      for (const mod of trait.modifiers) {
        switch (mod.stat) {
          case 'hp':
            hp += mod.bonus;
            break;
          case 'attack':
            attack += mod.bonus;
            break;
          case 'defense':
            defense += mod.bonus;
            break;
          case 'speed':
            speed += mod.bonus;
            break;
          case 'workerEfficiency':
            workerEfficiency += mod.bonus;
            break;
        }
      }
    }
  }

  // Forge equipment bonuses (baked at craft time)
  if (instance.equippedStatBonuses) {
    hp += instance.equippedStatBonuses.hp ?? 0;
    attack += instance.equippedStatBonuses.attack ?? 0;
    defense += instance.equippedStatBonuses.defense ?? 0;
    speed += instance.equippedStatBonuses.speed ?? 0;
    workerEfficiency += instance.equippedStatBonuses.workerEfficiency ?? 0;
  }

  // Research passive bonuses
  const statsBonus =
    researchUnlockGetPassiveBonusWithMastery('inhabitantStats');
  if (statsBonus > 0) {
    hp *= 1 + statsBonus;
    attack *= 1 + statsBonus;
    defense *= 1 + statsBonus;
    speed *= 1 + statsBonus;
  }

  const defBonus = researchUnlockGetPassiveBonusWithMastery('defenseBonus');
  if (defBonus > 0) {
    defense *= 1 + defBonus;
  }

  // Throne room ruler attack bonus
  const rulerAttackBonus = throneRoomRulerBonus('attack');
  if (rulerAttackBonus !== 0) {
    attack *= 1 + rulerAttackBonus;
  }

  const undeadBonus =
    researchUnlockGetPassiveBonusWithMastery('undeadEfficiency');
  if (undeadBonus > 0 && definition.type === 'undead') {
    workerEfficiency *= 1 + undeadBonus;
  }

  const globalEfficiency = researchUnlockGetPassiveBonusWithMastery(
    'globalWorkerEfficiency',
  );
  if (globalEfficiency > 0) {
    workerEfficiency *= 1 + globalEfficiency;
  }

  // Clamp
  return {
    hp: Math.max(1, Math.round(hp)),
    attack: Math.max(0, Math.round(attack)),
    defense: Math.max(0, Math.round(defense)),
    speed: Math.max(1, Math.round(speed)),
    workerEfficiency: Math.max(0.1, Math.round(workerEfficiency * 100) / 100),
  };
}
