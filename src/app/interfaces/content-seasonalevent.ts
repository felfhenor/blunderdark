import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceType } from '@interfaces/resource';
import type { Season } from '@interfaces/season';
import type { HasDescription } from '@interfaces/traits';

export type SeasonalEventId = Branded<string, 'SeasonalEventId'>;

export type EventEffectType =
  | 'resource_gain'
  | 'resource_loss'
  | 'production_modifier';

export type EventEffect = {
  type: EventEffectType;
  resourceType: ResourceType;
  amount?: number;
  percentage?: number;
  multiplier?: number;
  durationDays?: number;
  description: string;
};

export type EventChoice = {
  label: string;
  description: string;
  effects: EventEffect[];
};

export type SeasonalEventContent = IsContentItem &
  HasDescription & {
    id: SeasonalEventId;
    season: Season;
    weight: number;
    flavorText: string;
    effects: EventEffect[];
    choices: EventChoice[];
  };
