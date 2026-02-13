import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ReputationLevel, ReputationType } from '@interfaces/reputation';
import type { HasDescription } from '@interfaces/traits';

export type ReputationEffectId = Branded<string, 'ReputationEffectId'>;

export type ReputationEffectType =
  | 'unlock_room'
  | 'modify_event_rate'
  | 'attract_creature'
  | 'modify_production'
  | 'modify_invasion_rate';

export type ReputationEffectContent = IsContentItem &
  HasDescription & {
    id: ReputationEffectId;
    reputationType: ReputationType;
    minimumLevel: ReputationLevel;
    effectType: ReputationEffectType;
    effectValue: number;
    targetId?: string;
  };
