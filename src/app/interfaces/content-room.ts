import type { RoomUpgradeId } from '@interfaces/content-roomupgrade';
import type { RoomShapeId } from '@interfaces/content-roomshape';
import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceCost } from '@interfaces/resource';
import type { AdjacencyBonus, RoomProduction } from '@interfaces/room';
import type { HasDescription } from '@interfaces/traits';

export type RoomId = Branded<string, 'RoomId'>;

export type RoomContent = IsContentItem &
  HasDescription & {
    id: RoomId;
    shapeId: RoomShapeId;
    cost: ResourceCost;
    production: RoomProduction;
    requiresWorkers: boolean;
    adjacencyBonuses: AdjacencyBonus[];
    isUnique: boolean;
    removable: boolean;
    maxInhabitants: number;
    maxFeatures: number;
    inhabitantRestriction: string | undefined;
    fearLevel: number | 'variable';
    fearReductionAura: number;
    autoPlace: boolean;
    roomUpgradeIds: RoomUpgradeId[];
    role: string | undefined;
    timeOfDayBonus: { period: 'day' | 'night'; bonus: number } | undefined;
    biomeBonuses: Partial<Record<string, number>> | undefined;
    invasionProfile: { dimension: string; weight: number } | undefined;
    objectiveTypes: string[] | undefined;
    trainingAdjacencyEffects:
      | { timeReduction?: number; statBonus?: number }
      | undefined;
    throneAdjacencyEffects:
      | { goldProductionBonus?: number }
      | undefined;
    spawnRate: number | undefined;
    spawnType: string | undefined;
    spawnCapacity: number | undefined;
    breedingAdjacencyEffects:
      | {
          hybridTimeReduction?: number;
          mutationOddsBonus?: number;
          researchBonus?: number;
        }
      | undefined;
    summoningAdjacencyEffects:
      | {
          summonTimeReduction?: number;
          summonStatBonus?: number;
        }
      | undefined;
    forgingAdjacencyEffects:
      | {
          forgingSpeedBonus?: number;
          forgingStatBonus?: number;
          forgingEffectivenessBonus?: number;
        }
      | undefined;
    alchemyAdjacencyEffects:
      | {
          alchemySpeedBonus?: number;
          alchemyCostReduction?: number;
        }
      | undefined;
    tortureAdjacencyEffects:
      | {
          tortureSpeedBonus?: number;
          tortureConversionBonus?: number;
        }
      | undefined;
    reputationAction: string | undefined;
    queueSize: number | undefined;
    trainingTraitNames: string[];
  };
