import type { Branded } from '@interfaces/identifiable';

export type StairId = Branded<string, 'StairId'>;

export type StairDirection = 'up' | 'down';

export type StairInstance = {
  id: StairId;
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
