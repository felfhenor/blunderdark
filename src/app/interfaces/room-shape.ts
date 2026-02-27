import type { BreedingRecipeId } from '@interfaces/content-breedingrecipe';
import type { FeatureId } from '@interfaces/content-feature';
import type { ForgeRecipeId } from '@interfaces/content-forgerecipe';
import type { RoomId } from '@interfaces/content-room';
import type { RoomShapeId } from '@interfaces/content-roomshape';
import type { SummonRecipeId } from '@interfaces/content-summonrecipe';
import type { TrapId } from '@interfaces/content-trap';
import type { Branded } from '@interfaces/identifiable';
import type { InhabitantInstanceId } from '@interfaces/inhabitant';
import type { PrisonerId } from '@interfaces/invasion';
import type { RoomUpgradeId } from '@interfaces/content-roomupgrade';
import type { TortureStage, TortureStageAction } from '@interfaces/torture';
import type { TraitRuneInstanceId } from '@interfaces/traitrune';

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
  progress: number;
  targetTicks: number;
};

export type ForgeCraftingJob = {
  recipeId: ForgeRecipeId;
  progress: number;
  targetTicks: number;
};

export type TrapCraftingJob = {
  trapTypeId: TrapId;
  progress: number;
  targetTicks: number;
};

export type TortureJob = {
  prisonerId: PrisonerId;
  currentStage: TortureStage;
  stageAction?: TortureStageAction;
  ticksRemaining: number;
  targetTicks: number;
};

export type RuneworkingJob = {
  runeId: TraitRuneInstanceId;
  inhabitantInstanceId: InhabitantInstanceId;
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
  appliedUpgradePathId?: RoomUpgradeId;
  spawnTicksRemaining?: number;
  breedingJob?: BreedingJob;
  mutationJob?: MutationJob;
  summonJobs?: SummonJob[];
  tortureJob?: TortureJob;
  runeworkingJob?: RuneworkingJob;
  forgeJobs?: ForgeCraftingJob[];
  trapJobs?: TrapCraftingJob[];
  featureIds?: FeatureId[];
  sacrificeBuff?: SacrificeBuff;
  convertedOutputResource?: string;
  maintenanceActive?: boolean;
  breedingInhabitantOrder?: InhabitantInstanceId[];
  phylacteryCharges?: number;
  voidGateLastSummonDay?: number;
  transportType?: TransportType;
  transportGroupId?: TransportGroupId;
};
