export type RoomProduction = Partial<Record<string, number>>;

export type AdjacencyBonus = {
  adjacentRoomId: string;
  bonus: number;
  description: string;
};

export type RoomUpgradeEffectType =
  | 'alchemyCostMultiplier'
  | 'alchemyTierUnlock'
  | 'breedingTimeMultiplier'
  | 'craftingBonusDamage'
  | 'craftingCostMultiplier'
  | 'craftingQueueMultiplier'
  | 'craftingQueueSize'
  | 'craftingSpeedMultiplier'
  | 'fearIncrease'
  | 'fearReduction'
  | 'fearReductionAura'
  | 'forgingSpeedMultiplier'
  | 'forgingStatBonus'
  | 'forgingTierUnlock'
  | 'globalMaxInhabitantBonus'
  | 'maxInhabitantBonus'
  | 'mutationOddsBonus'
  | 'mutationStatBonus'
  | 'productionBonus'
  | 'productionMultiplier'
  | 'secondaryProduction'
  | 'soulCapacityBonus'
  | 'spawnCapacityBonus'
  | 'spawnRateReduction'
  | 'spawnTypeChange'
  | 'storageSpecialization'
  | 'summonStatBonus'
  | 'summonTierUnlock'
  | 'summonTimeMultiplier'
  | 'trainingTrait';

export type RoomUpgradeEffect = {
  type: RoomUpgradeEffectType;
  value: number;
  resource?: string;
};
