import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  gameEventCancel,
  gameEventClearAll,
  gameEventTimeToMinutes,
  gameEventGetScheduled,
  gameEventProcess,
  gameEventSchedule,
} from '@helpers/game-events';
import type { GameTime } from '@helpers/game-time';

afterEach(() => {
  gameEventClearAll();
});

describe('gameEventTimeToMinutes', () => {
  it('should convert Day 1 00:00 to 0', () => {
    expect(gameEventTimeToMinutes({ day: 1, hour: 0, minute: 0 })).toBe(0);
  });

  it('should convert Day 1 01:30 to 90', () => {
    expect(gameEventTimeToMinutes({ day: 1, hour: 1, minute: 30 })).toBe(90);
  });

  it('should convert Day 2 00:00 to 1440', () => {
    expect(gameEventTimeToMinutes({ day: 2, hour: 0, minute: 0 })).toBe(1440);
  });

  it('should convert Day 3 12:30 to 3630', () => {
    expect(gameEventTimeToMinutes({ day: 3, hour: 12, minute: 30 })).toBe(
      2 * 1440 + 12 * 60 + 30,
    );
  });
});

describe('gameEventSchedule', () => {
  it('should register an event and return an id', () => {
    const id = gameEventSchedule({ day: 1, hour: 1, minute: 0 }, () => {});
    expect(id).toMatch(/^evt-/);
    expect(gameEventGetScheduled()).toHaveLength(1);
  });

  it('should register multiple events', () => {
    gameEventSchedule({ day: 1, hour: 1, minute: 0 }, () => {});
    gameEventSchedule({ day: 1, hour: 2, minute: 0 }, () => {});
    expect(gameEventGetScheduled()).toHaveLength(2);
  });
});

describe('gameEventCancel', () => {
  it('should remove a scheduled event', () => {
    const id = gameEventSchedule({ day: 1, hour: 1, minute: 0 }, () => {});
    expect(gameEventCancel(id)).toBe(true);
    expect(gameEventGetScheduled()).toHaveLength(0);
  });

  it('should return false for non-existent event', () => {
    expect(gameEventCancel('evt-nonexistent')).toBe(false);
  });
});

describe('gameEventProcess', () => {
  it('should fire event when current time reaches trigger time', () => {
    const callback = vi.fn();
    gameEventSchedule({ day: 1, hour: 1, minute: 0 }, callback);

    gameEventProcess({ day: 1, hour: 1, minute: 0 });
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should fire event when current time passes trigger time', () => {
    const callback = vi.fn();
    gameEventSchedule({ day: 1, hour: 1, minute: 0 }, callback);

    gameEventProcess({ day: 1, hour: 2, minute: 0 });
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should not fire event before trigger time', () => {
    const callback = vi.fn();
    gameEventSchedule({ day: 1, hour: 2, minute: 0 }, callback);

    gameEventProcess({ day: 1, hour: 1, minute: 0 });
    expect(callback).not.toHaveBeenCalled();
    expect(gameEventGetScheduled()).toHaveLength(1);
  });

  it('should remove one-shot event after firing', () => {
    const callback = vi.fn();
    gameEventSchedule({ day: 1, hour: 1, minute: 0 }, callback);

    gameEventProcess({ day: 1, hour: 1, minute: 0 });
    expect(gameEventGetScheduled()).toHaveLength(0);

    gameEventProcess({ day: 1, hour: 2, minute: 0 });
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should fire multiple events at the same time', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    gameEventSchedule({ day: 1, hour: 1, minute: 0 }, cb1);
    gameEventSchedule({ day: 1, hour: 1, minute: 0 }, cb2);

    gameEventProcess({ day: 1, hour: 1, minute: 0 });
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('should support recurring events by re-registering in callback', () => {
    let callCount = 0;
    const scheduleNext = (time: GameTime) => {
      gameEventSchedule(time, () => {
        callCount++;
        scheduleNext({ day: time.day, hour: time.hour + 1, minute: 0 });
      });
    };

    scheduleNext({ day: 1, hour: 1, minute: 0 });

    gameEventProcess({ day: 1, hour: 1, minute: 0 });
    expect(callCount).toBe(1);
    expect(gameEventGetScheduled()).toHaveLength(1);

    gameEventProcess({ day: 1, hour: 2, minute: 0 });
    expect(callCount).toBe(2);
    expect(gameEventGetScheduled()).toHaveLength(1);
  });

  it('should not fire events when paused (gameloop handles this)', () => {
    const callback = vi.fn();
    gameEventSchedule({ day: 1, hour: 1, minute: 0 }, callback);

    // Events remain scheduled if gameEventProcess is not called
    // (the gameloop returns early when paused, so this function is never invoked)
    expect(gameEventGetScheduled()).toHaveLength(1);
    expect(callback).not.toHaveBeenCalled();
  });
});
