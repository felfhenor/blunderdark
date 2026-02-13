import type { ICON_ALL } from '@helpers';

export type Icon = keyof typeof ICON_ALL;

export interface HasSprite {
  sprite: string;
}

export type HasAnimation = HasSprite & {
  frames: number;
};

export type AtlasedImage = 'inhabitant';
