import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cancelEvent,
  clearAllEvents,
  gameTimeToMinutes,
  getScheduledEvents,
  processScheduledEvents,
  scheduleEvent,
} from '@helpers/game-events';
import type { GameTime } from '@helpers/game-time';

afterEach(() => {
  clearAllEvents();
});

describe('gameTimeToMinutes', () => {
  it('should convert Day 1 00:00 to 0', () => {
    expect(gameTimeToMinutes({ day: 1, hour: 0, minute: 0 })).toBe(0);
  });

  it('should convert Day 1 01:30 to 90', () => {
    expect(gameTimeToMinutes({ day: 1, hour: 1, minute: 30 })).toBe(90);
  });

  it('should convert Day 2 00:00 to 1440', () => {
    expect(gameTimeToMinutes({ day: 2, hour: 0, minute: 0 })).toBe(1440);
  });

  it('should convert Day 3 12:30 to 3630', () => {
    expect(gameTimeToMinutes({ day: 3, hour: 12, minute: 30 })).toBe(
      2 * 1440 + 12 * 60 + 30,
    );
  });
});

describe('scheduleEvent', () => {
  it('should register an event and return an id', () => {
    const id = scheduleEvent({ day: 1, hour: 1, minute: 0 }, () => {});
    expect(id).toMatch(/^evt-/);
    expect(getScheduledEvents()).toHaveLength(1);
  });

  it('should register multiple events', () => {
    scheduleEvent({ day: 1, hour: 1, minute: 0 }, () => {});
    scheduleEvent({ day: 1, hour: 2, minute: 0 }, () => {});
    expect(getScheduledEvents()).toHaveLength(2);
  });
});

describe('cancelEvent', () => {
  it('should remove a scheduled event', () => {
    const id = scheduleEvent({ day: 1, hour: 1, minute: 0 }, () => {});
    expect(cancelEvent(id)).toBe(true);
    expect(getScheduledEvents()).toHaveLength(0);
  });

  it('should return false for non-existent event', () => {
    expect(cancelEvent('evt-nonexistent')).toBe(false);
  });
});

describe('processScheduledEvents', () => {
  it('should fire event when current time reaches trigger time', () => {
    const callback = vi.fn();
    scheduleEvent({ day: 1, hour: 1, minute: 0 }, callback);

    processScheduledEvents({ day: 1, hour: 1, minute: 0 });
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should fire event when current time passes trigger time', () => {
    const callback = vi.fn();
    scheduleEvent({ day: 1, hour: 1, minute: 0 }, callback);

    processScheduledEvents({ day: 1, hour: 2, minute: 0 });
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should not fire event before trigger time', () => {
    const callback = vi.fn();
    scheduleEvent({ day: 1, hour: 2, minute: 0 }, callback);

    processScheduledEvents({ day: 1, hour: 1, minute: 0 });
    expect(callback).not.toHaveBeenCalled();
    expect(getScheduledEvents()).toHaveLength(1);
  });

  it('should remove one-shot event after firing', () => {
    const callback = vi.fn();
    scheduleEvent({ day: 1, hour: 1, minute: 0 }, callback);

    processScheduledEvents({ day: 1, hour: 1, minute: 0 });
    expect(getScheduledEvents()).toHaveLength(0);

    processScheduledEvents({ day: 1, hour: 2, minute: 0 });
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should fire multiple events at the same time', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    scheduleEvent({ day: 1, hour: 1, minute: 0 }, cb1);
    scheduleEvent({ day: 1, hour: 1, minute: 0 }, cb2);

    processScheduledEvents({ day: 1, hour: 1, minute: 0 });
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('should support recurring events by re-registering in callback', () => {
    let callCount = 0;
    const scheduleNext = (time: GameTime) => {
      scheduleEvent(time, () => {
        callCount++;
        scheduleNext({ day: time.day, hour: time.hour + 1, minute: 0 });
      });
    };

    scheduleNext({ day: 1, hour: 1, minute: 0 });

    processScheduledEvents({ day: 1, hour: 1, minute: 0 });
    expect(callCount).toBe(1);
    expect(getScheduledEvents()).toHaveLength(1);

    processScheduledEvents({ day: 1, hour: 2, minute: 0 });
    expect(callCount).toBe(2);
    expect(getScheduledEvents()).toHaveLength(1);
  });

  it('should not fire events when paused (gameloop handles this)', () => {
    const callback = vi.fn();
    scheduleEvent({ day: 1, hour: 1, minute: 0 }, callback);

    // Events remain scheduled if processScheduledEvents is not called
    // (the gameloop returns early when paused, so this function is never invoked)
    expect(getScheduledEvents()).toHaveLength(1);
    expect(callback).not.toHaveBeenCalled();
  });
});
