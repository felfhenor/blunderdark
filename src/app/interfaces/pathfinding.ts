export type PathNode = {
  roomId: string;
  roomTypeId: string;
  x: number;
  y: number;
  fearLevel: number;
};

export type PathEdge = {
  toRoomId: string;
  baseCost: number;
};

export type DungeonGraph = {
  nodes: Map<string, PathNode>;
  adjacency: Map<string, PathEdge[]>;
};

export type PathfindingOptions = {
  morale?: number;
  fearCostMultiplier?: number;
  blockedNodes?: Set<string>;
};

export type SecondaryObjective = {
  roomId: string;
  priority: number;
};
