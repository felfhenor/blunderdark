import type { ElevatorId } from '@interfaces/elevator';
import type { HallwayId } from '@interfaces/hallway';
import type { PortalId } from '@interfaces/portal';
import type { PlacedRoomId } from '@interfaces/room-shape';
import type { StairId } from '@interfaces/stair';

export type TileOccupant = 'empty' | 'room' | 'hallway' | 'stair' | 'elevator' | 'portal';

export type GridTile = {
  occupied: boolean;
  occupiedBy: TileOccupant;
  roomId: PlacedRoomId | undefined;
  hallwayId: HallwayId | undefined;
  stairId: StairId | undefined;
  elevatorId: ElevatorId | undefined;
  portalId: PortalId | undefined;
  connectionType: string | undefined;
};

export type GridState = GridTile[][];

export const GRID_SIZE = 20;
