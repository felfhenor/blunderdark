import { describe, expect, it } from 'vitest';
import { ensureContent } from '@helpers/content-initializers';
import type { AlchemyRecipeId } from '@interfaces';
import type { FeatureId } from '@interfaces/content-feature';
import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { InhabitantTraitId } from '@interfaces/content-inhabitanttrait';
import type { InvaderId } from '@interfaces/content-invader';
import type { MutationTraitId } from '@interfaces/content-mutationtrait';
import type { RoomId } from '@interfaces/content-room';
import type { RoomUpgradeId } from '@interfaces/content-roomupgrade';
import type { TrapId } from '@interfaces/content-trap';
import type { ForgeRecipeId } from '@interfaces';
import type { FusionRecipeId } from '@interfaces';
import type { SummonRecipeId } from '@interfaces';
import type { SynergyId } from '@interfaces/content-synergy';
import type { CombatAbilityId } from '@interfaces/content-combatability';
import type { CorruptionEffectId } from '@interfaces/content-corruptioneffect';

describe('ensureContent', () => {
  it('should return content unchanged for unknown __type', () => {
    const input = { id: 'x', name: 'X', __type: 'nonexistent' as never };
    expect(ensureContent(input)).toBe(input);
  });

  describe('alchemyrecipe', () => {
    it('should fill defaults for empty alchemy recipe', () => {
      const result = ensureContent({
        id: 'a1' as AlchemyRecipeId,
        name: 'Test',
        __type: 'alchemyrecipe' as const,
      });
      expect(result.description).toBe('');
      expect(result.inputCost).toEqual({});
      expect(result.outputResource).toBe('flux');
      expect(result.outputAmount).toBe(1);
      expect(result.baseTicks).toBe(15);
      expect(result.tier).toBe('basic');
    });

    it('should preserve provided values', () => {
      const result = ensureContent({
        id: 'a1' as AlchemyRecipeId,
        name: 'Test',
        __type: 'alchemyrecipe' as const,
        outputResource: 'essence',
        outputAmount: 5,
        baseTicks: 30,
        tier: 'advanced',
      });
      expect(result.outputResource).toBe('essence');
      expect(result.outputAmount).toBe(5);
      expect(result.baseTicks).toBe(30);
      expect(result.tier).toBe('advanced');
    });
  });

  describe('forgerecipe', () => {
    it('should fill defaults for empty forge recipe', () => {
      const result = ensureContent({
        id: 'f1' as ForgeRecipeId,
        name: 'Test Sword',
        __type: 'forgerecipe' as const,
      });
      expect(result.cost).toEqual({});
      expect(result.timeMultiplier).toBe(1.0);
      expect(result.statBonuses).toEqual({});
      expect(result.tier).toBe('basic');
    });
  });

  describe('fusionrecipe', () => {
    it('should fill defaults for empty fusion recipe', () => {
      const result = ensureContent({
        id: 'fu1' as FusionRecipeId,
        name: 'Test Fusion',
        __type: 'fusionrecipe' as const,
      });
      expect(result.firstInhabitantId).toBe('');
      expect(result.secondInhabitantId).toBe('');
      expect(result.resultInhabitantId).toBe('');
      expect(result.cost).toEqual({});
    });
  });

  describe('feature', () => {
    it('should fill defaults for empty feature', () => {
      const result = ensureContent({
        id: 'feat1' as FeatureId,
        name: 'Test Feature',
        __type: 'feature' as const,
      });
      expect(result.category).toBe('environmental');
      expect(result.cost).toEqual({});
      expect(result.bonuses).toEqual([]);
      expect(result.unique).toBe(false);
      expect(result.maintenanceCost).toBeUndefined();
    });

    it('should ensure bonus sub-objects have defaults', () => {
      const result = ensureContent({
        id: 'feat1' as FeatureId,
        name: 'Test Feature',
        __type: 'feature' as const,
        bonuses: [{ value: 10 }],
      });
      expect(result.bonuses).toHaveLength(1);
      expect(result.bonuses[0].type).toBe('production_bonus');
      expect(result.bonuses[0].value).toBe(10);
      expect(result.bonuses[0].description).toBe('');
    });
  });

  describe('room', () => {
    it('should fill defaults for empty room', () => {
      const result = ensureContent({
        id: 'r1' as RoomId,
        name: 'Test Room',
        __type: 'room' as const,
      });
      expect(result.cost).toEqual({});
      expect(result.production).toEqual({});
      expect(result.requiresWorkers).toBe(false);
      expect(result.adjacencyBonuses).toEqual([]);
      expect(result.maxFeatures).toBe(0);
      expect(result.isUnique).toBe(false);
      expect(result.removable).toBe(true);
      expect(result.maxInhabitants).toBe(-1);
      expect(result.fearLevel).toBe(0);
      expect(result.fearReductionAura).toBe(0);
      expect(result.autoPlace).toBe(false);
      expect(result.roomUpgradeIds).toEqual([]);
      expect(result.trainingTraitNames).toEqual([]);
    });

    it('should ensure adjacency bonus sub-objects have defaults', () => {
      const result = ensureContent({
        id: 'r1' as RoomId,
        name: 'Test Room',
        __type: 'room' as const,
        adjacencyBonuses: [{ bonus: 0.15 }],
      });
      expect(result.adjacencyBonuses).toHaveLength(1);
      expect(result.adjacencyBonuses[0].adjacentRoomId).toBe('');
      expect(result.adjacencyBonuses[0].bonus).toBe(0.15);
      expect(result.adjacencyBonuses[0].description).toBe('');
    });
  });

  describe('roomupgrade', () => {
    it('should fill defaults for empty room upgrade', () => {
      const result = ensureContent({
        id: 'ru1' as RoomUpgradeId,
        name: 'Test Upgrade',
        __type: 'roomupgrade' as const,
      });
      expect(result.cost).toEqual({});
      expect(result.effects).toEqual([]);
      expect(result.requiresDarkUpgrade).toBe(false);
    });

    it('should ensure effect sub-objects have defaults', () => {
      const result = ensureContent({
        id: 'ru1' as RoomUpgradeId,
        name: 'Test Upgrade',
        __type: 'roomupgrade' as const,
        effects: [{ type: 'production_multiplier' }],
      });
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].type).toBe('production_multiplier');
      expect(result.effects[0].value).toBe(0);
    });
  });

  describe('inhabitant', () => {
    it('should fill defaults for empty inhabitant', () => {
      const result = ensureContent({
        id: 'i1' as InhabitantId,
        name: 'Test Creature',
        __type: 'inhabitant' as const,
      });
      expect(result.type).toBe('');
      expect(result.tier).toBe(1);
      expect(result.cost).toEqual({});
      expect(result.stats).toEqual({
        hp: 0,
        attack: 0,
        defense: 0,
        speed: 0,
        workerEfficiency: 1.0,
      });
      expect(result.inhabitantTraitIds).toEqual([]);
      expect(result.traits).toEqual([]);
      expect(result.restrictionTags).toEqual([]);
      expect(result.rulerBonuses).toEqual({});
      expect(result.rulerFearLevel).toBe(0);
      expect(result.fearModifier).toBe(0);
      expect(result.foodConsumptionRate).toBe(0);
      expect(result.corruptionGeneration).toBe(0);
      expect(result.stateModifiers).toEqual({});
      expect(result.upkeepCost).toEqual({});
      expect(result.recruitmentRequirements).toEqual([]);
      expect(result.statOverrides).toEqual({});
      expect(result.combatAbilityIds).toEqual([]);
    });
  });

  describe('inhabitanttrait', () => {
    it('should fill defaults for empty trait', () => {
      const result = ensureContent({
        id: 'it1' as InhabitantTraitId,
        name: 'Test Trait',
        __type: 'inhabitanttrait' as const,
      });
      expect(result.effectType).toBe('');
      expect(result.effectValue).toBe(0);
      expect(result.fusionPassChance).toBe(75);
      expect(result.isFromTraining).toBe(false);
    });
  });

  describe('mutationtrait', () => {
    it('should fill defaults for empty mutation trait', () => {
      const result = ensureContent({
        id: 'mt1' as MutationTraitId,
        name: 'Test Mutation',
        __type: 'mutationtrait' as const,
      });
      expect(result.rarity).toBe('common');
      expect(result.isNegative).toBe(false);
      expect(result.modifiers).toEqual([]);
      // common positive default fusionPassChance
      expect(result.fusionPassChance).toBe(50);
    });

    it('should compute correct fusionPassChance for rarity and negativity', () => {
      const uncommonNeg = ensureContent({
        id: 'mt2' as MutationTraitId,
        name: 'Uncommon Neg',
        __type: 'mutationtrait' as const,
        rarity: 'uncommon',
        isNegative: true,
      });
      expect(uncommonNeg.fusionPassChance).toBe(50); // uncommon negative default

      const rare = ensureContent({
        id: 'mt3' as MutationTraitId,
        name: 'Rare Pos',
        __type: 'mutationtrait' as const,
        rarity: 'rare',
      });
      expect(rare.fusionPassChance).toBe(25);

      const epic = ensureContent({
        id: 'mt4' as MutationTraitId,
        name: 'Epic Pos',
        __type: 'mutationtrait' as const,
        rarity: 'epic',
      });
      expect(epic.fusionPassChance).toBe(15);
    });

    it('should ensure modifier sub-objects have defaults', () => {
      const result = ensureContent({
        id: 'mt5' as MutationTraitId,
        name: 'Test',
        __type: 'mutationtrait' as const,
        modifiers: [{ bonus: 5 }],
      });
      expect(result.modifiers[0].stat).toBe('hp');
      expect(result.modifiers[0].bonus).toBe(5);
    });
  });

  describe('invader', () => {
    it('should fill defaults for empty invader', () => {
      const result = ensureContent({
        id: 'inv1' as InvaderId,
        name: 'Test Invader',
        __type: 'invader' as const,
      });
      expect(result.invaderClass).toBe('warrior');
      expect(result.baseStats).toEqual({
        hp: 0,
        attack: 0,
        defense: 0,
        speed: 0,
      });
      expect(result.combatAbilityIds).toEqual([]);
      expect(result.sprite).toBe('UNKNOWN');
    });
  });

  describe('trap', () => {
    it('should fill defaults for empty trap', () => {
      const result = ensureContent({
        id: 't1' as TrapId,
        name: 'Test Trap',
        __type: 'trap' as const,
      });
      expect(result.effectType).toBe('physical');
      expect(result.damage).toBe(0);
      expect(result.charges).toBe(1);
      expect(result.triggerChance).toBe(0.5);
      expect(result.canBeDisarmed).toBe(true);
    });
  });

  describe('combatability', () => {
    it('should fill defaults for empty combat ability', () => {
      const result = ensureContent({
        id: 'ca1' as CombatAbilityId,
        name: 'Test Ability',
        __type: 'combatability' as const,
      });
      expect(result.chance).toBe(0);
      expect(result.cooldown).toBe(0);
      expect(result.effects).toEqual([]);
    });

    it('should ensure effect sub-objects have defaults', () => {
      const result = ensureContent({
        id: 'ca2' as CombatAbilityId,
        name: 'Test Ability',
        __type: 'combatability' as const,
        effects: [{ effectType: 'damage', value: 150 }],
      });
      expect(result.effects[0].targetType).toBe('single');
      expect(result.effects[0].duration).toBe(0);
    });
  });

  describe('corruptioneffect', () => {
    it('should fill defaults for empty corruption effect', () => {
      const result = ensureContent({
        id: 'ce1' as CorruptionEffectId,
        name: 'Test Effect',
        __type: 'corruptioneffect' as const,
      });
      expect(result.triggerType).toBe('threshold');
      expect(result.triggerValue).toBe(0);
      expect(result.oneTime).toBe(false);
      expect(result.retriggerable).toBe(false);
      expect(result.behavior).toBe('event');
      expect(result.effectType).toBe('visual');
    });
  });

  describe('summonrecipe', () => {
    it('should fill defaults for empty summon recipe', () => {
      const result = ensureContent({
        id: 'sr1' as SummonRecipeId,
        name: 'Test Summon',
        __type: 'summonrecipe' as const,
      });
      expect(result.resultInhabitantId).toBe('');
      expect(result.cost).toEqual({});
      expect(result.timeMultiplier).toBe(1.0);
      expect(result.statBonuses).toEqual({});
      expect(result.tier).toBe('rare');
    });
  });

  describe('synergy', () => {
    it('should fill defaults for empty synergy', () => {
      const result = ensureContent({
        id: 'sy1' as SynergyId,
        name: 'Test Synergy',
        __type: 'synergy' as const,
      });
      expect(result.conditions).toEqual([]);
      expect(result.effects).toEqual([]);
    });
  });

  describe('research', () => {
    it('should fill defaults for empty research node', () => {
      const result = ensureContent({
        id: 'res1' as never,
        name: 'Test Research',
        __type: 'research' as const,
      });
      expect(result.branch).toBe('dark');
      expect(result.cost).toEqual({});
      expect(result.prerequisiteResearchIds).toEqual([]);
      expect(result.unlocks).toEqual([]);
      expect(result.tier).toBe(1);
      expect(result.requiredTicks).toBe(50);
    });
  });
});
