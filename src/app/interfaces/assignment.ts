import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { InhabitantInstance } from '@interfaces/inhabitant';

export type AssignmentValidation = {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxCapacity: number;
};

export type AssignedInhabitantEntry = {
  instance: InhabitantInstance;
  def: InhabitantContent;
};
