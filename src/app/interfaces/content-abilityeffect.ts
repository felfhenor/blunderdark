import type { Branded, IsContentItem } from '@interfaces/identifiable';

export type AbilityEffectId = Branded<string, 'AbilityEffectId'>;

export type AbilityEffectContent = IsContentItem & {
  id: AbilityEffectId;
  dealsDamage: boolean;
  statusName: string | undefined;
  overrideTargetsHit: number | undefined;
};
