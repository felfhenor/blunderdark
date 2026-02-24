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
  effectsLabel: string;
  requiresResearch?: boolean;
};

export const BIOME_DATA: Record<BiomeType, Biome> = {
  volcanic: {
    type: 'volcanic',
    name: 'Volcanic',
    description:
      'A scorching cavern with rivers of magma and obsidian formations.',
    color: '#e63946',
    effectsLabel: '+Fire damage, -Water creatures',
  },
  flooded: {
    type: 'flooded',
    name: 'Flooded',
    description:
      'Waterlogged tunnels with dripping stalactites and underground pools.',
    color: '#457b9d',
    effectsLabel: '+Water creatures, slower movement',
  },
  crystal: {
    type: 'crystal',
    name: 'Crystal',
    description: 'Glittering caverns lined with luminous crystal growths.',
    color: '#a8dadc',
    effectsLabel: '+Crystal production, light bonus',
    requiresResearch: true,
  },
  corrupted: {
    type: 'corrupted',
    name: 'Corrupted',
    description:
      'Dark passages pulsing with malevolent energy and twisted stone.',
    color: '#6a0572',
    effectsLabel: '+Corruption gain, +Dark energy',
    requiresResearch: true,
  },
  fungal: {
    type: 'fungal',
    name: 'Fungal',
    description:
      'Damp caves carpeted with bioluminescent mushrooms and spore clouds.',
    color: '#2d6a4f',
    effectsLabel: '+Food production, spore hazards',
  },
  neutral: {
    type: 'neutral',
    name: 'Neutral',
    description: 'Standard underground caverns with no special properties.',
    color: '#6c757d',
    effectsLabel: 'No special modifiers',
  },
};
