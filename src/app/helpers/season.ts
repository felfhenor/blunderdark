import { computed } from '@angular/core';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Season, SeasonState } from '@interfaces';
import { DAYS_PER_SEASON, SEASON_ORDER } from '@interfaces/season';
import { Subject } from 'rxjs';

export type SeasonTransitionEvent = {
  previousSeason: Season;
  newSeason: Season;
};

const seasonTransition = new Subject<SeasonTransitionEvent>();
export const seasonTransition$ = seasonTransition.asObservable();

export const currentSeason = computed(
  () => gamestate().world.season.currentSeason,
);

export const dayInSeason = computed(
  () => gamestate().world.season.dayInSeason,
);

export const seasonProgress = computed(
  () => ((gamestate().world.season.dayInSeason - 1) / DAYS_PER_SEASON) * 100,
);

export const totalSeasonCycles = computed(
  () => gamestate().world.season.totalSeasonCycles,
);

export function isSeason(season: Season): boolean {
  return gamestate().world.season.currentSeason === season;
}

export function getSeasonLabel(season: Season): string {
  const labels: Record<Season, string> = {
    growth: 'Growth',
    harvest: 'Harvest',
    darkness: 'Darkness',
    storms: 'Storms',
  };
  return labels[season];
}

export function advanceDay(seasonState: SeasonState): SeasonState {
  const newDay = seasonState.dayInSeason + 1;

  if (newDay > DAYS_PER_SEASON) {
    const currentIndex = SEASON_ORDER.indexOf(seasonState.currentSeason);
    const nextIndex = (currentIndex + 1) % SEASON_ORDER.length;
    const newSeason = SEASON_ORDER[nextIndex];
    const isNewCycle = nextIndex === 0;

    return {
      currentSeason: newSeason,
      dayInSeason: 1,
      totalSeasonCycles:
        seasonState.totalSeasonCycles + (isNewCycle ? 1 : 0),
    };
  }

  return {
    ...seasonState,
    dayInSeason: newDay,
  };
}

export async function advanceGameDay(): Promise<void> {
  const oldSeason = gamestate().world.season.currentSeason;

  await updateGamestate((state) => {
    const newSeason = advanceDay(state.world.season);
    return {
      ...state,
      world: {
        ...state.world,
        season: newSeason,
      },
    };
  });

  const newSeason = gamestate().world.season.currentSeason;
  if (newSeason !== oldSeason) {
    seasonTransition.next({
      previousSeason: oldSeason,
      newSeason,
    });
  }
}
