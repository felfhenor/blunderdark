export type TileOffset = {
  x: number;
  y: number;
};

export type Rotation = 0 | 1 | 2 | 3;

export type RoomShape = {
  id: string;
  name: string;
  tiles: TileOffset[];
  width: number;
  height: number;
};

export type BreedingJob = {
  parentAInstanceId: string;
  parentBInstanceId: string;
  recipeId: string;
  ticksRemaining: number;
  targetTicks: number;
};

export type MutationJob = {
  targetInstanceId: string;
  ticksRemaining: number;
  targetTicks: number;
};

export type SummonJob = {
  recipeId: string;
  ticksRemaining: number;
  targetTicks: number;
};

export type TortureJob = {
  prisonerId: string;
  action: 'extract' | 'convert';
  ticksRemaining: number;
  targetTicks: number;
};

export type PlacedRoom = {
  id: string;
  roomTypeId: string;
  shapeId: string;
  anchorX: number;
  anchorY: number;
  rotation?: Rotation;
  appliedUpgradePathId?: string;
  spawnTicksRemaining?: number;
  breedingJob?: BreedingJob;
  mutationJob?: MutationJob;
  summonJob?: SummonJob;
  tortureJob?: TortureJob;
};
