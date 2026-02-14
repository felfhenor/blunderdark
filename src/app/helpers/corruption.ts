import { computed } from '@angular/core';
import { contentGetEntry } from '@helpers/content';
import { dayNightGetResourceModifier } from '@helpers/day-night-modifiers';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { GameState, InhabitantDefinition, InhabitantInstance, IsContentItem } from '@interfaces';
import type { CorruptionLevel } from '@interfaces/corruption';

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

/**
 * Calculate per-tick corruption generation from stationed inhabitants.
 * corruptionGeneration on InhabitantDefinition is in per-game-minute units.
 * Only stationed (assigned to a room) inhabitants generate corruption.
 */
export function corruptionGenerationCalculateInhabitantRate(
  inhabitants: InhabitantInstance[],
  lookupDef?: (id: string) => InhabitantDefinition | undefined,
): number {
  const lookup = lookupDef ?? ((id: string) =>
    contentGetEntry<InhabitantDefinition & IsContentItem>(id));

  let totalPerMinute = 0;
  for (const inst of inhabitants) {
    if (!inst.assignedRoomId) continue;
    const def = lookup(inst.definitionId);
    if (!def) continue;
    const rate = def.corruptionGeneration ?? 0;
    if (rate > 0) {
      totalPerMinute += rate;
    }
  }

  return totalPerMinute / GAME_TIME_TICKS_PER_MINUTE;
}

/**
 * Process inhabitant-based corruption generation each tick.
 * Applies day/night modifier (night +50%) to inhabitant-generated corruption.
 * Room-based corruption production is handled by the standard production pipeline.
 * Mutates state in-place (same pattern as productionProcess/hungerProcess).
 */
export function corruptionGenerationProcess(state: GameState): void {
  const basePerTick = corruptionGenerationCalculateInhabitantRate(
    state.world.inhabitants,
  );

  if (basePerTick <= 0) return;

  const dayNightMod = dayNightGetResourceModifier(state.clock.hour, 'corruption');
  const finalPerTick = basePerTick * dayNightMod;

  const resource = state.world.resources.corruption;
  const available = resource.max - resource.current;
  resource.current += Math.min(finalPerTick, available);
}

/**
 * Calculate total corruption generation per minute from all sources (for UI display).
 * Combines room-based production (from productionRates) and inhabitant-based generation.
 */
export function corruptionGenerationCalculateTotalPerMinute(
  inhabitantRatePerTick: number,
  roomRatePerTick: number,
): number {
  return (inhabitantRatePerTick + roomRatePerTick) * GAME_TIME_TICKS_PER_MINUTE;
}
