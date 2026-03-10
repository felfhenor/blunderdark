import type { Icon } from '@interfaces';
import type { ResourceType } from '@interfaces/resource';

export const RESOURCE_ICON_MAP: Record<ResourceType, Icon> = {
  crystals: 'gameCrystalGrowth',
  food: 'gameMeat',
  gold: 'gameTwoCoins',
  flux: 'gameFlowerTwirl',
  research: 'gameFizzingFlask',
  essence: 'gameBallGlow',
  corruption: 'gameBurningBlobs',
};

export const RESOURCE_COLOR_MAP: Record<ResourceType, string> = {
  crystals: '#06b6d4',
  food: '#d97706',
  gold: '#eab308',
  flux: '#ec4899',
  research: '#6366f1',
  essence: '#14b8a6',
  corruption: '#c026d3',
};

export const RESOURCE_LABEL_MAP: Record<ResourceType, string> = {
  crystals: 'Crystals',
  food: 'Food',
  gold: 'Gold',
  flux: 'Flux',
  research: 'Research',
  essence: 'Essence',
  corruption: 'Corruption',
};
