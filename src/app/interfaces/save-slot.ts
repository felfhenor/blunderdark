export type SaveSlotId = 'autosave' | 'slot-1' | 'slot-2' | 'slot-3';

export type SaveSlotMeta = {
  slotId: SaveSlotId;
  timestamp: number;
  dungeonName: string;
  playtimeSeconds: number;
  floorCount: number;
  roomCount: number;
  dayNumber: number;
  isEmpty: boolean;
};

export type SaveSlotMetaIndex = Record<SaveSlotId, SaveSlotMeta>;
