import type { Branded } from '@interfaces/identifiable';

export type ElevatorId = Branded<string, 'ElevatorId'>;

export type ElevatorInstance = {
  id: ElevatorId;
  connectedFloors: number[]; // sorted array of contiguous floor depths
  gridX: number;
  gridY: number;
};

export type ElevatorValidationResult = {
  valid: boolean;
  error?: string;
};

export type ElevatorExtensionValidation = {
  valid: boolean;
  error?: string;
  targetDepth?: number;
};

export type ElevatorRemovalInfo = {
  canRemove: boolean;
  refundCrystals: number;
  refundFlux: number;
  traversingInhabitantNames: string[];
  reason?: string;
};
