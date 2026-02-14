export type FloorDepthResourceModifier = {
  resourceType: string;
  percentage: number;
  description: string;
};

export type FloorDepthModifierTier = {
  minDepth: number;
  maxDepth: number;
  modifiers: FloorDepthResourceModifier[];
};
