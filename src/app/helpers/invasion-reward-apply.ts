import { invasionRewardHandlePrisoner } from '@helpers/invasion-rewards';
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
  CapturedPrisoner,
  InvasionOrchestratorResult,
  PrisonerAction,
  PrisonerHandlingResult,
  ResourceType,
} from '@interfaces';

/**
 * Apply victory rewards to the game state.
 * Awards gold, resources, reputation, experience to survivors, and adds prisoners.
 */
export async function invasionRewardApplyVictory(
  result: InvasionOrchestratorResult,
): Promise<void> {
  const rewards = result.rewards;
  if (!rewards) return;

  // Add gold + bonus resources in a single batch
  const resourceGains: Partial<Record<ResourceType, number>> = { ...rewards.resourceGains };
  if (rewards.goldGain > 0) {
    resourceGains.gold = (resourceGains.gold ?? 0) + rewards.goldGain;
  }
  await resourceApplyMap(resourceGains);

  // Reputation + victory tracking + threat adjustment
  await updateGamestate((state) => {
    reputationAwardInPlace(state, 'Defeat Invader');
    victoryRecordDefenseWin(state);

    // Distribute XP to surviving defenders
    if (rewards.experienceGain > 0) {
      const xpPerDefender = Math.max(
        1,
        Math.floor(rewards.experienceGain / Math.max(1, state.world.inhabitants.length)),
      );
      for (const inhabitant of state.world.inhabitants) {
        inhabitant.xp = (inhabitant.xp ?? 0) + xpPerDefender;
      }
    }

    // Add captured prisoners
    if (result.capturedPrisoners.length > 0) {
      state.world.prisoners.push(...result.capturedPrisoners);
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
      const killedSet = new Set(result.killedDefenderIds);
      state.world.inhabitants = state.world.inhabitants.filter(
        (i) => !killedSet.has(i.instanceId),
      );
    }

    // Apply reputation loss via direct mutation (no gamedata action for defeat)
    if (penalties.reputationLoss > 0) {
      state.world.reputation.terror = Math.max(
        0,
        state.world.reputation.terror - penalties.reputationLoss,
      );
    }

    // Adjust player threat downward on defeat
    const perfScore = invasionThreatCalculatePerformanceScore(result.detailedResult);
    const adjustment = invasionThreatCalculateAdjustment(perfScore, 'defeat');
    state.world.playerThreat = Math.min(
      THREAT_MAX,
      Math.max(THREAT_MIN, state.world.playerThreat + adjustment),
    );

    return state;
  });
}

/**
 * Handle a prisoner action: execute, ransom, convert, sacrifice, or experiment.
 * Applies resource/reputation/corruption changes and removes the prisoner.
 */
export async function invasionRewardApplyPrisonerAction(
  prisoner: CapturedPrisoner,
  action: PrisonerAction,
  rng: () => number = Math.random,
): Promise<PrisonerHandlingResult> {
  const result = invasionRewardHandlePrisoner(action, prisoner, rng);

  // Apply resource changes in a single batch
  await resourceApplyMap(result.resourceChanges);

  // Apply reputation + corruption + fear via state mutation
  await updateGamestate((state) => {
    if (result.reputationChange !== 0) {
      state.world.reputation.terror = Math.max(
        0,
        state.world.reputation.terror + result.reputationChange,
      );
    }

    if (result.corruptionChange !== 0) {
      state.world.resources.corruption.current = Math.min(
        state.world.resources.corruption.max,
        Math.max(0, state.world.resources.corruption.current + result.corruptionChange),
      );
    }

    // Remove prisoner from world state
    state.world.prisoners = state.world.prisoners.filter(
      (p) => p.id !== prisoner.id,
    );

    return state;
  });

  return result;
}
