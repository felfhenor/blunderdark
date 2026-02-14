export type SummoningCompletedEvent = {
  roomId: string;
  inhabitantName: string;
  summonType: 'permanent' | 'temporary';
};

export type SummoningExpiredEvent = {
  inhabitantName: string;
};
