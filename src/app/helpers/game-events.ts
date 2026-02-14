import type { GameTime } from '@interfaces/game-time';
import type { GameEventId, ScheduledEvent } from '@interfaces/game-event';

let nextEventId = 1;
let scheduledEvents: ScheduledEvent[] = [];

export function gameEventTimeToMinutes(time: GameTime): number {
  return (time.day - 1) * 24 * 60 + time.hour * 60 + time.minute;
}

export function gameEventSchedule(
  triggerTime: GameTime,
  callback: () => void,
): string {
  const id = `evt-${nextEventId++}` as GameEventId;
  scheduledEvents.push({ id, triggerTime, callback });
  return id;
}

export function gameEventCancel(id: string): boolean {
  const before = scheduledEvents.length;
  scheduledEvents = scheduledEvents.filter((e) => e.id !== id);
  return scheduledEvents.length < before;
}

export function gameEventGetScheduled(): ReadonlyArray<ScheduledEvent> {
  return scheduledEvents;
}

export function gameEventProcess(currentTime: GameTime): void {
  const currentMinutes = gameEventTimeToMinutes(currentTime);
  const toFire: ScheduledEvent[] = [];
  const remaining: ScheduledEvent[] = [];

  for (const event of scheduledEvents) {
    if (gameEventTimeToMinutes(event.triggerTime) <= currentMinutes) {
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

export function gameEventClearAll(): void {
  scheduledEvents = [];
  nextEventId = 1;
}
