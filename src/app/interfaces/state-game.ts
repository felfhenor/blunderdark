import type { Branded } from '@interfaces/identifiable';
import type { FarplaneSoul } from '@interfaces/farplane';
import type { Floor } from '@interfaces/floor';
import type { GridState } from '@interfaces/grid';
import type { Hallway } from '@interfaces/hallway';
import type { InhabitantInstance } from '@interfaces/inhabitant';
import type { ResearchState } from '@interfaces/research';
import type { ReputationState } from '@interfaces/reputation';
import type { ResourceMap } from '@interfaces/resource';
import type { SeasonState } from '@interfaces/season';
import type { TrapInventoryEntry } from '@interfaces/trap';
import type { ForgeInventoryEntry } from '@interfaces/forge';
import type { AlchemyConversion } from '@interfaces/alchemy';
import type { CorruptionEffectState } from '@interfaces/corruption-effect';
import type { ActiveInvasion, CapturedPrisoner, InvasionSchedule } from '@interfaces/invasion';
import type { MerchantState } from '@interfaces/merchant';
import type { InterrogationBuff } from '@interfaces/torture';
import type { TraitRune } from '@interfaces/traitrune';
import type { ResourceType } from '@interfaces/resource';
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
  forgeInventory: ForgeInventoryEntry[];
  alchemyConversions: AlchemyConversion[];
  prisoners: CapturedPrisoner[];
  traitRunes: TraitRune[];
  interrogationBuffs: InterrogationBuff[];
  farplaneSouls: FarplaneSoul[];
  invasionSchedule: InvasionSchedule;
  playerThreat: number;
  activeInvasion?: ActiveInvasion;
  corruptionEffects: CorruptionEffectState;
  victoryProgress: VictoryProgress;
  merchant: MerchantState;
  unlockedCurrencies: ResourceType[];
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
