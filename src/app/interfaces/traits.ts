export interface HasDescription {
  description: string;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface HasRarity {
  rarity: Rarity;
}
