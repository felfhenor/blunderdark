import { contentGetEntry } from '@helpers/content';
import { lichGetUndeadMasterBonusForInstance } from '@helpers/lich';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { gamestate } from '@helpers/state-game';
import { throneRoomRulerBonus } from '@helpers/throne-room';
import type { InhabitantStats } from '@interfaces/inhabitant';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { InhabitantTraitContent, TraitEffect } from '@interfaces/content-inhabitanttrait';
import type { InhabitantInstance } from '@interfaces/inhabitant';
import type { MutationTraitContent } from '@interfaces/content-mutationtrait';

function applyStatEffect(
  effect: TraitEffect,
  attack: number,
  defense: number,
  workerEfficiency: number,
): { attack: number; defense: number; workerEfficiency: number } {
  switch (effect.effectType) {
    case 'attack_multiplier':
      attack *= 1 + effect.effectValue;
      break;
    case 'defense_multiplier':
      defense *= 1 + effect.effectValue;
      break;
    case 'attack_flat':
      attack += effect.effectValue;
      break;
    case 'defense_flat':
      defense += effect.effectValue;
      break;
    case 'worker_efficiency_multiplier':
      workerEfficiency *= 1 + effect.effectValue;
      break;
  }
  return { attack, defense, workerEfficiency };
}

/**
 * Compute effective stats for an inhabitant:
 * base stats + instanceStatBonuses + mutation trait bonuses + instance trait bonuses + roommate auras.
 * Pass roommates (other inhabitants in the same room) to include their isAura trait effects.
 * Clamps: hp >= 1, attack >= 0, defense >= 0, speed >= 1, workerEfficiency >= 0.1
 */
