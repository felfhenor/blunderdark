import type { BiomeType } from '@interfaces/biome';
import type { Connection } from '@interfaces/connection';
import type { GridState } from '@interfaces/grid';
import type { Hallway } from '@interfaces/hallway';
import type { InhabitantInstance } from '@interfaces/inhabitant';
import type { PlacedRoom } from '@interfaces/room-shape';
import type { TrapInstance } from '@interfaces/trap';

export type Floor = {
  id: string;
  name: string;
  depth: number;
  biome: BiomeType;
  grid: GridState;
  rooms: PlacedRoom[];
  hallways: Hallway[];
  inhabitants: InhabitantInstance[];
  connections: Connection[];
  traps: TrapInstance[];
};

export const MAX_FLOORS = 10;
