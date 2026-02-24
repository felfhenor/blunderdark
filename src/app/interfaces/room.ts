export type RoomProduction = Partial<Record<string, number>>;

export type AdjacencyBonus = {
  adjacentRoomId: string;
  bonus: number;
  description: string;
};

export type RoomUpgradeEffect = {
  type: string;
  value: number;
  resource?: string;
};
