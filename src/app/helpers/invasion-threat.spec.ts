import { describe, expect, it } from 'vitest';
import type { DetailedInvasionResult, InvasionId } from '@interfaces';
import {
  THREAT_DECAY_PER_DAY,
  THREAT_DEFEAT_MAX_LOSS,
  THREAT_DEFEAT_MIN_LOSS,
  THREAT_INTERVAL_MAX_REDUCTION,
  THREAT_MAX,
  THREAT_MIN,
  THREAT_PARTY_SIZE_MAX_BONUS,
  THREAT_STAT_BONUS_MAX_PERCENT,
  THREAT_VICTORY_MAX_GAIN,
  THREAT_VICTORY_MIN_GAIN,
  invasionThreatApplyDecay,
  invasionThreatBlend,
  invasionThreatCalculateAdjustment,
  invasionThreatCalculatePerformanceScore,
  invasionThreatGetIntervalReduction,
  invasionThreatGetPartySizeBonus,
  invasionThreatGetStatBonus,
} from '@helpers/invasion-threat';

function makeResult(overrides: Partial<DetailedInvasionResult> = {}): DetailedInvasionResult {
  return {
    invasionId: 'test' as unknown as InvasionId,
    day: 30,
    outcome: 'victory',
    endReason: 'all_invaders_eliminated',
    turnsTaken: 5,
    invaderCount: 10,
    invadersKilled: 10,
    defenderCount: 5,
    defendersLost: 0,
    objectivesCompleted: 0,
    objectivesTotal: 3,
    rewardMultiplier: 1,
    penetrationDepth: 0.5,
    roomsReached: 4,
    totalPathRooms: 8,
    ...overrides,
  };
}

