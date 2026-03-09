import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ReputationType } from '@interfaces/reputation';
import type { HasDescription } from '@interfaces/traits';

export type ReputationActionId = Branded<string, 'ReputationActionId'>;

export type ReputationActionType =
  | 'place_torture_chamber'
  | 'defeat_invader'
  | 'summon_wraith'
  | 'build_treasure_vault'
  | 'complete_trade_deal'
  | 'mine_gold_vein'
  | 'forge_equipment'
  | 'complete_research'
  | 'build_library'
  | 'build_mushroom_grove'
  | 'feed_all_inhabitants'
  | 'peaceful_season_transition'
  | 'embrace_corruption'
  | 'summon_demon'
  | 'activate_ley_line_nexus'
  | 'prisoner_extract'
  | 'prisoner_break'
  | 'prisoner_interrogate'
  | 'complete_transmutation'
  | 'create_hybrid'
  | 'trigger_positive_mutation'
  | 'complete_fusion'
  | 'embed_rune'
  | 'craft_trap'
  | 'preserve_fallen_soul'
  | 'recruit_from_farplane'
  | 'capture_prisoner'
  | 'repel_invasion_flawless'
  | 'lose_invasion'
  | 'complete_summoning'
  | 'spend_corruption'
  | 'upgrade_room'
  | 'recruit_harmony_creature';

export type ReputationActionContent = IsContentItem &
  HasDescription & {
    id: ReputationActionId;
    actionType: ReputationActionType;
    reputationRewards: Partial<Record<ReputationType, number>>;
  };
