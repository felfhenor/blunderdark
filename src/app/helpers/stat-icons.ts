import type { Icon } from '@interfaces';
import type { InhabitantStats } from '@interfaces/inhabitant';

export type StatType = keyof InhabitantStats;

export const STAT_ICON_MAP: Record<StatType, Icon> = {
  hp: 'gameNestedHearts',
  attack: 'gameSpinningSword',
  defense: 'gameVibratingShield',
  speed: 'gameLeatherBoot',
  workerEfficiency: 'gameWarPick',
};

export const STAT_COLOR_MAP: Record<StatType, string> = {
  hp: '#ef4444',
  attack: '#f59e0b',
  defense: '#3b82f6',
  speed: '#22c55e',
  workerEfficiency: '#a855f7',
};

export const STAT_LABEL_MAP: Record<StatType, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  speed: 'SPD',
  workerEfficiency: 'EFF',
};
