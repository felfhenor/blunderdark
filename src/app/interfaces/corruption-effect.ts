export type CorruptionEffectState = {
  darkUpgradeUnlocked: boolean;
  lastMutationCorruption: number | undefined;
  lastCrusadeCorruption: number | undefined;
  warnedThresholds: number[];
};

export type CorruptionEffectEventType =
  | 'dark_upgrade_unlocked'
  | 'mutation_applied'
  | 'crusade_triggered';

export type CorruptionEffectEvent = {
  type: CorruptionEffectEventType;
  description: string;
};
