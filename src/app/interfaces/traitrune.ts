import type { TraitRuneId } from '@interfaces/content-traitrune';
import type { Branded } from '@interfaces/identifiable';
import type { InvaderClassType } from '@interfaces/invader';

export type TraitRuneInstanceId = Branded<string, 'TraitRuneInstanceId'>;

export type TraitRune = {
  id: TraitRuneInstanceId;
  runeTypeId: TraitRuneId;
  sourceInvaderClass: InvaderClassType;
};
