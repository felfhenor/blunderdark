export type HungerWarningLevel = 'low' | 'critical';

export type HungerWarningEvent = {
  level: HungerWarningLevel;
  foodRemaining: number;
  consumptionPerTick: number;
};
