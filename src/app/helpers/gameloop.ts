import { LoggerTimer } from 'logger-timer';

import { computed } from '@angular/core';
import { corruptionGenerationProcess } from '@helpers/corruption';
import { corruptionEffectProcess } from '@helpers/corruption-effects';
import { corruptionThresholdProcess } from '@helpers/corruption-thresholds';
import { gameEventProcess } from '@helpers/game-events';
import { gameTimeAdvanceClock } from '@helpers/game-time';
import { hungerProcess, hungerProcessWarnings } from '@helpers/hunger';
import { invasionTriggerProcessSchedule } from '@helpers/invasion-triggers';
import { productionProcess } from '@helpers/production';
import { researchProcess } from '@helpers/research-progress';
import { trainingProcess } from '@helpers/training';
import { breedingPitsProcess } from '@helpers/breeding-pits';
import { spawningPoolProcess } from '@helpers/spawning-pool';
import { alchemyLabProcess } from '@helpers/alchemy-lab';
import { darkForgeProcess } from '@helpers/dark-forge';
import { stairTravelProcess } from '@helpers/stairs';
import { tortureChamberProcess } from '@helpers/torture-chamber';
import { summoningCircleProcess } from '@helpers/summoning-circle';
import { trapWorkshopProcess } from '@helpers/trap-workshop';
import { featureSacrificeProcess, featureTrainingStationProcess } from '@helpers/features';
import { legendaryInhabitantUpkeepProcess } from '@helpers/legendary-inhabitant';
import { merchantProcess } from '@helpers/merchant';
import { seasonProcess } from '@helpers/season';
import { seasonalEventProcess } from '@helpers/seasonal-event';
import { victoryProcess } from '@helpers/victory';
import { debug } from '@helpers/logging';
import { schedulerYield } from '@helpers/scheduler';
import { setupIs } from '@helpers/setup';
import {
  gamestate,
  gamestateTickEnd,
  gamestateTickStart,
  gamestateIsReady,
  gamestateSave,
  updateGamestate,
} from '@helpers/state-game';
import { optionsGet } from '@helpers/state-options';
import { timerLastSaveTick, timerTicksElapsed } from '@helpers/timer';
import { clamp } from 'es-toolkit/compat';

export const gameloopIsPaused = computed(() => optionsGet('gameloopPaused'));

export function gameloopShouldRun(): boolean {
  return window.location.toString().includes('/game');
}

export async function gameloop(totalTicks: number): Promise<void> {
  if (!setupIs()) return;
  if (!gamestateIsReady()) return;
  if (!gameloopShouldRun()) return;
  if (gameloopIsPaused()) return;

  gamestateTickStart();

  const ticksToCalculate =
    totalTicks * optionsGet('gameSpeed') * optionsGet('debugTickMultiplier');
  const numTicks = clamp(ticksToCalculate, 1, 3600);

  const timer = new LoggerTimer({
    dumpThreshold: 100,
    isActive: optionsGet('debugGameloopTimerUpdates'),
  });

  timer.startTimer('gameloop');

  // TODO: game logic (lol)

  timer.dumpTimers((timers) => debug('Gameloop:Timers', timers));

  updateGamestate((state) => {
    state.clock.numTicks += numTicks;
    state.clock = gameTimeAdvanceClock(state.clock, numTicks);
    hungerProcess(state);
    productionProcess(state);
    corruptionGenerationProcess(state);
    corruptionEffectProcess(state);
    corruptionThresholdProcess(state);
    researchProcess(state);
    trainingProcess(state);
    trapWorkshopProcess(state);
    spawningPoolProcess(state);
    breedingPitsProcess(state);
    summoningCircleProcess(state);
    darkForgeProcess(state);
    alchemyLabProcess(state);
    tortureChamberProcess(state);
    stairTravelProcess(state);
    invasionTriggerProcessSchedule(state);
    legendaryInhabitantUpkeepProcess(state);
    featureTrainingStationProcess(state.world.floors, state.world.inhabitants);
    for (const floor of state.world.floors) {
      featureSacrificeProcess(floor.rooms);
    }
    hungerProcessWarnings(state);
    seasonProcess(state);
    seasonalEventProcess(state);
    merchantProcess(state);
    victoryProcess(state);
    return state;
  });

  gameEventProcess(gamestate().clock);

  gamestateTickEnd();

  const currentTick = timerTicksElapsed();
  const nextSaveTick = timerLastSaveTick() + optionsGet('debugSaveInterval');
  if (currentTick >= nextSaveTick) {
    updateGamestate((state) => {
      state.clock.lastSaveTick = currentTick;
      return state;
    });

    await schedulerYield();
    gamestateSave();
    debug('Gameloop:Save', `Saving @ tick ${currentTick}`);
  }
}