export function effectiveStatsCalculate(
  definition: InhabitantContent,
  instance: InhabitantInstance,
  roommates?: InhabitantInstance[],
): InhabitantStats {
  const base = definition.stats;

  let hp = base.hp;
  let attack = base.attack;
  let defense = base.defense;
  let speed = base.speed;
  let workerEfficiency = base.workerEfficiency;

  // Instance stat bonuses (from hybrids, summoning)
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

  // Definition trait bonuses (from innate creature traits)
  for (const trait of definition.traits ?? []) {
    for (const effect of trait.effects) {
      switch (effect.effectType) {
        case 'attack_multiplier':
          attack *= 1 + effect.effectValue;
          break;
        case 'defense_multiplier':
          defense *= 1 + effect.effectValue;
          break;
        case 'attack_flat':
          attack += effect.effectValue;
          break;
        case 'defense_flat':
          defense += effect.effectValue;
          break;
        case 'worker_efficiency_multiplier':
          workerEfficiency *= 1 + effect.effectValue;
          break;
      }
    }
  }

  // Instance trait bonuses (from breeding hybrids, training, etc.)
  if (instance.instanceTraitIds) {
    for (const traitId of instance.instanceTraitIds) {
      const trait = contentGetEntry<InhabitantTraitContent>(traitId);
      if (!trait) continue;
      for (const effect of trait.effects) {
        switch (effect.effectType) {
          case 'attack_multiplier':
            attack *= 1 + effect.effectValue;
            break;
          case 'defense_multiplier':
            defense *= 1 + effect.effectValue;
            break;
          case 'attack_flat':
            attack += effect.effectValue;
            break;
          case 'defense_flat':
            defense += effect.effectValue;
            break;
          case 'worker_efficiency_multiplier':
            workerEfficiency *= 1 + effect.effectValue;
            break;
        }
      }
    }
  }

  // Equipped trait bonuses (from masterwork forge items)
  if (instance.equippedTraitIds) {
    for (const traitId of instance.equippedTraitIds) {
      const trait = contentGetEntry<InhabitantTraitContent>(traitId);
      if (!trait) continue;
      for (const effect of trait.effects) {
        switch (effect.effectType) {
          case 'attack_multiplier':
            attack *= 1 + effect.effectValue;
            break;
          case 'defense_multiplier':
            defense *= 1 + effect.effectValue;
            break;
          case 'attack_flat':
            attack += effect.effectValue;
            break;
          case 'defense_flat':
            defense += effect.effectValue;
            break;
          case 'worker_efficiency_multiplier':
            workerEfficiency *= 1 + effect.effectValue;
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

  // Roommate aura bonuses (isAura traits from other inhabitants in the same room)
  if (roommates) {
    for (const roommate of roommates) {
      if (roommate.instanceId === instance.instanceId) continue;

      // Definition aura traits
      const rmDef = contentGetEntry<InhabitantContent>(roommate.definitionId);
      for (const trait of rmDef?.traits ?? []) {
        for (const effect of trait.effects) {
          if (!effect.isAura) continue;
          ({ attack, defense, workerEfficiency } = applyStatEffect(effect, attack, defense, workerEfficiency));
        }
      }

      // Instance aura traits
      for (const traitId of roommate.instanceTraitIds ?? []) {
        const trait = contentGetEntry<InhabitantTraitContent>(traitId);
        if (!trait) continue;
        for (const effect of trait.effects) {
          if (!effect.isAura) continue;
          ({ attack, defense, workerEfficiency } = applyStatEffect(effect, attack, defense, workerEfficiency));
        }
      }

      // Equipped aura traits
      for (const traitId of roommate.equippedTraitIds ?? []) {
        const trait = contentGetEntry<InhabitantTraitContent>(traitId);
        if (!trait) continue;
        for (const effect of trait.effects) {
          if (!effect.isAura) continue;
          ({ attack, defense, workerEfficiency } = applyStatEffect(effect, attack, defense, workerEfficiency));
        }
      }
    }
  }

  // Dungeon-wide stat bonuses (isDungeonWide traits from all inhabitants)
  const allInhabitants = gamestate()?.world?.inhabitants ?? [];
  for (const other of allInhabitants) {
    if (other.instanceId === instance.instanceId) continue;

    const otherDef = contentGetEntry<InhabitantContent>(other.definitionId);
    for (const trait of otherDef?.traits ?? []) {
      for (const effect of trait.effects) {
        if (!effect.isDungeonWide) continue;
        ({ attack, defense, workerEfficiency } = applyStatEffect(effect, attack, defense, workerEfficiency));
      }
    }

    for (const traitId of other.instanceTraitIds ?? []) {
      const trait = contentGetEntry<InhabitantTraitContent>(traitId);
      if (!trait) continue;
      for (const effect of trait.effects) {
        if (!effect.isDungeonWide) continue;
        ({ attack, defense, workerEfficiency } = applyStatEffect(effect, attack, defense, workerEfficiency));
      }
    }

    for (const traitId of other.equippedTraitIds ?? []) {
      const trait = contentGetEntry<InhabitantTraitContent>(traitId);
      if (!trait) continue;
      for (const effect of trait.effects) {
        if (!effect.isDungeonWide) continue;
        ({ attack, defense, workerEfficiency } = applyStatEffect(effect, attack, defense, workerEfficiency));
      }
    }
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

  // Undead Master aura bonus (from nearby Lich-type inhabitants)
  const lichBonus = lichGetUndeadMasterBonusForInstance(instance);
  if (lichBonus.attackBonus > 0 || lichBonus.defenseBonus > 0) {
    attack += lichBonus.attackBonus;
    defense += lichBonus.defenseBonus;
  }

  // Efficiency floor (from efficiency_floor traits — guarantees a minimum workerEfficiency)
  let efficiencyFloor = 0;
  for (const trait of definition.traits ?? []) {
    for (const effect of trait.effects) {
      if (effect.effectType === 'efficiency_floor') {
        efficiencyFloor = Math.max(efficiencyFloor, effect.effectValue);
      }
    }
  }
  for (const traitId of instance.instanceTraitIds ?? []) {
    const trait = contentGetEntry<InhabitantTraitContent>(traitId);
    if (!trait) continue;
    for (const effect of trait.effects) {
      if (effect.effectType === 'efficiency_floor') {
        efficiencyFloor = Math.max(efficiencyFloor, effect.effectValue);
      }
    }
  }
  for (const traitId of instance.equippedTraitIds ?? []) {
    const trait = contentGetEntry<InhabitantTraitContent>(traitId);
    if (!trait) continue;
    for (const effect of trait.effects) {
      if (effect.effectType === 'efficiency_floor') {
        efficiencyFloor = Math.max(efficiencyFloor, effect.effectValue);
      }
    }
  }
  if (efficiencyFloor > 0) {
    workerEfficiency = Math.max(workerEfficiency, efficiencyFloor);
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
