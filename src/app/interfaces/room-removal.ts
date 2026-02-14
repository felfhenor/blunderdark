export type RemovalRefund = Record<string, number>;

export type RemovalInfo = {
  roomName: string;
  refund: RemovalRefund;
  displacedInhabitantNames: string[];
  canRemove: boolean;
  error?: string;
};
