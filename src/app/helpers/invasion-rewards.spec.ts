import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CapturedPrisoner,
  DetailedInvasionResult,
} from '@interfaces/invasion';
import type { InvaderClassType, InvaderInstance } from '@interfaces/invader';
import {
  INVASION_REWARD_ALL_SECONDARIES_PREVENTED_BONUS,
  INVASION_REWARD_ALTAR_REBUILD_COST,
  INVASION_REWARD_BASE_EXPERIENCE_PER_INVADER,
  INVASION_REWARD_BASE_REPUTATION_GAIN,
  INVASION_REWARD_DEFEAT_GOLD_LOSS_PERCENT,
  INVASION_REWARD_DEFEAT_REPUTATION_LOSS,
  INVASION_REWARD_PRISONER_CAPTURE_CHANCE,
  INVASION_REWARD_REPUTATION_PER_KILL,
  invasionRewardCalculateDefensePenalties,
  invasionRewardCalculateDefenseRewards,
  invasionRewardGetAltarRebuildCost,
  invasionRewardGetClassLoot,
  invasionRewardGetConvertSuccessRate,
  invasionRewardGetRansomGoldValue,
  invasionRewardHandleConvert,
  invasionRewardHandleExecute,
  invasionRewardHandleExperiment,
  invasionRewardHandlePrisoner,
  invasionRewardHandleRansom,
  invasionRewardHandleSacrifice,
  invasionRewardRollLoot,
  invasionRewardRollPrisonerCaptures,
} from '@helpers/invasion-rewards';

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'test-uuid',
}));

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
}));

// --- Helpers ---

function makeResult(overrides: Partial<DetailedInvasionResult> = {}): DetailedInvasionResult {
  return {
    invasionId: 'inv-1',
    day: 42,
    outcome: 'victory',
    endReason: 'all_invaders_eliminated',
    turnsTaken: 15,
    invaderCount: 5,
    invadersKilled: 4,
    defenderCount: 3,
    defendersLost: 1,
    objectivesCompleted: 0,
    objectivesTotal: 2,
    rewardMultiplier: 1.5,
    ...overrides,
  };
}

function makePrisoner(
  invaderClass: InvaderClassType = 'warrior',
  overrides: Partial<CapturedPrisoner> = {},
): CapturedPrisoner {
  return {
    id: 'prisoner-1',
    invaderClass,
    name: 'Captured Warrior',
    stats: { hp: 20, attack: 8, defense: 5, speed: 3 },
    captureDay: 42,
    ...overrides,
  };
}

function makeInvader(id: string, defId: string): InvaderInstance {
  return {
    id,
    definitionId: defId,
    currentHp: 5,
    maxHp: 20,
    statusEffects: [],
    abilityStates: [],
  };
}

function fixedRng(value: number): () => number {
  return () => value;
}

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

// --- Tests ---

