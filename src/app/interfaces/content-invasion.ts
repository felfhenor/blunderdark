import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { InvaderClassWeights } from '@interfaces/invasion';

export type InvasionId = Branded<string, 'InvasionId'>;

export type InvasionContent = IsContentItem & {
  id: InvasionId;
  balanced: InvaderClassWeights;
  highCorruption: InvaderClassWeights;
  highWealth: InvaderClassWeights;
  highKnowledge: InvaderClassWeights;
};
