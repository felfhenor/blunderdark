import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { HasDescription } from '@interfaces/traits';

export type CorruptionEffectId = Branded<string, 'CorruptionEffectId'>;

type CorruptionEffectTriggerType = 'threshold' | 'interval';
type CorruptionEffectBehavior = 'passive' | 'event';
type CorruptionEffectNotificationSeverity = 'info' | 'warning' | 'error';

export type CorruptionEffectType =
  | 'unlock'
  | 'trigger_invasion'
  | 'mutate_inhabitant'
  | 'production_modifier'
  | 'combat_modifier'
  | 'research_modifier'
  | 'recruitment_modifier'
  | 'resource_grant'
  | 'inhabitant_debuff'
  | 'visual';

type CorruptionEffectConditions = {
  requiresResearch?: string[];
  minFloorDepth?: number;
  minInhabitants?: number;
};

type CorruptionEffectNotification = {
  title: string;
  message: string;
  severity: CorruptionEffectNotificationSeverity;
};

type CorruptionEffectVisual = {
  gridClass?: string;
  progressBarClass?: string;
};

export type CorruptionEffectContent = IsContentItem &
  HasDescription & {
    id: CorruptionEffectId;
    triggerType: CorruptionEffectTriggerType;
    triggerValue: number;
    oneTime: boolean;
    retriggerable: boolean;
    probability: number | undefined;
    cooldownMinutes: number | undefined;
    conditions: CorruptionEffectConditions | undefined;
    behavior: CorruptionEffectBehavior;
    effectType: CorruptionEffectType;
    effectParams: Record<string, unknown> | undefined;
    notification: CorruptionEffectNotification | undefined;
    visualEffect: CorruptionEffectVisual | undefined;
  };
