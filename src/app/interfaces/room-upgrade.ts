import type { RoomUpgradeContent } from '@interfaces/content-roomupgrade';

export type UpgradeValidation = {
  valid: boolean;
  reason?: string;
};

export type VisibleUpgrade = {
  path: RoomUpgradeContent;
  locked: boolean;
  lockReason?: string;
};
