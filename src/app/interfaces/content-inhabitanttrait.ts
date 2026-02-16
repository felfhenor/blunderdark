import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { HasDescription } from '@interfaces/traits';

export type InhabitantTraitId = Branded<string, 'InhabitantTraitId'>;

export type InhabitantTraitContent = IsContentItem &
  HasDescription & {
    id: InhabitantTraitId;
    effectType: string;
    effectValue: number;
    targetResourceType?: string;
    targetRoomId?: string;
  };
