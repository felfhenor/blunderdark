import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { StatusEffectName } from '@interfaces/combat';

export type AbilityEffectId = Branded<string, 'AbilityEffectId'>;

export type AbilityEffectContent = IsContentItem & {
  id: AbilityEffectId;
  dealsDamage: boolean;
  statusName: StatusEffectName | undefined;
  overrideTargetsHit: number | undefined;
};
