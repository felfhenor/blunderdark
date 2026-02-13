import { gamestate, updateGamestate } from '@helpers/state-game';

export function setupIs(): boolean {
  return gamestate().meta.isSetup;
}

export function setupFinish(): void {
  updateGamestate((state) => {
    state.meta.isSetup = true;
    return state;
  });
}