describe('invasion-threat', () => {
  describe('invasionThreatCalculatePerformanceScore', () => {
    it('should return high score for perfect victory', () => {
      const result = makeResult({
        invadersKilled: 10,
        invaderCount: 10,
        turnsTaken: 1,
        defendersLost: 0,
        defenderCount: 5,
        objectivesCompleted: 0,
        objectivesTotal: 3,
      });
      const score = invasionThreatCalculatePerformanceScore(result);
      expect(score).toBeGreaterThan(0.8);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return lower score for narrow victory', () => {
      const result = makeResult({
        invadersKilled: 6,
        invaderCount: 10,
        turnsTaken: 80,
        defendersLost: 4,
        defenderCount: 5,
        objectivesCompleted: 2,
        objectivesTotal: 3,
      });
      const score = invasionThreatCalculatePerformanceScore(result);
      expect(score).toBeLessThan(0.5);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should return moderate score for crushing defeat', () => {
      const result = makeResult({
        outcome: 'defeat',
        endReason: 'altar_destroyed',
        invadersKilled: 1,
        invaderCount: 10,
        turnsTaken: 50,
        defendersLost: 5,
        defenderCount: 5,
        objectivesCompleted: 3,
        objectivesTotal: 3,
      });
      const score = invasionThreatCalculatePerformanceScore(result);
      expect(score).toBeLessThan(0.3);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero invaders gracefully', () => {
      const result = makeResult({
        invaderCount: 0,
        invadersKilled: 0,
        turnsTaken: 0,
      });
      const score = invasionThreatCalculatePerformanceScore(result);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle zero defenders gracefully', () => {
      const result = makeResult({
        defenderCount: 0,
        defendersLost: 0,
      });
      const score = invasionThreatCalculatePerformanceScore(result);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle zero objectives gracefully', () => {
      const result = makeResult({
        objectivesTotal: 0,
        objectivesCompleted: 0,
      });
      const score = invasionThreatCalculatePerformanceScore(result);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should clamp score between 0 and 1', () => {
      const perfectResult = makeResult({
        invadersKilled: 10,
        invaderCount: 10,
        turnsTaken: 0,
        defendersLost: 0,
        defenderCount: 10,
        objectivesCompleted: 0,
        objectivesTotal: 5,
      });
      expect(invasionThreatCalculatePerformanceScore(perfectResult)).toBeLessThanOrEqual(1);
      expect(invasionThreatCalculatePerformanceScore(perfectResult)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('invasionThreatCalculateAdjustment', () => {
    it('should return positive adjustment for victory', () => {
      const adj = invasionThreatCalculateAdjustment(0.5, 'victory');
      expect(adj).toBeGreaterThan(0);
    });

    it('should return minimum gain for worst victory (score 0)', () => {
      const adj = invasionThreatCalculateAdjustment(0, 'victory');
      expect(adj).toBe(THREAT_VICTORY_MIN_GAIN);
    });

    it('should return maximum gain for perfect victory (score 1)', () => {
      const adj = invasionThreatCalculateAdjustment(1, 'victory');
      expect(adj).toBe(THREAT_VICTORY_MAX_GAIN);
    });

    it('should return negative adjustment for defeat', () => {
      const adj = invasionThreatCalculateAdjustment(0.5, 'defeat');
      expect(adj).toBeLessThan(0);
    });

    it('should return maximum loss for crushing defeat (score 0)', () => {
      const adj = invasionThreatCalculateAdjustment(0, 'defeat');
      expect(adj).toBe(-THREAT_DEFEAT_MAX_LOSS);
    });

    it('should return minimum loss for narrow defeat (score 1)', () => {
      const adj = invasionThreatCalculateAdjustment(1, 'defeat');
      expect(adj).toBe(-THREAT_DEFEAT_MIN_LOSS);
    });

    it('should scale linearly for victories', () => {
      const adj25 = invasionThreatCalculateAdjustment(0.25, 'victory');
      const adj50 = invasionThreatCalculateAdjustment(0.5, 'victory');
      const adj75 = invasionThreatCalculateAdjustment(0.75, 'victory');
      expect(adj50).toBeGreaterThan(adj25);
      expect(adj75).toBeGreaterThan(adj50);
    });
  });

  describe('invasionThreatApplyDecay', () => {
    it('should reduce threat by decay rate per day', () => {
      expect(invasionThreatApplyDecay(50, 1)).toBe(50 - THREAT_DECAY_PER_DAY);
    });

    it('should reduce by multiple days', () => {
      expect(invasionThreatApplyDecay(50, 10)).toBe(50 - THREAT_DECAY_PER_DAY * 10);
    });

    it('should not go below zero', () => {
      expect(invasionThreatApplyDecay(0.1, 10)).toBe(THREAT_MIN);
    });

    it('should return zero when already at zero', () => {
      expect(invasionThreatApplyDecay(0, 5)).toBe(THREAT_MIN);
    });

    it('should return exact zero for zero days', () => {
      expect(invasionThreatApplyDecay(50, 0)).toBe(50);
    });
  });

  describe('invasionThreatBlend', () => {
    it('should return 0 when both inputs are 0', () => {
      expect(invasionThreatBlend(0, 0)).toBe(0);
    });

    it('should return 100 when both inputs are 100', () => {
      expect(invasionThreatBlend(100, 100)).toBe(100);
    });

    it('should cap at 100', () => {
      expect(invasionThreatBlend(100, 100)).toBeLessThanOrEqual(THREAT_MAX);
    });

    it('should weight equally by default', () => {
      expect(invasionThreatBlend(100, 0)).toBe(50);
      expect(invasionThreatBlend(0, 100)).toBe(50);
    });

    it('should blend intermediate values', () => {
      expect(invasionThreatBlend(60, 40)).toBe(50);
    });

    it('should round the result', () => {
      const result = invasionThreatBlend(33, 67);
      expect(result).toBe(Math.round(result));
    });
  });

  describe('invasionThreatGetStatBonus', () => {
    it('should return 0 at threat 0', () => {
      expect(invasionThreatGetStatBonus(0)).toBe(0);
    });

    it('should return max bonus at threat 100', () => {
      expect(invasionThreatGetStatBonus(100)).toBe(THREAT_STAT_BONUS_MAX_PERCENT);
    });

    it('should return half bonus at threat 50', () => {
      expect(invasionThreatGetStatBonus(50)).toBeCloseTo(THREAT_STAT_BONUS_MAX_PERCENT / 2);
    });

    it('should scale linearly', () => {
      const bonus25 = invasionThreatGetStatBonus(25);
      const bonus75 = invasionThreatGetStatBonus(75);
      expect(bonus75).toBeCloseTo(bonus25 * 3);
    });
  });

  describe('invasionThreatGetPartySizeBonus', () => {
    it('should return 0 at threat 0', () => {
      expect(invasionThreatGetPartySizeBonus(0)).toBe(0);
    });

    it('should return max bonus at threat 100', () => {
      expect(invasionThreatGetPartySizeBonus(100)).toBe(THREAT_PARTY_SIZE_MAX_BONUS);
    });

    it('should return integer values', () => {
      for (let t = 0; t <= 100; t += 10) {
        expect(Number.isInteger(invasionThreatGetPartySizeBonus(t))).toBe(true);
      }
    });

    it('should return 0 for low threat', () => {
      expect(invasionThreatGetPartySizeBonus(10)).toBe(0);
    });
  });

  describe('invasionThreatGetIntervalReduction', () => {
    it('should return 0 at threat 0', () => {
      expect(invasionThreatGetIntervalReduction(0)).toBe(0);
    });

    it('should return max reduction at threat 100', () => {
      expect(invasionThreatGetIntervalReduction(100)).toBe(THREAT_INTERVAL_MAX_REDUCTION);
    });

    it('should return integer values', () => {
      for (let t = 0; t <= 100; t += 10) {
        expect(Number.isInteger(invasionThreatGetIntervalReduction(t))).toBe(true);
      }
    });

    it('should return 0 for low threat', () => {
      expect(invasionThreatGetIntervalReduction(20)).toBe(0);
    });
  });
});
