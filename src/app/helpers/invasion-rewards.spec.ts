import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CapturedPrisoner,
  DetailedInvasionResult,
} from '@interfaces/invasion';
import type { InvaderClassType, InvaderInstance } from '@interfaces/invader';
import {
  ALL_SECONDARIES_PREVENTED_BONUS,
  ALTAR_REBUILD_COST,
  BASE_EXPERIENCE_PER_INVADER,
  BASE_REPUTATION_GAIN,
  DEFEAT_GOLD_LOSS_PERCENT,
  DEFEAT_REPUTATION_LOSS,
  PRISONER_CAPTURE_CHANCE,
  REPUTATION_PER_KILL,
  calculateDefensePenalties,
  calculateDefenseRewards,
  getAltarRebuildCost,
  getClassLoot,
  getConvertSuccessRate,
  getRansomGoldValue,
  handleConvert,
  handleExecute,
  handleExperiment,
  handlePrisoner,
  handleRansom,
  handleSacrifice,
  rollInvaderLoot,
  rollPrisonerCaptures,
} from '@helpers/invasion-rewards';

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'test-uuid',
}));

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id) ?? undefined,
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
      expect(BASE_REPUTATION_GAIN).toBe(5);
    });

    it('should have correct reputation per kill', () => {
      expect(REPUTATION_PER_KILL).toBe(1);
    });

    it('should have correct all-secondaries-prevented bonus', () => {
      expect(ALL_SECONDARIES_PREVENTED_BONUS).toBe(3);
    });

    it('should have correct defeat reputation loss', () => {
      expect(DEFEAT_REPUTATION_LOSS).toBe(3);
    });

    it('should have correct defeat gold loss percent', () => {
      expect(DEFEAT_GOLD_LOSS_PERCENT).toBe(0.2);
    });

    it('should have correct prisoner capture chance', () => {
      expect(PRISONER_CAPTURE_CHANCE).toBe(0.3);
    });

    it('should have correct altar rebuild cost', () => {
      expect(ALTAR_REBUILD_COST).toEqual({
        crystals: 100,
        gold: 50,
        flux: 20,
      });
    });
  });

  describe('calculateDefenseRewards', () => {
    it('should calculate base reputation gain', () => {
      const result = makeResult({ invadersKilled: 0, objectivesCompleted: 1 });
      const rewards = calculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(BASE_REPUTATION_GAIN);
    });

    it('should add reputation per kill', () => {
      const result = makeResult({ invadersKilled: 3, objectivesCompleted: 1 });
      const rewards = calculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(BASE_REPUTATION_GAIN + 3 * REPUTATION_PER_KILL);
    });

    it('should add bonus when all secondaries prevented', () => {
      const result = makeResult({ invadersKilled: 2, objectivesCompleted: 0, objectivesTotal: 2 });
      const rewards = calculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(
        BASE_REPUTATION_GAIN + 2 * REPUTATION_PER_KILL + ALL_SECONDARIES_PREVENTED_BONUS,
      );
    });

    it('should not add secondaries bonus when some completed', () => {
      const result = makeResult({ invadersKilled: 2, objectivesCompleted: 1, objectivesTotal: 2 });
      const rewards = calculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(BASE_REPUTATION_GAIN + 2 * REPUTATION_PER_KILL);
    });

    it('should not add secondaries bonus when no secondaries', () => {
      const result = makeResult({ invadersKilled: 1, objectivesCompleted: 0, objectivesTotal: 0 });
      const rewards = calculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.reputationGain).toBe(BASE_REPUTATION_GAIN + REPUTATION_PER_KILL);
    });

    it('should calculate experience scaled by reward multiplier', () => {
      const result = makeResult({ invaderCount: 5, rewardMultiplier: 1.5 });
      const rewards = calculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.experienceGain).toBe(
        Math.round(5 * BASE_EXPERIENCE_PER_INVADER * 1.5),
      );
    });

    it('should roll class-based gold loot', () => {
      const result = makeResult({ rewardMultiplier: 1.0 });
      const rewards = calculateDefenseRewards(
        result,
        ['warrior', 'rogue'],
        fixedRng(0.5),
      );
      expect(rewards.goldGain).toBeGreaterThan(0);
    });

    it('should roll class-based bonus resource loot', () => {
      const result = makeResult({ rewardMultiplier: 1.0 });
      const rewards = calculateDefenseRewards(
        result,
        ['mage'],
        fixedRng(0.5),
      );
      expect(rewards.resourceGains.flux).toBeGreaterThan(0);
    });

    it('should apply reward multiplier to gold', () => {
      const result1 = makeResult({ rewardMultiplier: 1.0 });
      const result2 = makeResult({ rewardMultiplier: 2.0 });
      const rewards1 = calculateDefenseRewards(result1, ['warrior'], fixedRng(0.5));
      const rewards2 = calculateDefenseRewards(result2, ['warrior'], fixedRng(0.5));
      expect(rewards2.goldGain).toBe(rewards1.goldGain * 2);
    });

    it('should start with empty prisoners', () => {
      const result = makeResult();
      const rewards = calculateDefenseRewards(result, [], fixedRng(0.5));
      expect(rewards.capturedPrisoners).toEqual([]);
    });
  });

  describe('calculateDefensePenalties', () => {
    it('should calculate gold loss as 20% of current gold', () => {
      const result = makeResult({ outcome: 'defeat' });
      const penalties = calculateDefensePenalties(result, 500);
      expect(penalties.goldLost).toBe(100);
    });

    it('should calculate gold loss correctly for small amounts', () => {
      const result = makeResult({ outcome: 'defeat' });
      const penalties = calculateDefensePenalties(result, 10);
      expect(penalties.goldLost).toBe(2);
    });

    it('should apply fixed reputation loss', () => {
      const result = makeResult({ outcome: 'defeat' });
      const penalties = calculateDefensePenalties(result, 100);
      expect(penalties.reputationLoss).toBe(DEFEAT_REPUTATION_LOSS);
    });

    it('should calculate resource losses for completed objectives', () => {
      const result = makeResult({ outcome: 'defeat', objectivesCompleted: 2 });
      const penalties = calculateDefensePenalties(result, 100);
      expect(penalties.resourceLosses.crystals).toBe(20);
      expect(penalties.resourceLosses.essence).toBe(10);
    });

    it('should have no resource losses when no objectives completed', () => {
      const result = makeResult({ outcome: 'defeat', objectivesCompleted: 0 });
      const penalties = calculateDefensePenalties(result, 100);
      expect(penalties.resourceLosses).toEqual({});
    });

    it('should start with empty killed inhabitants', () => {
      const result = makeResult({ outcome: 'defeat' });
      const penalties = calculateDefensePenalties(result, 100);
      expect(penalties.killedInhabitantIds).toEqual([]);
    });
  });

  describe('getClassLoot', () => {
    it('should return loot for each invader class', () => {
      const classes: InvaderClassType[] = [
        'warrior', 'rogue', 'mage', 'cleric', 'paladin', 'ranger',
      ];
      for (const cls of classes) {
        const loot = getClassLoot(cls);
        expect(loot.goldMin).toBeLessThanOrEqual(loot.goldMax);
        expect(loot.bonusMin).toBeLessThanOrEqual(loot.bonusMax);
        expect(loot.bonusResource).toBeDefined();
      }
    });

    it('should return different bonus resources per class', () => {
      const warrior = getClassLoot('warrior');
      const mage = getClassLoot('mage');
      expect(warrior.bonusResource).toBe('crystals');
      expect(mage.bonusResource).toBe('flux');
    });
  });

  describe('rollInvaderLoot', () => {
    it('should roll gold within range', () => {
      const loot = rollInvaderLoot('warrior', fixedRng(0));
      const classLoot = getClassLoot('warrior');
      expect(loot.gold).toBe(classLoot.goldMin);

      const loot2 = rollInvaderLoot('warrior', fixedRng(1));
      expect(loot2.gold).toBe(classLoot.goldMax);
    });

    it('should roll bonus resource within range', () => {
      const loot = rollInvaderLoot('mage', fixedRng(0));
      const classLoot = getClassLoot('mage');
      expect(loot.bonusResource).toBe('flux');
      expect(loot.bonusAmount).toBe(classLoot.bonusMin);
    });
  });

  describe('rollPrisonerCaptures', () => {
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
      const prisoners = rollPrisonerCaptures(invaders, 42, fixedRng(0.1));
      expect(prisoners).toHaveLength(1);
      expect(prisoners[0].invaderClass).toBe('warrior');
      expect(prisoners[0].name).toBe('Captured Warrior');
      expect(prisoners[0].captureDay).toBe(42);
    });

    it('should not capture invaders above capture chance threshold', () => {
      const invaders = [makeInvader('a', 'def-warrior')];
      const prisoners = rollPrisonerCaptures(invaders, 42, fixedRng(0.5));
      expect(prisoners).toHaveLength(0);
    });

    it('should capture some and miss others', () => {
      const invaders = [
        makeInvader('a', 'def-warrior'),
        makeInvader('b', 'def-rogue'),
      ];
      // First roll 0.1 (capture), second roll 0.5 (miss)
      const prisoners = rollPrisonerCaptures(invaders, 42, sequenceRng([0.1, 0.5]));
      expect(prisoners).toHaveLength(1);
      expect(prisoners[0].invaderClass).toBe('warrior');
    });

    it('should copy invader stats to prisoner', () => {
      const invaders = [makeInvader('a', 'def-warrior')];
      const prisoners = rollPrisonerCaptures(invaders, 42, fixedRng(0.1));
      expect(prisoners[0].stats).toEqual({ hp: 20, attack: 8, defense: 5, speed: 3 });
    });

    it('should skip invaders with unknown definitions', () => {
      const invaders = [makeInvader('a', 'nonexistent')];
      const prisoners = rollPrisonerCaptures(invaders, 42, fixedRng(0.1));
      expect(prisoners).toHaveLength(0);
    });

    it('should have ~30% capture rate over many trials', () => {
      const invaders = [makeInvader('a', 'def-warrior')];
      let captures = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const rng = () => i / trials;
        const p = rollPrisonerCaptures(invaders, 42, rng);
        if (p.length > 0) captures++;
      }
      expect(captures).toBe(30);
    });
  });

  describe('prisoner handling', () => {
    describe('handleExecute', () => {
      it('should return execute result with fear and reputation', () => {
        const result = handleExecute();
        expect(result.action).toBe('execute');
        expect(result.success).toBe(true);
        expect(result.fearChange).toBe(2);
        expect(result.reputationChange).toBe(1);
        expect(result.corruptionChange).toBe(0);
      });
    });

    describe('handleRansom', () => {
      it('should return gold scaled by class', () => {
        const prisoner = makePrisoner('paladin');
        const result = handleRansom(prisoner);
        expect(result.action).toBe('ransom');
        expect(result.resourceChanges.gold).toBe(50);
        expect(result.reputationChange).toBe(-1);
      });

      it('should return less gold for rangers', () => {
        const prisoner = makePrisoner('ranger');
        const result = handleRansom(prisoner);
        expect(result.resourceChanges.gold).toBe(20);
      });
    });

    describe('handleConvert', () => {
      it('should succeed when roll is below success rate', () => {
        const prisoner = makePrisoner('rogue');
        const result = handleConvert(prisoner, fixedRng(0.1));
        expect(result.action).toBe('convert');
        expect(result.success).toBe(true);
        expect(result.corruptionChange).toBe(5);
      });

      it('should fail when roll is above success rate', () => {
        const prisoner = makePrisoner('paladin');
        const result = handleConvert(prisoner, fixedRng(0.9));
        expect(result.success).toBe(false);
      });

      it('should have higher success rate for rogues than paladins', () => {
        expect(getConvertSuccessRate('rogue')).toBeGreaterThan(
          getConvertSuccessRate('paladin'),
        );
      });
    });

    describe('handleSacrifice', () => {
      it('should grant random boon resource', () => {
        const result = handleSacrifice(fixedRng(0));
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
        const result = handleSacrifice(fixedRng(0.5));
        expect(result.resourceChanges.corruption).toBe(5);
      });
    });

    describe('handleExperiment', () => {
      it('should grant research scaled by stats', () => {
        const prisoner = makePrisoner('warrior', {
          stats: { hp: 20, attack: 8, defense: 5, speed: 3 },
        });
        const result = handleExperiment(prisoner);
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
        const weakResult = handleExperiment(weakPrisoner);
        const strongResult = handleExperiment(strongPrisoner);
        expect(strongResult.resourceChanges.research!).toBeGreaterThan(
          weakResult.resourceChanges.research!,
        );
      });
    });

    describe('handlePrisoner', () => {
      it('should dispatch to execute', () => {
        const prisoner = makePrisoner();
        const result = handlePrisoner('execute', prisoner);
        expect(result.action).toBe('execute');
      });

      it('should dispatch to ransom', () => {
        const prisoner = makePrisoner('paladin');
        const result = handlePrisoner('ransom', prisoner);
        expect(result.action).toBe('ransom');
        expect(result.resourceChanges.gold).toBe(50);
      });

      it('should dispatch to convert', () => {
        const prisoner = makePrisoner('rogue');
        const result = handlePrisoner('convert', prisoner, fixedRng(0.1));
        expect(result.action).toBe('convert');
        expect(result.success).toBe(true);
      });

      it('should dispatch to sacrifice', () => {
        const prisoner = makePrisoner();
        const result = handlePrisoner('sacrifice', prisoner, fixedRng(0.5));
        expect(result.action).toBe('sacrifice');
      });

      it('should dispatch to experiment', () => {
        const prisoner = makePrisoner();
        const result = handlePrisoner('experiment', prisoner);
        expect(result.action).toBe('experiment');
      });
    });
  });

  describe('getConvertSuccessRate', () => {
    it('should return correct rates for each class', () => {
      expect(getConvertSuccessRate('warrior')).toBe(0.30);
      expect(getConvertSuccessRate('rogue')).toBe(0.50);
      expect(getConvertSuccessRate('mage')).toBe(0.20);
      expect(getConvertSuccessRate('cleric')).toBe(0.10);
      expect(getConvertSuccessRate('paladin')).toBe(0.05);
      expect(getConvertSuccessRate('ranger')).toBe(0.35);
    });
  });

  describe('getRansomGoldValue', () => {
    it('should return correct gold for each class', () => {
      expect(getRansomGoldValue('warrior')).toBe(30);
      expect(getRansomGoldValue('rogue')).toBe(25);
      expect(getRansomGoldValue('mage')).toBe(40);
      expect(getRansomGoldValue('cleric')).toBe(35);
      expect(getRansomGoldValue('paladin')).toBe(50);
      expect(getRansomGoldValue('ranger')).toBe(20);
    });
  });

  describe('getAltarRebuildCost', () => {
    it('should return a copy of the altar rebuild cost', () => {
      const cost = getAltarRebuildCost();
      expect(cost).toEqual({ crystals: 100, gold: 50, flux: 20 });
    });

    it('should not share references', () => {
      const cost1 = getAltarRebuildCost();
      const cost2 = getAltarRebuildCost();
      expect(cost1).not.toBe(cost2);
    });
  });
});
