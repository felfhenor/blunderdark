import { contentGetEntry } from '@helpers/content';
import { defaultGameState, defaultUnlockedContent } from '@helpers/defaults';
import { floorMigrate } from '@helpers/floor';
import { researchUnlockApplyEffects } from '@helpers/research-unlocks';
import { resourceMigrate } from '@helpers/resources';
import {
  gamestate,
  gamestateTickEnd,
  gamestateTickStart,
  gamestateSave,
  gamestateSet,
} from '@helpers/state-game';
import { optionsDefault, options, optionsSetAll } from '@helpers/state-options';
import type { ResearchContent } from '@interfaces';
import { merge } from 'es-toolkit/compat';

/**
 * Rebuild unlockedContent from completed research nodes + current content data.
 * This ensures that when gamedata changes (e.g., new unlock effects added to
 * existing research nodes), saves automatically pick up the new unlocks.
 */
function reconcileResearchUnlocks(state: ReturnType<typeof gamestate>): void {
  const completedNodes = state.world.research.completedNodes;
  if (completedNodes.length === 0) return;

  let content = defaultUnlockedContent();

  for (const nodeId of completedNodes) {
    const node = contentGetEntry<ResearchContent>(nodeId);
    if (!node || node.unlocks.length === 0) continue;
    content = researchUnlockApplyEffects(node.unlocks, content);
  }

  state.world.research.unlockedContent = content;
}

export function migrateGameState() {
  const state = gamestate();
  const newState = merge(defaultGameState(), state);
  newState.world.resources = resourceMigrate(state.world.resources);
  const { floors, currentFloorIndex } = floorMigrate(state.world);
  newState.world.floors = floors;
  newState.world.currentFloorIndex = currentFloorIndex;
  reconcileResearchUnlocks(newState);
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
