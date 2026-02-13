import { setupFinish } from '@helpers/setup';
import { gamestateReset } from '@helpers/state-game';
import { worldSet } from '@helpers/world';
import { worldgenGenerateWorld } from '@helpers/worldgen';

export async function gameStart(): Promise<void> {
  const world = await worldgenGenerateWorld();
  if (!world.didFinish) return;

  delete world.didFinish;

  worldSet(world);

  setTimeout(() => {
    setupFinish();
  }, 0);
}

export function gameReset(): void {
  gamestateReset();
}
