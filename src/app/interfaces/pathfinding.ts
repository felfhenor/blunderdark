import type { RoomId } from '@interfaces/content-room';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type PathNode = {
  roomId: PlacedRoomId;
  roomTypeId: RoomId;
  x: number;
  y: number;
  fearLevel: number;
};

export type PathEdge = {
  toRoomId: PlacedRoomId;
  baseCost: number;
};

export type DungeonGraph = {
  nodes: Map<PlacedRoomId, PathNode>;
  adjacency: Map<PlacedRoomId, PathEdge[]>;
};

export type PathfindingOptions = {
  morale?: number;
  fearCostMultiplier?: number;
  blockedNodes?: Set<PlacedRoomId>;
};

export type SecondaryObjective = {
  roomId: PlacedRoomId;
  priority: number;
};
