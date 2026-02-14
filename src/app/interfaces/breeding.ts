export type MutationOutcome = 'positive' | 'neutral' | 'negative';

export type BreedingCompletedEvent = {
  roomId: string;
  hybridName: string;
};

export type MutationCompletedEvent = {
  roomId: string;
  inhabitantName: string;
  outcome: MutationOutcome;
};
