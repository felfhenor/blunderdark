import type { GameTime } from '@interfaces/game-time';

export type ScheduledEvent = {
  id: string;
  triggerTime: GameTime;
  callback: () => void;
};
