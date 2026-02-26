import { contentGetEntry } from '@helpers/content';
import {
  defaultCorruptionEffectState,
  defaultGameState,
  defaultUnlockedContent,
} from '@helpers/defaults';
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
import type { CorruptionEffectState, ResearchContent } from '@interfaces';
import type { CorruptionEffectContent } from '@interfaces/content-corruptioneffect';
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

/**
 * Migrate old corruption effect state (darkUpgradeUnlocked, lastMutationCorruption, etc.)
 * to the new generic format (firedOneTimeEffects, lastIntervalValues, etc.).
 */
function migrateCorruptionEffects(
  effects: CorruptionEffectState & Record<string, unknown>,
): CorruptionEffectState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const old = effects as any;

  // Already migrated — has the new fields and no old ones
  if (old.darkUpgradeUnlocked === undefined && Array.isArray(effects.firedOneTimeEffects)) {
    return effects;
  }

  const newState = defaultCorruptionEffectState();

  if (old.darkUpgradeUnlocked === true) {
    const entry = contentGetEntry<CorruptionEffectContent>('Dark Upgrade Unlock');
    if (entry) {
      newState.firedOneTimeEffects.push(entry.id);
    }
  }

  if (old.lastMutationCorruption !== undefined && old.lastMutationCorruption > 0) {
    const entry = contentGetEntry<CorruptionEffectContent>('Corruption Mutation');
    if (entry) {
      newState.lastIntervalValues[entry.id] = old.lastMutationCorruption;
    }
  }

  if (old.lastCrusadeCorruption !== undefined && old.lastCrusadeCorruption >= 200) {
    const entry = contentGetEntry<CorruptionEffectContent>('Crusade Invasion');
    if (entry) {
      newState.retriggeredEffects[entry.id] = false;
    }
  }

  return newState;
}

export function migrateGameState() {
  const state = gamestate();
  const newState = merge(defaultGameState(), state);
  newState.world.resources = resourceMigrate(state.world.resources);
  const { floors, currentFloorIndex } = floorMigrate(state.world);
  newState.world.floors = floors;
  newState.world.currentFloorIndex = currentFloorIndex;
  newState.world.corruptionEffects = migrateCorruptionEffects(
    newState.world.corruptionEffects as CorruptionEffectState & Record<string, unknown>,
  );
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
