import { contentGetEntry } from '@helpers/content';
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

  // Clamp
  return {
    hp: Math.max(1, hp),
    attack: Math.max(0, attack),
    defense: Math.max(0, defense),
    speed: Math.max(1, speed),
    workerEfficiency: Math.max(0.1, Math.round(workerEfficiency * 100) / 100),
  };
}
