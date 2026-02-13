import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { SynergyCondition, SynergyEffect } from '@interfaces/synergy';
import type { HasDescription } from '@interfaces/traits';

export type SynergyId = Branded<string, 'SynergyId'>;

export type SynergyContent = IsContentItem &
  HasDescription & {
    id: SynergyId;
    conditions: SynergyCondition[];
    effects: SynergyEffect[];
  };
