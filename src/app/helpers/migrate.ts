import { defaultGameState } from '@helpers/defaults';
import { floorMigrate } from '@helpers/floor';
import { resourceMigrate } from '@helpers/resources';
import {
  gamestate,
  gamestateTickEnd,
  gamestateTickStart,
  gamestateSave,
  gamestateSet,
} from '@helpers/state-game';
import { optionsDefault, options, optionsSetAll } from '@helpers/state-options';
import { merge } from 'es-toolkit/compat';

export function migrateGameState() {
  const state = gamestate();
  const newState = merge(defaultGameState(), state);
  newState.world.resources = resourceMigrate(state.world.resources);
  const { floors, currentFloorIndex } = floorMigrate(state.world);
  newState.world.floors = floors;
  newState.world.currentFloorIndex = currentFloorIndex;
  gamestateSet(newState);
  gamestateTickStart();
  gamestateTickEnd();
  gamestateSave();
}

export function migrateOptionsState() {
  const state = options();

  const newState = merge(optionsDefault(), state);

  optionsSetAll(newState);
}
