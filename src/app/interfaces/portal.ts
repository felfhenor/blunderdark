import type { Branded } from '@interfaces/identifiable';

export type PortalId = Branded<string, 'PortalId'>;

export type PortalInstance = {
  id: PortalId;
  floorDepthA: number;
  floorDepthB: number;
  positionA: { x: number; y: number };
  positionB: { x: number; y: number };
};

export type PortalValidationResult = {
  valid: boolean;
  error?: string;
};

export type PortalRemovalInfo = {
  canRemove: boolean;
  refundFlux: number;
  refundEssence: number;
  traversingInhabitantNames: string[];
  reason?: string;
};
