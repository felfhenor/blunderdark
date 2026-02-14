export type PortalInstance = {
  id: string;
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
