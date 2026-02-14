import { contentGetEntry } from '@helpers/content';
import type { InhabitantInstance, PlacedRoomId } from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { DayNightPhase, DayNightResourceModifier, DayNightCreatureModifier } from '@interfaces/day-night';

// --- Constants ---

export const DAY_NIGHT_DAY_START = 7;
export const DAY_NIGHT_DAY_END = 17;
export const DAY_NIGHT_DAWN_HOUR = 6;
export const DAY_NIGHT_DUSK_HOUR = 18;

// --- Phase detection ---

/**
 * Get the current day/night phase for a given hour.
 * Dawn = hour 6, Dusk = hour 18, Day = 7-17, Night = 19-5 and 0-5.
 */
export function dayNightGetPhase(hour: number): DayNightPhase {
  if (hour === DAY_NIGHT_DAWN_HOUR) return 'dawn';
  if (hour === DAY_NIGHT_DUSK_HOUR) return 'dusk';
  if (hour >= DAY_NIGHT_DAY_START && hour <= DAY_NIGHT_DAY_END) return 'day';
  return 'night';
}

// --- Resource modifier configuration ---

const RESOURCE_MODIFIERS: readonly DayNightResourceModifier[] = [
  {
    source: 'time-of-day',
    resourceType: 'food',
    multiplier: 1.25,
    phase: 'day',
    description: 'Daylight food bonus (+25%)',
  },
  {
    source: 'time-of-day',
    resourceType: 'corruption',
    multiplier: 1.50,
    phase: 'night',
    description: 'Nighttime corruption surge (+50%)',
  },
  {
    source: 'time-of-day',
    resourceType: 'flux',
    multiplier: 2.0,
    phase: 'dawn',
    description: 'Dawn flux surge (+100%)',
  },
  {
    source: 'time-of-day',
    resourceType: 'flux',
    multiplier: 2.0,
    phase: 'dusk',
    description: 'Dusk flux surge (+100%)',
  },
];

// --- Creature modifier configuration ---

const CREATURE_MODIFIERS: readonly DayNightCreatureModifier[] = [
  {
    source: 'time-of-day',
    creatureType: 'undead',
    multiplier: 0.90,
    phase: 'day',
    description: 'Undead daylight penalty (-10%)',
  },
  {
    source: 'time-of-day',
    creatureType: 'undead',
    multiplier: 1.30,
    phase: 'night',
    description: 'Undead nighttime bonus (+30%)',
  },
];

// --- Resource modifier functions ---

/**
 * Get the global resource production multiplier for a specific resource type at a given hour.
 * Returns 1.0 if no modifier applies.
 */
export function dayNightGetResourceModifier(hour: number, resourceType: string): number {
  const phase = dayNightGetPhase(hour);
  const modifier = RESOURCE_MODIFIERS.find(
    (m) => m.phase === phase && m.resourceType === resourceType,
  );
  return modifier?.multiplier ?? 1.0;
}

/**
 * Get all active resource modifiers for the current hour.
 * Returns only modifiers that differ from 1.0.
 */
export function dayNightGetActiveResourceModifiers(hour: number): DayNightResourceModifier[] {
  const phase = dayNightGetPhase(hour);
  return RESOURCE_MODIFIERS.filter((m) => m.phase === phase);
}

// --- Creature modifier functions ---

/**
 * Get the creature-type production multiplier for a given hour and creature type.
 * Returns 1.0 if no modifier applies.
 */
export function dayNightGetCreatureModifier(hour: number, creatureType: string): number {
  const phase = dayNightGetPhase(hour);
  const modifier = CREATURE_MODIFIERS.find(
    (m) => m.phase === phase && m.creatureType === creatureType,
  );
  return modifier?.multiplier ?? 1.0;
}

/**
 * Get all active creature modifiers for the current hour.
 */
export function dayNightGetActiveCreatureModifiers(hour: number): DayNightCreatureModifier[] {
  const phase = dayNightGetPhase(hour);
  return CREATURE_MODIFIERS.filter((m) => m.phase === phase);
}

/**
 * Calculate the weighted creature-type production modifier for a room based on
 * the creature types of its assigned inhabitants.
 *
 * If a room has 2 goblins (creature) and 1 skeleton (undead) during daytime,
 * the undead get -10%: weighted = (2/3 * 1.0) + (1/3 * 0.90) = 0.967
 *
 * Returns 1.0 if no inhabitants are assigned or no modifiers apply.
 */
export function dayNightCalculateCreatureProductionModifier(
  hour: number,
  inhabitants: InhabitantInstance[],
  roomId: PlacedRoomId,
): number {
  const assigned = inhabitants.filter((i) => i.assignedRoomId === roomId);
  if (assigned.length === 0) return 1.0;

  let weightedSum = 0;

  for (const inhabitant of assigned) {
    const def = contentGetEntry<InhabitantContent>(
      inhabitant.definitionId,
    );
    if (!def) {
      weightedSum += 1.0;
      continue;
    }
    weightedSum += dayNightGetCreatureModifier(hour, def.type);
  }

  return weightedSum / assigned.length;
}

/**
 * Pure version of creature production modifier that takes definitions directly.
 * Used for testing without content system dependency.
 */
export function dayNightCalculateCreatureProductionModifierPure(
  hour: number,
  creatureTypes: string[],
): number {
  if (creatureTypes.length === 0) return 1.0;

  let weightedSum = 0;
  for (const type of creatureTypes) {
    weightedSum += dayNightGetCreatureModifier(hour, type);
  }

  return weightedSum / creatureTypes.length;
}

/**
 * Get all active modifiers (resource + creature) for display purposes.
 */
export function dayNightGetAllActiveModifiers(hour: number): {
  phase: DayNightPhase;
  resourceModifiers: DayNightResourceModifier[];
  creatureModifiers: DayNightCreatureModifier[];
} {
  const phase = dayNightGetPhase(hour);
  return {
    phase,
    resourceModifiers: dayNightGetActiveResourceModifiers(hour),
    creatureModifiers: dayNightGetActiveCreatureModifiers(hour),
  };
}

/**
 * Format a multiplier as a percentage string.
 * e.g., 1.25 → "+25%", 0.90 → "-10%"
 */
export function dayNightFormatMultiplier(multiplier: number): string {
  const percentage = Math.round((multiplier - 1.0) * 100);
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage}%`;
}

/**
 * Get a display label for a phase.
 */
export function dayNightGetPhaseLabel(phase: DayNightPhase): string {
  const labels: Record<DayNightPhase, string> = {
    day: 'Day',
    night: 'Night',
    dawn: 'Dawn',
    dusk: 'Dusk',
  };
  return labels[phase];
}
