import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceCost } from '@interfaces/resource';
import type { RoomUpgradeEffect } from '@interfaces/room';
import type { HasDescription } from '@interfaces/traits';

export type RoomUpgradeId = Branded<string, 'RoomUpgradeId'>;

export type RoomUpgradeContent = IsContentItem &
  HasDescription & {
    id: RoomUpgradeId;
    cost: ResourceCost;
    effects: RoomUpgradeEffect[];
    upgradeLevel?: number;
    requiresDarkUpgrade?: boolean;
  };
