import type { PlacedRoomId } from '@interfaces/room-shape';

export type FloatingBubbleVariant = 'production' | 'queue' | 'placement';

export type FloatingBubbleEntry = {
  text: string;
  resourceType?: string;
};

export type FloatingBubble = {
  id: number;
  roomId: PlacedRoomId;
  floorIndex: number;
  entries: FloatingBubbleEntry[];
  variant: FloatingBubbleVariant;
  anchorX: number;
  anchorY: number;
  centerOffsetPx: number;
  stackOffset: number;
};
