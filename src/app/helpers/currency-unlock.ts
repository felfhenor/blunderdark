import { signal } from '@angular/core';
import { ALL_CURRENCIES } from '@helpers/defaults';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { ResourceType } from '@interfaces';

/**
 * Queue of currencies that were just unlocked and need popup display.
 * The currency-unlock-popup component consumes this queue.
 */
export const currencyUnlockQueue = signal<ResourceType[]>([]);

export function currencyIsUnlocked(type: ResourceType): boolean {
  const unlocked = gamestate().world.unlockedCurrencies;
  // If unlockedCurrencies is not set (e.g. in tests or pre-migration saves), treat all as unlocked
  if (!unlocked) return true;
  return unlocked.includes(type);
}

export function currencyUnlockedTypes(): ResourceType[] {
  return gamestate().world.unlockedCurrencies;
}

export async function currencyUnlock(type: ResourceType): Promise<void> {
  if (currencyIsUnlocked(type)) return;

  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      unlockedCurrencies: [...state.world.unlockedCurrencies, type],
    },
  }));

  currencyUnlockQueue.update((q) => [...q, type]);
}

export async function currencyUnlockAll(): Promise<void> {
  const missing = ALL_CURRENCIES.filter((t) => !currencyIsUnlocked(t));
  if (missing.length === 0) return;

  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      unlockedCurrencies: [...ALL_CURRENCIES],
    },
  }));
}