describe('invasion-rewards', () => {
  describe('constants', () => {
    it('should have correct base reputation gain', () => {
      expect(INVASION_REWARD_BASE_REPUTATION_GAIN).toBe(5);
    });

    it('should have correct reputation per kill', () => {
      expect(INVASION_REWARD_REPUTATION_PER_KILL).toBe(1);
    });

    it('should have correct all-secondaries-prevented bonus', () => {
      expect(INVASION_REWARD_ALL_SECONDARIES_PREVENTED_BONUS).toBe(3);
    });

    it('should have correct defeat reputation loss', () => {
      expect(INVASION_REWARD_DEFEAT_REPUTATION_LOSS).toBe(3);
    });

    it('should have correct defeat gold loss percent', () => {
      expect(INVASION_REWARD_DEFEAT_GOLD_LOSS_PERCENT).toBe(0.2);
    });

    it('should have correct prisoner capture chance', () => {
      expect(INVASION_REWARD_PRISONER_CAPTURE_CHANCE).toBe(0.3);
    });

    it('should have correct altar rebuild cost', () => {
      expect(INVASION_REWARD_ALTAR_REBUILD_COST).toEqual({
        crystals: 100,
        gold: 50,
        flux: 20,
      });
    });
  });

  describe('invasionRewardCalculateDefenseRewards', () => {
    it('should calculate base reputation gain', () => {
      const result = makeResult({ invadersKilled: 0, objectivesCompleted: 1 });
      const rewards = invasionRewardCalculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(INVASION_REWARD_BASE_REPUTATION_GAIN);
    });

    it('should add reputation per kill', () => {
      const result = makeResult({ invadersKilled: 3, objectivesCompleted: 1 });
      const rewards = invasionRewardCalculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(INVASION_REWARD_BASE_REPUTATION_GAIN + 3 * INVASION_REWARD_REPUTATION_PER_KILL);
    });

    it('should add bonus when all secondaries prevented', () => {
      const result = makeResult({ invadersKilled: 2, objectivesCompleted: 0, objectivesTotal: 2 });
      const rewards = invasionRewardCalculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(
        INVASION_REWARD_BASE_REPUTATION_GAIN + 2 * INVASION_REWARD_REPUTATION_PER_KILL + INVASION_REWARD_ALL_SECONDARIES_PREVENTED_BONUS,
      );
    });

    it('should not add secondaries bonus when some completed', () => {
      const result = makeResult({ invadersKilled: 2, objectivesCompleted: 1, objectivesTotal: 2 });
      const rewards = invasionRewardCalculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(INVASION_REWARD_BASE_REPUTATION_GAIN + 2 * INVASION_REWARD_REPUTATION_PER_KILL);
    });

    it('should not add secondaries bonus when no secondaries', () => {
      const result = makeResult({ invadersKilled: 1, objectivesCompleted: 0, objectivesTotal: 0 });
      const rewards = invasionRewardCalculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(INVASION_REWARD_BASE_REPUTATION_GAIN + INVASION_REWARD_REPUTATION_PER_KILL);
    });

    it('should calculate experience scaled by reward multiplier', () => {
      const result = makeResult({ invaderCount: 5, rewardMultiplier: 1.5 });
      const rewards = invasionRewardCalculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.experienceGain).toBe(
        Math.round(5 * INVASION_REWARD_BASE_EXPERIENCE_PER_INVADER * 1.5),
      );
    });

    it('should roll class-based gold loot', () => {
      const result = makeResult({ rewardMultiplier: 1.0 });
      const rewards = invasionRewardCalculateDefenseRewards(
        result,
        ['warrior', 'rogue'],
        fixedRng(0.5),
      );
      expect(rewards.goldGain).toBeGreaterThan(0);
    });

    it('should roll class-based bonus resource loot', () => {
      const result = makeResult({ rewardMultiplier: 1.0 });
      const rewards = invasionRewardCalculateDefenseRewards(
        result,
        ['mage'],
        fixedRng(0.5),
      );
      expect(rewards.resourceGains.flux).toBeGreaterThan(0);
    });

    it('should apply reward multiplier to gold', () => {
      const result1 = makeResult({ rewardMultiplier: 1.0 });
      const result2 = makeResult({ rewardMultiplier: 2.0 });
      const rewards1 = invasionRewardCalculateDefenseRewards(result1, ['warrior'], fixedRng(0.5));
      const rewards2 = invasionRewardCalculateDefenseRewards(result2, ['warrior'], fixedRng(0.5));
      expect(rewards2.goldGain).toBe(rewards1.goldGain * 2);
    });

    it('should start with empty prisoners', () => {
      const result = makeResult();
      const rewards = invasionRewardCalculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.capturedPrisoners).toEqual([]);
    });
  });

  describe('invasionRewardCalculateDefensePenalties', () => {
    it('should calculate gold loss as 20% of current gold', () => {
      const result = makeResult({ outcome: 'defeat' });
      const penalties = invasionRewardCalculateDefensePenalties(result, 500);
      expect(penalties.goldLost).toBe(100);
    });

    it('should calculate gold loss correctly for small amounts', () => {
      const result = makeResult({ outcome: 'defeat' });
      const penalties = invasionRewardCalculateDefensePenalties(result, 10);
      expect(penalties.goldLost).toBe(2);
    });

    it('should apply fixed reputation loss', () => {
      const result = makeResult({ outcome: 'defeat' });
      const penalties = invasionRewardCalculateDefensePenalties(result, 100);
      expect(penalties.reputationLoss).toBe(INVASION_REWARD_DEFEAT_REPUTATION_LOSS);
    });

    it('should calculate resource losses for completed objectives', () => {
      const result = makeResult({ outcome: 'defeat', objectivesCompleted: 2 });
      const penalties = invasionRewardCalculateDefensePenalties(result, 100);
      expect(penalties.resourceLosses.crystals).toBe(20);
      expect(penalties.resourceLosses.essence).toBe(10);
    });

    it('should have no resource losses when no objectives completed', () => {
      const result = makeResult({ outcome: 'defeat', objectivesCompleted: 0 });
      const penalties = invasionRewardCalculateDefensePenalties(result, 100);
      expect(penalties.resourceLosses).toEqual({});
    });

    it('should start with empty killed inhabitants', () => {
      const result = makeResult({ outcome: 'defeat' });
      const penalties = invasionRewardCalculateDefensePenalties(result, 100);
      expect(penalties.killedInhabitantIds).toEqual([]);
    });
  });

  describe('invasionRewardGetClassLoot', () => {
    it('should return loot for each invader class', () => {
      const classes: InvaderClassType[] = [
        'warrior', 'rogue', 'mage', 'cleric', 'paladin', 'ranger',
      ];
      for (const cls of classes) {
        const loot = invasionRewardGetClassLoot(cls);
        expect(loot.goldMin).toBeLessThanOrEqual(loot.goldMax);
        expect(loot.bonusMin).toBeLessThanOrEqual(loot.bonusMax);
        expect(loot.bonusResource).toBeDefined();
      }
    });

    it('should return different bonus resources per class', () => {
      const warrior = invasionRewardGetClassLoot('warrior');
      const mage = invasionRewardGetClassLoot('mage');
      expect(warrior.bonusResource).toBe('crystals');
      expect(mage.bonusResource).toBe('flux');
    });
  });

  describe('invasionRewardRollLoot', () => {
    it('should roll gold within range', () => {
      const loot = invasionRewardRollLoot('warrior', fixedRng(0));
      const classLoot = invasionRewardGetClassLoot('warrior');
      expect(loot.gold).toBe(classLoot.goldMin);

      const loot2 = invasionRewardRollLoot('warrior', fixedRng(1));
      expect(loot2.gold).toBe(classLoot.goldMax);
    });

    it('should roll bonus resource within range', () => {
      const loot = invasionRewardRollLoot('mage', fixedRng(0));
      const classLoot = invasionRewardGetClassLoot('mage');
      expect(loot.bonusResource).toBe('flux');
      expect(loot.bonusAmount).toBe(classLoot.bonusMin);
    });
  });

  describe('invasionRewardRollPrisonerCaptures', () => {
    beforeEach(() => {
      mockContent.clear();
      mockContent.set('def-warrior', {
        id: 'def-warrior',
        name: 'Warrior',
        invaderClass: 'warrior',
        baseStats: { hp: 20, attack: 8, defense: 5, speed: 3 },
        abilityIds: [],
        sprite: 'warrior.png',
      });
      mockContent.set('def-rogue', {
        id: 'def-rogue',
        name: 'Rogue',
        invaderClass: 'rogue',
        baseStats: { hp: 15, attack: 10, defense: 3, speed: 6 },
        abilityIds: [],
        sprite: 'rogue.png',
      });
    });

    it('should capture invaders below capture chance threshold', () => {
      const invaders = [makeInvader('a', 'def-warrior')];
      const prisoners = invasionRewardRollPrisonerCaptures(invaders, 42, fixedRng(0.1));
      expect(prisoners).toHaveLength(1);
      expect(prisoners[0].invaderClass).toBe('warrior');
      expect(prisoners[0].name).toBe('Captured Warrior');
      expect(prisoners[0].captureDay).toBe(42);
    });

    it('should not capture invaders above capture chance threshold', () => {
      const invaders = [makeInvader('a', 'def-warrior')];
      const prisoners = invasionRewardRollPrisonerCaptures(invaders, 42, fixedRng(0.5));
      expect(prisoners).toHaveLength(0);
    });

    it('should capture some and miss others', () => {
      const invaders = [
        makeInvader('a', 'def-warrior'),
        makeInvader('b', 'def-rogue'),
      ];
      // First roll 0.1 (capture), second roll 0.5 (miss)
      const prisoners = invasionRewardRollPrisonerCaptures(invaders, 42, sequenceRng([0.1, 0.5]));
      expect(prisoners).toHaveLength(1);
      expect(prisoners[0].invaderClass).toBe('warrior');
    });

    it('should copy invader stats to prisoner', () => {
      const invaders = [makeInvader('a', 'def-warrior')];
      const prisoners = invasionRewardRollPrisonerCaptures(invaders, 42, fixedRng(0.1));
      expect(prisoners[0].stats).toEqual({ hp: 20, attack: 8, defense: 5, speed: 3 });
    });

    it('should skip invaders with unknown definitions', () => {
      const invaders = [makeInvader('a', 'nonexistent')];
      const prisoners = invasionRewardRollPrisonerCaptures(invaders, 42, fixedRng(0.1));
      expect(prisoners).toHaveLength(0);
    });

    it('should have ~30% capture rate over many trials', () => {
      const invaders = [makeInvader('a', 'def-warrior')];
      let captures = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const rng = () => i / trials;
        const p = invasionRewardRollPrisonerCaptures(invaders, 42, rng);
        if (p.length > 0) captures++;
      }
      expect(captures).toBe(30);
    });
  });

  describe('prisoner handling', () => {
    describe('invasionRewardHandleExecute', () => {
      it('should return execute result with fear and reputation', () => {
        const result = invasionRewardHandleExecute();
        expect(result.action).toBe('execute');
        expect(result.success).toBe(true);
        expect(result.fearChange).toBe(2);
        expect(result.reputationChange).toBe(1);
        expect(result.corruptionChange).toBe(0);
      });
    });

    describe('invasionRewardHandleRansom', () => {
      it('should return gold scaled by class', () => {
        const prisoner = makePrisoner('paladin');
        const result = invasionRewardHandleRansom(prisoner);
        expect(result.action).toBe('ransom');
        expect(result.resourceChanges.gold).toBe(50);
        expect(result.reputationChange).toBe(-1);
      });

      it('should return less gold for rangers', () => {
        const prisoner = makePrisoner('ranger');
        const result = invasionRewardHandleRansom(prisoner);
        expect(result.resourceChanges.gold).toBe(20);
      });
    });

    describe('invasionRewardHandleConvert', () => {
      it('should succeed when roll is below success rate', () => {
        const prisoner = makePrisoner('rogue');
        const result = invasionRewardHandleConvert(prisoner, fixedRng(0.1));
        expect(result.action).toBe('convert');
        expect(result.success).toBe(true);
        expect(result.corruptionChange).toBe(5);
      });

      it('should fail when roll is above success rate', () => {
        const prisoner = makePrisoner('paladin');
        const result = invasionRewardHandleConvert(prisoner, fixedRng(0.9));
        expect(result.success).toBe(false);
      });

      it('should have higher success rate for rogues than paladins', () => {
        expect(invasionRewardGetConvertSuccessRate('rogue')).toBeGreaterThan(
          invasionRewardGetConvertSuccessRate('paladin'),
        );
      });
    });

    describe('invasionRewardHandleSacrifice', () => {
      it('should grant random boon resource', () => {
        const result = invasionRewardHandleSacrifice(fixedRng(0));
        expect(result.action).toBe('sacrifice');
        expect(result.success).toBe(true);
        expect(result.corruptionChange).toBe(5);
        expect(result.reputationChange).toBe(2);
        // The boon resource should be one of flux, essence, research
        const resourceKeys = Object.keys(result.resourceChanges).filter(
          (k) => k !== 'corruption',
        );
        expect(resourceKeys.length).toBeGreaterThan(0);
      });

      it('should add corruption resource change', () => {
        const result = invasionRewardHandleSacrifice(fixedRng(0.5));
        expect(result.resourceChanges.corruption).toBe(5);
      });
    });

    describe('invasionRewardHandleExperiment', () => {
      it('should grant research scaled by stats', () => {
        const prisoner = makePrisoner('warrior', {
          stats: { hp: 20, attack: 8, defense: 5, speed: 3 },
        });
        const result = invasionRewardHandleExperiment(prisoner);
        expect(result.action).toBe('experiment');
        expect(result.success).toBe(true);
        // (20+8+5+3)/4 = 9
        expect(result.resourceChanges.research).toBe(9);
        expect(result.corruptionChange).toBe(3);
      });

      it('should scale with stronger invaders', () => {
        const weakPrisoner = makePrisoner('warrior', {
          stats: { hp: 10, attack: 4, defense: 2, speed: 2 },
        });
        const strongPrisoner = makePrisoner('paladin', {
          stats: { hp: 40, attack: 16, defense: 12, speed: 4 },
        });
        const weakResult = invasionRewardHandleExperiment(weakPrisoner);
        const strongResult = invasionRewardHandleExperiment(strongPrisoner);
        expect(strongResult.resourceChanges.research!).toBeGreaterThan(
          weakResult.resourceChanges.research!,
        );
      });
    });

    describe('invasionRewardHandlePrisoner', () => {
      it('should dispatch to execute', () => {
        const prisoner = makePrisoner();
        const result = invasionRewardHandlePrisoner('execute', prisoner);
        expect(result.action).toBe('execute');
      });

      it('should dispatch to ransom', () => {
        const prisoner = makePrisoner('paladin');
        const result = invasionRewardHandlePrisoner('ransom', prisoner);
        expect(result.action).toBe('ransom');
        expect(result.resourceChanges.gold).toBe(50);
      });

      it('should dispatch to convert', () => {
        const prisoner = makePrisoner('rogue');
        const result = invasionRewardHandlePrisoner('convert', prisoner, fixedRng(0.1));
        expect(result.action).toBe('convert');
        expect(result.success).toBe(true);
      });

      it('should dispatch to sacrifice', () => {
        const prisoner = makePrisoner();
        const result = invasionRewardHandlePrisoner('sacrifice', prisoner, fixedRng(0.5));
        expect(result.action).toBe('sacrifice');
      });

      it('should dispatch to experiment', () => {
        const prisoner = makePrisoner();
        const result = invasionRewardHandlePrisoner('experiment', prisoner);
        expect(result.action).toBe('experiment');
      });
    });
  });

  describe('invasionRewardGetConvertSuccessRate', () => {
    it('should return correct rates for each class', () => {
      expect(invasionRewardGetConvertSuccessRate('warrior')).toBe(0.30);
      expect(invasionRewardGetConvertSuccessRate('rogue')).toBe(0.50);
      expect(invasionRewardGetConvertSuccessRate('mage')).toBe(0.20);
      expect(invasionRewardGetConvertSuccessRate('cleric')).toBe(0.10);
      expect(invasionRewardGetConvertSuccessRate('paladin')).toBe(0.05);
      expect(invasionRewardGetConvertSuccessRate('ranger')).toBe(0.35);
    });
  });

  describe('invasionRewardGetRansomGoldValue', () => {
    it('should return correct gold for each class', () => {
      expect(invasionRewardGetRansomGoldValue('warrior')).toBe(30);
      expect(invasionRewardGetRansomGoldValue('rogue')).toBe(25);
      expect(invasionRewardGetRansomGoldValue('mage')).toBe(40);
      expect(invasionRewardGetRansomGoldValue('cleric')).toBe(35);
      expect(invasionRewardGetRansomGoldValue('paladin')).toBe(50);
      expect(invasionRewardGetRansomGoldValue('ranger')).toBe(20);
    });
  });

  describe('invasionRewardGetAltarRebuildCost', () => {
    it('should return a copy of the altar rebuild cost', () => {
      const cost = invasionRewardGetAltarRebuildCost();
      expect(cost).toEqual({ crystals: 100, gold: 50, flux: 20 });
    });

    it('should not share references', () => {
      const cost1 = invasionRewardGetAltarRebuildCost();
      const cost2 = invasionRewardGetAltarRebuildCost();
      expect(cost1).not.toBe(cost2);
    });
  });
});
