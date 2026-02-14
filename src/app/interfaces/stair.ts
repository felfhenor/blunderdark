export type StairDirection = 'up' | 'down';

export type StairInstance = {
  id: string;
  floorDepthA: number;
  floorDepthB: number;
  gridX: number;
  gridY: number;
};

export type StairValidationResult = {
  valid: boolean;
  error?: string;
};

export type StairRemovalInfo = {
  canRemove: boolean;
  refund: number;
  traversingInhabitantNames: string[];
  reason?: string;
};
