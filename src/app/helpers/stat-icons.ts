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

export const STAT_DESCRIPTION_MAP: Record<StatType, string> = {
  hp: 'Hit Points — how much damage this inhabitant can take before being defeated',
  attack: 'Attack — damage dealt to invaders in combat',
  defense: 'Defense — reduces incoming damage from invaders',
  speed: 'Speed — determines turn order in combat',
  workerEfficiency: 'Efficiency — multiplier for resource production when assigned to a room',
};
