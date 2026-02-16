import type { SeasonalEventId } from '@interfaces/content-seasonalevent';
import type { ResourceType } from '@interfaces/resource';

export type ActiveSeasonalEffect = {
  eventId: SeasonalEventId;
  resourceType: ResourceType;
  multiplier: number;
  remainingDays: number;
  description: string;
};

export type PendingSeasonalEvent = {
  eventId: SeasonalEventId;
  triggeredOnDay: number;
};

export type SeasonalEventState = {
  triggeredEventIds: SeasonalEventId[];
  activeEffects: ActiveSeasonalEffect[];
  pendingEvent?: PendingSeasonalEvent;
  lastSeasonCycleForReset: number;
};
