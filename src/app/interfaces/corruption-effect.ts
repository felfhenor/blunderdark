import type { CorruptionEffectId } from '@interfaces/content-corruptioneffect';

export type CorruptionEffectState = {
  firedOneTimeEffects: CorruptionEffectId[];
  lastIntervalValues: Record<string, number>;
  lastTriggerTimes: Record<string, number>;
  retriggeredEffects: Record<string, boolean>;
};

export type CorruptionEffectEvent = {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
};
