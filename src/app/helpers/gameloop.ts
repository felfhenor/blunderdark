import { LoggerTimer } from 'logger-timer';

import { computed } from '@angular/core';
import { corruptionEffectProcessAll } from '@helpers/corruption-effects';
import { fearStateProcess } from '@helpers/fear-state';
import { floatingBubblesEmitProduction } from '@helpers/floating-bubbles';
import { floorCurrentIndex } from '@helpers/floor';
import { gameEventProcess } from '@helpers/game-events';
import { gameTimeAdvanceClock, GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { hungerProcess, hungerProcessWarnings } from '@helpers/hunger';
import { invasionProcess } from '@helpers/invasion-process';
import { invasionThreatDecayProcess } from '@helpers/invasion-threat';
import { invasionTriggerProcessSchedule } from '@helpers/invasion-triggers';
import { productionProcess } from '@helpers/production';
import { resourceClampAll, resourceStorageProcess } from '@helpers/resources';
import { researchProcess } from '@helpers/research-progress';
import { trainingProcess } from '@helpers/training';
import { breedingPitsProcess } from '@helpers/breeding-pits';
import { spawningPoolProcess } from '@helpers/spawning-pool';
import { alchemyLabProcess } from '@helpers/alchemy-lab';
import { darkForgeProcess } from '@helpers/dark-forge';
import { verticalTransportTravelProcess } from '@helpers/vertical-transport';
import { tortureChamberProcess } from '@helpers/torture-chamber';
import { summoningCircleProcess } from '@helpers/summoning-circle';
import { trapWorkshopProcess } from '@helpers/trap-workshop';
import {
  featureMaintenanceProcess,
  featureSacrificeProcess,
} from '@helpers/features';
import { legendaryInhabitantUpkeepProcess } from '@helpers/legendary-inhabitant';
import { merchantProcess } from '@helpers/merchant';
import { seasonProcess } from '@helpers/season';
import { victoryProcess } from '@helpers/victory';
import { autosaveCheckPreInvasion } from '@helpers/autosave';
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

  timer.dumpTimers((timers) => debug('Gameloop:Timers', timers));

  updateGamestate((state) => {
    state.clock.numTicks += numTicks;
    state.clock = gameTimeAdvanceClock(state.clock, numTicks);
    resourceStorageProcess(state);
    hungerProcess(state, numTicks);
    fearStateProcess(state);

    // Affordability checks run BEFORE production so they see pre-production resources.
    // Actual resource deductions for upkeep/maintenance are folded into productionProcess.
    legendaryInhabitantUpkeepProcess(state, numTicks);
    featureMaintenanceProcess(state.world.floors, state.world.resources, GAME_TIME_TICKS_PER_MINUTE);

    // Production applies a single net delta: gross production minus all non-food costs.
    productionProcess(state, numTicks);

    corruptionEffectProcessAll(state);
    researchProcess(state, numTicks);
    trainingProcess(state, numTicks);
    trapWorkshopProcess(state, numTicks);
    spawningPoolProcess(state, numTicks);
    breedingPitsProcess(state, numTicks);
    summoningCircleProcess(state, numTicks);
    darkForgeProcess(state, numTicks);
    alchemyLabProcess(state, numTicks);
    tortureChamberProcess(state, numTicks);
    verticalTransportTravelProcess(state);
    invasionThreatDecayProcess(state);
    invasionTriggerProcessSchedule(state);
    invasionProcess(state);

    for (const floor of state.world.floors) {
      featureSacrificeProcess(floor.rooms, numTicks);
    }
    hungerProcessWarnings(state);
    seasonProcess(state);
    merchantProcess(state);
    victoryProcess(state);
    resourceClampAll(state);
    return state;
  });

  gameEventProcess(gamestate().clock);

  // Emit floating production bubbles for the visible floor
  floatingBubblesEmitProduction(floorCurrentIndex(), numTicks);

  // Check for pre-invasion autosave after state is updated
  autosaveCheckPreInvasion(gamestate().world.invasionSchedule.warningActive);

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
