import type { RoomUpgradePath } from '@interfaces/room';

export type UpgradeValidation = {
  valid: boolean;
  reason?: string;
};

export type VisibleUpgrade = {
  path: RoomUpgradePath;
  locked: boolean;
  lockReason?: string;
};
