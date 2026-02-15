export type FearPropagationSource = {
  sourceRoomId: string;
  sourceRoomName: string;
  amount: number;
};

export type FearLevelBreakdown = {
  baseFear: number;
  inhabitantModifier: number;
  upgradeAdjustment: number;
  altarAuraReduction: number;
  featureReduction: number;
  propagatedFear: number;
  propagationSources: FearPropagationSource[];
  effectiveFear: number;
};
