import type { PlacedRoomId } from '@interfaces/room-shape';

export type AdjacencyMap = Record<PlacedRoomId, PlacedRoomId[]>;
