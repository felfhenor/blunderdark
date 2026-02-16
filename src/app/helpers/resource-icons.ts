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
  crystals: 'var(--color-info)',
  food: 'var(--color-success)',
  gold: 'var(--color-warning)',
  flux: 'var(--color-secondary)',
  research: 'var(--color-primary)',
  essence: 'var(--color-accent)',
  corruption: 'var(--color-error)',
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
