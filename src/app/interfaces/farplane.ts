import type { Branded } from '@interfaces/identifiable';
import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { InhabitantInstanceId, InhabitantStats } from '@interfaces/inhabitant';

export type FarplaneSoulId = Branded<string, 'FarplaneSoulId'>;

export type FarplaneSoul = {
  soulId: FarplaneSoulId;
  definitionId: InhabitantId;
  instanceName: string;
  instanceStatBonuses?: Partial<InhabitantStats>;
  mutated?: boolean;
  mutationTraitIds?: string[];
  instanceTraitIds?: string[];
  isHybrid?: boolean;
  hybridParentIds?: InhabitantInstanceId[];
  isSummoned?: boolean;
  capturedAtTick: number;
};
