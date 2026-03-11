import { farplaneCaptureDefenderSouls } from '@helpers/farplane';
import {
  THREAT_MAX,
  THREAT_MIN,
  invasionThreatCalculateAdjustment,
  invasionThreatCalculatePerformanceScore,
} from '@helpers/invasion-threat';
import { reputationAwardInPlace } from '@helpers/reputation';
import { resourceApplyMap } from '@helpers/resources';
import { updateGamestate } from '@helpers/state-game';
import { victoryRecordDefenseWin } from '@helpers/victory';
import type {
  InvasionOrchestratorResult,
  ResourceType,
} from '@interfaces';

/**
 * Apply victory rewards to the game state.
 * Awards gold, resources, reputation to survivors, and adds prisoners.
 */
export async function invasionRewardApplyVictory(
  result: InvasionOrchestratorResult,
): Promise<void> {
  const rewards = result.rewards;
  if (!rewards) return;

  // Add all resource gains (including gold) in a single batch
  await resourceApplyMap(rewards.resourceGains);

  // Reputation + victory tracking + threat adjustment
  await updateGamestate((state) => {
    reputationAwardInPlace(state, 'defeat_invader');
    victoryRecordDefenseWin(state);

    // Add captured prisoners
    if (result.capturedPrisoners.length > 0) {
      state.world.prisoners.push(...result.capturedPrisoners);
      reputationAwardInPlace(state, 'capture_prisoner');
    }

    // Flawless victory: no defenders killed
    if (result.killedDefenderIds.length === 0) {
      reputationAwardInPlace(state, 'repel_invasion_flawless');
    }

    // Adjust player threat upward on victory
    const perfScore = invasionThreatCalculatePerformanceScore(result.detailedResult);
    const adjustment = invasionThreatCalculateAdjustment(perfScore, 'victory');
    state.world.playerThreat = Math.min(
      THREAT_MAX,
      Math.max(THREAT_MIN, state.world.playerThreat + adjustment),
    );

    return state;
  });
}

/**
 * Apply defeat penalties to the game state.
 * Subtracts all resource losses (including gold) via updateGamestate to clamp at 0,
 * removes killed defenders, and applies reputation loss.
 */
export async function invasionRewardApplyDefeat(
  result: InvasionOrchestratorResult,
): Promise<void> {
  const penalties = result.penalties;
  if (!penalties) return;

  // All resource subtraction (including gold) happens inside updateGamestate for safe clamping
  await updateGamestate((state) => {
    // Subtract all resource losses (gold is included in resourceLosses)
    for (const [type, amount] of Object.entries(penalties.resourceLosses) as [ResourceType, number][]) {
      if (amount > 0 && state.world.resources[type]) {
        state.world.resources[type].current = Math.max(
          0,
          state.world.resources[type].current - amount,
        );
      }
    }

    if (result.killedDefenderIds.length > 0) {
      // Capture souls before removing defenders (while instance data still available)
      farplaneCaptureDefenderSouls(state, result.killedDefenderIds);

      const killedSet = new Set(result.killedDefenderIds);
      state.world.inhabitants = state.world.inhabitants.filter(
        (i) => !killedSet.has(i.instanceId),
      );
    }

    // Apply reputation loss via gamedata action
    reputationAwardInPlace(state, 'lose_invasion');

    // Adjust player threat downward on defeat
    const perfScore = invasionThreatCalculatePerformanceScore(result.detailedResult);
    const adjustment = invasionThreatCalculateAdjustment(perfScore, 'defeat');
    state.world.playerThreat = Math.min(
      THREAT_MAX,
      Math.max(THREAT_MIN, state.world.playerThreat + adjustment),
    );

    // Apply PoisonSupply food production debuff (max 1 active, replaces existing)
    const completedTypes = result.detailedResult.completedObjectiveTypes ?? [];
    if (completedTypes.includes('PoisonSupply')) {
      state.world.invasionDebuff = {
        type: 'food_production_penalty',
        multiplier: 0.5,
        expiresOnDay: state.clock.day + 10,
      };
    }

    // Apply PlantBeacon schedule acceleration (next scheduled invasion 30% sooner)
    if (completedTypes.includes('PlantBeacon')) {
      const schedule = state.world.invasionSchedule;
      if (schedule.nextInvasionDay !== undefined) {
        const daysUntil = schedule.nextInvasionDay - state.clock.day;
        if (daysUntil > 1) {
          const reduction = Math.floor(daysUntil * 0.3);
          schedule.nextInvasionDay = Math.max(
            state.clock.day + 1,
            schedule.nextInvasionDay - reduction,
          );
        }
      }
    }

    return state;
  });
}

