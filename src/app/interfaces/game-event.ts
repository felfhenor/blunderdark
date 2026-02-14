import type { GameTime } from '@interfaces/game-time';
import type { Branded } from '@interfaces/identifiable';

export type GameEventId = Branded<string, 'GameEventId'>;

export type ScheduledEvent = {
  id: GameEventId;
  triggerTime: GameTime;
  callback: () => void;
};
