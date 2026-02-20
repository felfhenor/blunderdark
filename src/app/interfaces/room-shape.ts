import type { BreedingRecipeId } from '@interfaces/content-breedingrecipe';
import type { FeatureId } from '@interfaces/content-feature';
import type { RoomId } from '@interfaces/content-room';
import type { RoomShapeId } from '@interfaces/content-roomshape';
import type { SummonRecipeId } from '@interfaces/content-summonrecipe';
import type { Branded } from '@interfaces/identifiable';
import type { InhabitantInstanceId } from '@interfaces/inhabitant';
import type { PrisonerId } from '@interfaces/invasion';
import type { UpgradePathId } from '@interfaces/room';

export type PlacedRoomId = Branded<string, 'PlacedRoomId'>;
export type TransportType = 'stair' | 'elevator' | 'portal';
export type TransportGroupId = Branded<string, 'TransportGroupId'>;

export type TileOffset = {
  x: number;
  y: number;
};

export type Rotation = 0 | 1 | 2 | 3;

export type BreedingJob = {
  parentAInstanceId: InhabitantInstanceId;
  parentBInstanceId: InhabitantInstanceId;
  recipeId: BreedingRecipeId;
  ticksRemaining: number;
  targetTicks: number;
};

export type MutationJob = {
  targetInstanceId: InhabitantInstanceId;
  ticksRemaining: number;
  targetTicks: number;
};

export type SummonJob = {
  recipeId: SummonRecipeId;
  ticksRemaining: number;
  targetTicks: number;
};

export type TortureJob = {
  prisonerId: PrisonerId;
  action: 'extract' | 'convert';
  ticksRemaining: number;
  targetTicks: number;
};

export type SacrificeBuff = {
  productionMultiplier: number;
  combatMultiplier: number;
  ticksRemaining: number;
};

export type PlacedRoom = {
  id: PlacedRoomId;
  roomTypeId: RoomId;
  shapeId: RoomShapeId;
  anchorX: number;
  anchorY: number;
  suffix: string;
  rotation?: Rotation;
  appliedUpgradePathId?: UpgradePathId;
  spawnTicksRemaining?: number;
  breedingJob?: BreedingJob;
  mutationJob?: MutationJob;
  summonJob?: SummonJob;
  tortureJob?: TortureJob;
  featureIds?: FeatureId[];
  sacrificeBuff?: SacrificeBuff;
  convertedOutputResource?: string;
  maintenanceActive?: boolean;
  phylacteryCharges?: number;
  voidGateLastSummonDay?: number;
  transportType?: TransportType;
  transportGroupId?: TransportGroupId;
};
