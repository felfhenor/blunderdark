import { computed } from '@angular/core';
import { gamestate, updateGamestate } from '@helpers/state-game';

export type CorruptionLevel = 'low' | 'medium' | 'high' | 'critical';

export const CORRUPTION_THRESHOLD_LOW = 0;
export const CORRUPTION_THRESHOLD_MEDIUM = 50;
export const CORRUPTION_THRESHOLD_HIGH = 100;
export const CORRUPTION_THRESHOLD_CRITICAL = 200;

export const corruptionCurrent = computed(
  () => gamestate().world.resources.corruption.current,
);

export const corruptionLevel = computed((): CorruptionLevel => {
  const value = corruptionCurrent();
  if (value >= CORRUPTION_THRESHOLD_CRITICAL) return 'critical';
  if (value >= CORRUPTION_THRESHOLD_HIGH) return 'high';
  if (value >= CORRUPTION_THRESHOLD_MEDIUM) return 'medium';
  return 'low';
});

export function corruptionGetLevel(value: number): CorruptionLevel {
  if (value >= CORRUPTION_THRESHOLD_CRITICAL) return 'critical';
  if (value >= CORRUPTION_THRESHOLD_HIGH) return 'high';
  if (value >= CORRUPTION_THRESHOLD_MEDIUM) return 'medium';
  return 'low';
}

export function corruptionGetLevelDescription(level: CorruptionLevel): string {
  switch (level) {
    case 'low':
      return 'Corruption is under control. No adverse effects.';
    case 'medium':
      return 'Corruption is rising. Minor production penalties may occur.';
    case 'high':
      return 'Corruption is dangerous. Significant penalties to production and morale.';
    case 'critical':
      return 'Corruption is overwhelming. Severe penalties and catastrophic events possible.';
  }
}

export async function corruptionAdd(amount: number): Promise<number> {
  if (amount <= 0) return 0;

  let actualAdded = 0;

  await updateGamestate((state) => {
    const resource = state.world.resources.corruption;
    const available = resource.max - resource.current;
    actualAdded = Math.min(amount, available);

    return {
      ...state,
      world: {
        ...state.world,
        resources: {
          ...state.world.resources,
          corruption: {
            ...resource,
            current: resource.current + actualAdded,
          },
        },
      },
    };
  });

  return actualAdded;
}

export async function corruptionSpend(amount: number): Promise<boolean> {
  if (amount <= 0) return false;

  const current = gamestate().world.resources.corruption.current;
  if (current < amount) return false;

  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      resources: {
        ...state.world.resources,
        corruption: {
          ...state.world.resources.corruption,
          current: state.world.resources.corruption.current - amount,
        },
      },
    },
  }));

  return true;
}

export function corruptionCanAfford(amount: number): boolean {
  return gamestate().world.resources.corruption.current >= amount;
}
