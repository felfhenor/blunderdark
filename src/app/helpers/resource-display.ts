import {
  consumptionBreakdowns,
  corruptionGetLevel,
  corruptionGetLevelDescription,
  gamestate,
  productionBreakdowns,
  productionPerMinute,
} from '@helpers';
import type { CorruptionLevel } from '@interfaces/corruption';
import type { ResourceType } from '@interfaces';
import type {
  ResourceConsumptionBreakdown,
  ResourceProductionBreakdown,
} from '@interfaces/production';

export type ResourceBreakdownInfo = {
  prod: ResourceProductionBreakdown | undefined;
  cons: ResourceConsumptionBreakdown | undefined;
  net: number;
};

export type ResourceDisplay = {
  type: ResourceType;
  label: string;
  color: string;
  description: string;
};

export const RESOURCE_DISPLAY: ResourceDisplay[] = [
  {
    type: 'crystals',
    label: 'Crystals',
    color: 'progress-info',
    description: 'Magical crystals used for construction and upgrades.',
  },
  {
    type: 'food',
    label: 'Food',
    color: 'progress-success',
    description: 'Sustenance for your dungeon inhabitants.',
  },
  {
    type: 'gold',
    label: 'Gold',
    color: 'progress-warning',
    description: 'Currency for hiring and trading.',
  },
  {
    type: 'flux',
    label: 'Flux',
    color: 'progress-secondary',
    description: 'Arcane energy that powers magical rooms.',
  },
  {
    type: 'research',
    label: 'Research',
    color: 'progress-primary',
    description: 'Knowledge points for unlocking new technologies.',
  },
  {
    type: 'essence',
    label: 'Essence',
    color: 'progress-accent',
    description: 'Spiritual energy harvested from the dungeon.',
  },
  {
    type: 'corruption',
    label: 'Corruption',
    color: 'progress-error',
    description: 'Dark energy that spreads through your dungeon.',
  },
];

export function resourceDisplayGetCurrent(type: ResourceType): number {
  return gamestate().world.resources[type].current;
}

export function resourceDisplayGetMax(type: ResourceType): number {
  return gamestate().world.resources[type].max;
}

export function resourceDisplayGetPercent(type: ResourceType): number {
  const res = gamestate().world.resources[type];
  if (type === 'corruption') {
    return res.current === 0 ? 0 : Math.min(100, (res.current / 200) * 100);
  }
  if (res.max === 0) return 0;
  return (res.current / res.max) * 100;
}

export function resourceDisplayIsFull(type: ResourceType): boolean {
  const res = gamestate().world.resources[type];
  return res.max > 0 && res.current >= res.max;
}

export function resourceDisplayGetBreakdown(
  type: ResourceType,
): ResourceBreakdownInfo | undefined {
  const prod = productionBreakdowns()[type];
  const cons = consumptionBreakdowns()[type];
  if (!prod && !cons) return undefined;

  const productionFinal = prod?.final ?? 0;
  const consumptionTotal = cons?.total ?? 0;

  return {
    prod: prod ?? undefined,
    cons: cons ?? undefined,
    net: productionFinal - consumptionTotal,
  };
}

export function resourceDisplayFormatBreakdownRate(perTick: number): string {
  const perMin = productionPerMinute(perTick);
  if (perMin > 0) return `+${perMin.toFixed(2)}`;
  if (perMin < 0) return perMin.toFixed(2);
  return '0';
}

export function resourceDisplayGetCorruptionInfo(): {
  value: number;
  level: CorruptionLevel;
  description: string;
} {
  const value = resourceDisplayGetCurrent('corruption');
  const level = corruptionGetLevel(value);
  const description = corruptionGetLevelDescription(level);
  return { value, level, description };
}

export function resourceDisplayGetCorruptionColorClass(level: CorruptionLevel): string {
  switch (level) {
    case 'low':
      return 'text-success';
    case 'medium':
      return 'text-warning';
    case 'high':
      return 'text-orange-400';
    case 'critical':
      return 'text-error';
  }
}

export function resourceDisplayGetCorruptionBadgeClass(level: CorruptionLevel): string {
  switch (level) {
    case 'low':
      return 'badge-success';
    case 'medium':
      return 'badge-warning';
    case 'high':
      return 'badge-ghost bg-orange-400/20 text-orange-400';
    case 'critical':
      return 'badge-error';
  }
}
