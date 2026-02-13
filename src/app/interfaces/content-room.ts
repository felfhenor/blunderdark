import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceCost } from '@interfaces/resource';
import type {
  AdjacencyBonus,
  RoomProduction,
  RoomUpgradePath,
} from '@interfaces/room';
import type { HasDescription } from '@interfaces/traits';

export type RoomId = Branded<string, 'RoomId'>;

export type RoomContent = IsContentItem &
  HasDescription & {
    id: RoomId;
    shapeId: string;
    cost: ResourceCost;
    production: RoomProduction;
    requiresWorkers: boolean;
    adjacencyBonuses: AdjacencyBonus[];
    isUnique: boolean;
    removable: boolean;
    maxInhabitants: number;
    inhabitantRestriction: string | undefined;
    fearLevel: number | 'variable';
    fearReductionAura: number;
    upgradePaths: RoomUpgradePath[];
    autoPlace: boolean;
    role?: string;
    timeOfDayBonus?: { period: 'day' | 'night'; bonus: number };
    biomeBonuses?: Partial<Record<string, number>>;
    invasionProfile?: { dimension: string; weight: number };
    objectiveTypes?: string[];
    trainingAdjacencyEffects?: { timeReduction?: number; statBonus?: number };
    throneAdjacencyEffects?: { goldProductionBonus?: number };
  };
