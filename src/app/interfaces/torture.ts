import type { InvaderClassType } from '@interfaces/invader';
import type { PlacedRoomId } from '@interfaces/room-shape';
import type { TraitRuneId } from '@interfaces/content-traitrune';

export type TortureStage = 'interrogate' | 'extract' | 'break';

export type TortureExtractAction = 'research' | 'rune';

export type TortureBreakAction = 'convert' | 'execute' | 'sacrifice';

export type TortureStageAction = TortureExtractAction | TortureBreakAction;

export type TortureInterrogateCompleteEvent = {
  roomId: PlacedRoomId;
  prisonerName: string;
  attackBonusPercent: number;
  defenseBonusPercent: number;
};

export type TortureExtractCompleteEvent = {
  roomId: PlacedRoomId;
  prisonerName: string;
  action: TortureExtractAction;
  researchGained?: number;
  runeTypeId?: TraitRuneId;
};

export type TortureBreakCompleteEvent = {
  roomId: PlacedRoomId;
  prisonerName: string;
  action: TortureBreakAction;
  success?: boolean;
  inhabitantName?: string;
  fearGained?: number;
  resourceGained?: { type: string; amount: number };
};

export type InterrogationBuff = {
  attackBonusPercent: number;
  defenseBonusPercent: number;
  sourceInvaderClass: InvaderClassType;
};
