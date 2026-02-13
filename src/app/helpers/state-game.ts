import { signal } from '@angular/core';
import { defaultGameState } from '@helpers/defaults';
import { debug, error } from '@helpers/logging';
import { schedulerYield } from '@helpers/scheduler';
import { signalIndexedDb } from '@helpers/signal';
import { type GameState } from '@interfaces';

export const gamestateIsReady = signal<boolean>(false);
export const gamestateHasLoaded = signal<boolean>(false);

let tickGamestate: GameState | undefined = undefined;

const _liveGameState = signal<GameState>(defaultGameState());

export function gamestate() {
  return tickGamestate ?? _liveGameState();
}

const _savedGamestate = signalIndexedDb<GameState>(
  'gamestate',
  defaultGameState(),
  (state: GameState) => {
    if (gamestateHasLoaded()) return;

    _liveGameState.set(state);

    gamestateHasLoaded.set(true);
  },
);

export function gamestateSet(state: GameState, commit = true): void {
  _liveGameState.set(state);

  if (commit) {
    debug('GameState:Commit', 'Committing game state changes.');
    gamestateSave();
  }
}

export async function updateGamestate(
  func: (state: GameState) => GameState,
): Promise<void> {
  if (tickGamestate) {
    const uncommitted = tickGamestate;
    const res = func(uncommitted);
    if (!res) {
      error(
        'GameState:Update',
        `Failed to update game state. Would be set to a falsy value.`,
        new Error(),
      );
      return;
    }

    tickGamestate = res;

    return;
  }

  await schedulerYield();
  const uncommitted = _liveGameState();
  const res = func(uncommitted);
  if (!res) {
    error(
      'GameState:Update',
      `Failed to update game state. Would be set to a falsy value.`,
      new Error().stack,
    );
    return;
  }

  gamestateSet(structuredClone(res));
}

export function gamestateReset(): void {
  gamestateSet(defaultGameState());
}

export function gamestateSave(): void {
  _savedGamestate.set(gamestateFormatForSave(_liveGameState()));
}

export function gamestateFormatForSave(gameState: GameState): GameState {
  const optimized = structuredClone(gameState);
  return optimized;
}

export function gamestateTickStart(): void {
  tickGamestate = Object.assign({}, _liveGameState());
}

export function gamestateTickEnd(): void {
  if (tickGamestate) {
    _liveGameState.set(tickGamestate);
  }

  tickGamestate = undefined;
}
