import type { GameTime } from '@helpers/game-time';

export type ScheduledEvent = {
  id: string;
  triggerTime: GameTime;
  callback: () => void;
};

let nextEventId = 1;
let scheduledEvents: ScheduledEvent[] = [];

export function gameTimeToMinutes(time: GameTime): number {
  return (time.day - 1) * 24 * 60 + time.hour * 60 + time.minute;
}

export function scheduleEvent(
  triggerTime: GameTime,
  callback: () => void,
): string {
  const id = `evt-${nextEventId++}`;
  scheduledEvents.push({ id, triggerTime, callback });
  return id;
}

export function cancelEvent(id: string): boolean {
  const before = scheduledEvents.length;
  scheduledEvents = scheduledEvents.filter((e) => e.id !== id);
  return scheduledEvents.length < before;
}

export function getScheduledEvents(): ReadonlyArray<ScheduledEvent> {
  return scheduledEvents;
}

export function processScheduledEvents(currentTime: GameTime): void {
  const currentMinutes = gameTimeToMinutes(currentTime);
  const toFire: ScheduledEvent[] = [];
  const remaining: ScheduledEvent[] = [];

  for (const event of scheduledEvents) {
    if (gameTimeToMinutes(event.triggerTime) <= currentMinutes) {
      toFire.push(event);
    } else {
      remaining.push(event);
    }
  }

  scheduledEvents = remaining;

  for (const event of toFire) {
    event.callback();
  }
}

export function clearAllEvents(): void {
  scheduledEvents = [];
  nextEventId = 1;
}
