import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { Season, SeasonBonusModifier } from '@interfaces/season';
import type { HasDescription } from '@interfaces/traits';

export type SeasonBonusId = Branded<string, 'SeasonBonusId'>;

export type SeasonBonusContent = IsContentItem &
  HasDescription & {
    id: SeasonBonusId;
    season: Season;
    resourceModifiers: SeasonBonusModifier[];
    recruitmentCostMultiplier: number;
    flags: string[];
  };
