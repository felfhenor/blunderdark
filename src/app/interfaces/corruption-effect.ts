import type { InhabitantStats } from '@interfaces/inhabitant';

export type CorruptionEffectMutation = {
  stat: keyof InhabitantStats;
  delta: number;
};

export type CorruptionEffectState = {
  darkUpgradeUnlocked: boolean;
  lastMutationCorruption: number | undefined;
  lastCrusadeCorruption: number | undefined;
};
