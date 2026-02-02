import type { Branded } from '@interfaces/identifiable';

export type GameId = Branded<string, 'GameId'>;

import type { GridState } from '@interfaces/grid';
import type { Hallway } from '@interfaces/hallway';
import type { InhabitantInstance } from '@interfaces/inhabitant';
import type { ResourceMap } from '@interfaces/resource';

export interface GameStateWorld {
  grid: GridState;
  resources: ResourceMap;
  inhabitants: InhabitantInstance[];
  hallways: Hallway[];
}

export interface GameStateClock {
  numTicks: number;
  lastSaveTick: number;
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
