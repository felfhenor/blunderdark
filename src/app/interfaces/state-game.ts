import type { Branded } from '@interfaces/identifiable';
import type { Floor } from '@interfaces/floor';
import type { GridState } from '@interfaces/grid';
import type { Hallway } from '@interfaces/hallway';
import type { InhabitantInstance } from '@interfaces/inhabitant';
import type { ResearchState } from '@interfaces/research';
import type { ReputationState } from '@interfaces/reputation';
import type { ResourceMap } from '@interfaces/resource';
import type { SeasonState } from '@interfaces/season';
import type { TrapCraftingQueue, TrapInventoryEntry } from '@interfaces/trap';
import type { ForgeCraftingQueue, ForgeInventoryEntry } from '@interfaces/forge';
import type { AlchemyConversion } from '@interfaces/alchemy';
import type { CorruptionEffectState } from '@interfaces/corruption-effect';
import type { CapturedPrisoner, InvasionSchedule } from '@interfaces/invasion';
import type { StairInstance } from '@interfaces/stair';
import type { ElevatorInstance } from '@interfaces/elevator';
import type { PortalInstance } from '@interfaces/portal';
import type { MerchantState } from '@interfaces/merchant';
import type { VictoryProgress } from '@interfaces/victory';

export type GameId = Branded<string, 'GameId'>;

export interface GameStateWorld {
  grid: GridState;
  resources: ResourceMap;
  inhabitants: InhabitantInstance[];
  hallways: Hallway[];
  season: SeasonState;
  research: ResearchState;
  reputation: ReputationState;
  floors: Floor[];
  currentFloorIndex: number;
  trapInventory: TrapInventoryEntry[];
  trapCraftingQueues: TrapCraftingQueue[];
  forgeInventory: ForgeInventoryEntry[];
  forgeCraftingQueues: ForgeCraftingQueue[];
  alchemyConversions: AlchemyConversion[];
  prisoners: CapturedPrisoner[];
  invasionSchedule: InvasionSchedule;
  corruptionEffects: CorruptionEffectState;
  stairs: StairInstance[];
  elevators: ElevatorInstance[];
  portals: PortalInstance[];
  victoryProgress: VictoryProgress;
  merchant: MerchantState;
}

export interface GameStateClock {
  numTicks: number;
  lastSaveTick: number;
  day: number;
  hour: number;
  minute: number;
}

export interface GameStateMeta {
  version: number;
  isSetup: boolean;
  isPaused: boolean;
  createdAt: number;
}

export interface GameState {
  meta: GameStateMeta;
  gameId: GameId;
  clock: GameStateClock;
  world: GameStateWorld;
}
