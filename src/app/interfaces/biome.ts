export type BiomeType =
  | 'volcanic'
  | 'flooded'
  | 'crystal'
  | 'corrupted'
  | 'fungal'
  | 'neutral';

export type Biome = {
  type: BiomeType;
  name: string;
  description: string;
  color: string;
  featureFlag?: string;
};

export const BIOME_DATA: Record<BiomeType, Biome> = {
  volcanic: {
    type: 'volcanic',
    name: 'Volcanic',
    description: 'A scorching cavern with rivers of magma and obsidian formations.',
    color: '#e63946',
  },
  flooded: {
    type: 'flooded',
    name: 'Flooded',
    description: 'Waterlogged tunnels with dripping stalactites and underground pools.',
    color: '#457b9d',
  },
  crystal: {
    type: 'crystal',
    name: 'Crystal',
    description: 'Glittering caverns lined with luminous crystal growths.',
    color: '#a8dadc',
    featureFlag: 'biome_crystal',
  },
  corrupted: {
    type: 'corrupted',
    name: 'Corrupted',
    description: 'Dark passages pulsing with malevolent energy and twisted stone.',
    color: '#6a0572',
    featureFlag: 'biome_corrupted',
  },
  fungal: {
    type: 'fungal',
    name: 'Fungal',
    description: 'Damp caves carpeted with bioluminescent mushrooms and spore clouds.',
    color: '#2d6a4f',
  },
  neutral: {
    type: 'neutral',
    name: 'Neutral',
    description: 'Standard underground caverns with no special properties.',
    color: '#6c757d',
  },
};
