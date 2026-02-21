import { computed, signal, type Signal } from '@angular/core';
import { contentGetEntriesByType } from '@helpers/content';
import {
  victoryConditionEvaluatePath,
  victoryConditionProcessDayTracking,
} from '@helpers/victory-conditions';
import type {
  GameState,
  VictoryPathContent,
  VictoryPathId,
  VictoryPathProgress,
} from '@interfaces';

const VICTORY_CHECK_INTERVAL = 60;

const _victoryAchievedPathId = signal<VictoryPathId | undefined>(undefined);
export const victoryAchievedPathId: Signal<VictoryPathId | undefined> =
  _victoryAchievedPathId.asReadonly();

const _victoryProgressMap = signal<Map<VictoryPathId, VictoryPathProgress>>(
  new Map(),
);
export const victoryProgressMap: Signal<
  ReadonlyMap<VictoryPathId, VictoryPathProgress>
> = _victoryProgressMap.asReadonly();

export const victoryIsAchieved = computed(
  () => _victoryAchievedPathId() !== undefined,
);

export function victoryIsPathComplete(pathId: VictoryPathId): boolean {
  return _victoryProgressMap().get(pathId)?.complete ?? false;
}

export function victoryGetProgress(
  pathId: VictoryPathId,
): VictoryPathProgress | undefined {
  return _victoryProgressMap().get(pathId);
}

export function victoryProcess(state: GameState): void {
  // Run day tracking every tick (lightweight)
  victoryConditionProcessDayTracking(state);

  // Only evaluate full victory conditions every N ticks
  const ticksSinceLastEval =
    state.clock.numTicks - (state.world.victoryProgress.lastEvaluationTick ?? 0);
  if (ticksSinceLastEval < VICTORY_CHECK_INTERVAL) return;

  // Don't re-evaluate if already won
  if (state.world.victoryProgress.achievedVictoryPathId) return;

  state.world.victoryProgress.lastEvaluationTick = state.clock.numTicks;

  const paths =
    contentGetEntriesByType<VictoryPathContent>('victorypath');
  if (paths.length === 0) return;

  const newMap = new Map<VictoryPathId, VictoryPathProgress>();

  for (const path of paths) {
    const progress = victoryConditionEvaluatePath(path, state);
    newMap.set(path.id, progress);

    if (progress.complete && !state.world.victoryProgress.achievedVictoryPathId) {
      state.world.victoryProgress.achievedVictoryPathId = path.id;
      state.world.victoryProgress.achievedVictoryDay = state.clock.day;
      _victoryAchievedPathId.set(path.id);
    }
  }

  _victoryProgressMap.set(newMap);
}

export function victoryCalculatePathCompletionPercent(
  path: VictoryPathContent,
  progress: VictoryPathProgress | undefined,
): number {
  if (!progress || path.conditions.length === 0) return 0;

  let totalWeight = 0;

  for (const cond of path.conditions) {
    const condProgress = progress.conditions.find(
      (c) => c.conditionId === cond.id,
    );
    if (!condProgress) continue;

    const fraction =
      cond.checkType === 'flag'
        ? condProgress.met
          ? 1
          : 0
        : cond.target > 0
          ? Math.min(1, condProgress.currentValue / cond.target)
          : 0;
    totalWeight += fraction;
  }

  return (totalWeight / path.conditions.length) * 100;
}

export function victoryEvaluateImmediate(state: GameState): void {
  if (state.world.victoryProgress.achievedVictoryPathId) {
    _victoryAchievedPathId.set(state.world.victoryProgress.achievedVictoryPathId);
    return;
  }

  const paths =
    contentGetEntriesByType<VictoryPathContent>('victorypath');
  if (paths.length === 0) return;

  const newMap = new Map<VictoryPathId, VictoryPathProgress>();

  for (const path of paths) {
    const progress = victoryConditionEvaluatePath(path, state);
    newMap.set(path.id, progress);
  }

  _victoryProgressMap.set(newMap);
}

export function victoryRecordDefenseWin(state: GameState): void {
  state.world.victoryProgress.totalInvasionDefenseWins++;
}

export function victoryReset(): void {
  _victoryAchievedPathId.set(undefined);
  _victoryProgressMap.set(new Map());
}
