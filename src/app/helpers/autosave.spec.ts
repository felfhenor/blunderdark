import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks ---

vi.mock('@helpers/state-game', () => ({
  gamestateSave: vi.fn(),
}));

vi.mock('@helpers/state-options', () => ({
  optionsGet: vi.fn(),
}));

vi.mock('@helpers/logging', () => ({
  debug: vi.fn(),
}));

// --- Imports after mocks ---

import {
  AUTOSAVE_MIN_DISPLAY_MS,
  autosavePerform,
  autosaveStart,
  autosaveStop,
  autosaveReset,
  autosaveCheckPreInvasion,
  autosaveResetPreInvasionState,
  autosaveInstallBeforeUnload,
  autosaveRemoveBeforeUnload,
  autosaveIsSaving,
  autosaveEvent$,
} from '@helpers/autosave';
import { gamestateSave } from '@helpers/state-game';
import { optionsGet } from '@helpers/state-options';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  autosaveStop();
  autosaveResetPreInvasionState();
  autosaveIsSaving.set(false);

  // Default: autosave enabled, 5 min interval
  vi.mocked(optionsGet).mockImplementation(((key: string) => {
    if (key === 'autosaveEnabled') return true;
    if (key === 'autosaveIntervalMinutes') return 5;
    return undefined;
  }) as typeof optionsGet);
});

afterEach(() => {
  autosaveStop();
  vi.useRealTimers();
});

// --- autosavePerform ---

describe('autosavePerform', () => {
  it('should call gamestateSave and return true', () => {
    const result = autosavePerform();

    expect(gamestateSave).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it('should set isSaving to true then false after delay', () => {
    autosavePerform();

    expect(autosaveIsSaving()).toBe(true);

    vi.advanceTimersByTime(AUTOSAVE_MIN_DISPLAY_MS);

    expect(autosaveIsSaving()).toBe(false);
  });

  it('should return false when autosave is disabled', () => {
    vi.mocked(optionsGet).mockImplementation(((key: string) => {
      if (key === 'autosaveEnabled') return false;
      return undefined;
    }) as typeof optionsGet);

    const result = autosavePerform();

    expect(result).toBe(false);
    expect(gamestateSave).not.toHaveBeenCalled();
  });

  it('should return false and emit error event when save throws', () => {
    vi.mocked(gamestateSave).mockImplementationOnce(() => {
      throw new Error('Storage full');
    });

    const nextSpy = vi.spyOn(autosaveEvent$, 'next');

    const result = autosavePerform();

    expect(result).toBe(false);
    expect(autosaveIsSaving()).toBe(false);
    expect(nextSpy).toHaveBeenCalledOnce();
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('Storage full'),
      }),
    );

    nextSpy.mockRestore();
  });

  it('should emit success event on successful save', () => {
    const nextSpy = vi.spyOn(autosaveEvent$, 'next');

    autosavePerform();

    expect(nextSpy).toHaveBeenCalledOnce();
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );

    nextSpy.mockRestore();
  });
});

// --- autosaveStart / autosaveStop ---

describe('autosaveStart', () => {
  it('should trigger autosave after the configured interval', () => {
    autosaveStart();

    expect(gamestateSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(gamestateSave).toHaveBeenCalledOnce();
  });

  it('should trigger multiple autosaves at each interval', () => {
    autosaveStart();

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(gamestateSave).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(gamestateSave).toHaveBeenCalledTimes(2);
  });

  it('should not start if autosave is disabled', () => {
    vi.mocked(optionsGet).mockImplementation(((key: string) => {
      if (key === 'autosaveEnabled') return false;
      return undefined;
    }) as typeof optionsGet);

    autosaveStart();

    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(gamestateSave).not.toHaveBeenCalled();
  });

  it('should use configured interval', () => {
    vi.mocked(optionsGet).mockImplementation(((key: string) => {
      if (key === 'autosaveEnabled') return true;
      if (key === 'autosaveIntervalMinutes') return 1;
      return undefined;
    }) as typeof optionsGet);

    autosaveStart();

    vi.advanceTimersByTime(1 * 60 * 1000);

    expect(gamestateSave).toHaveBeenCalledOnce();
  });
});

describe('autosaveStop', () => {
  it('should stop the autosave timer', () => {
    autosaveStart();

    autosaveStop();

    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(gamestateSave).not.toHaveBeenCalled();
  });

  it('should be safe to call when no timer is running', () => {
    expect(() => autosaveStop()).not.toThrow();
  });
});

describe('autosaveReset', () => {
  it('should restart the timer', () => {
    autosaveStart();

    // Advance 3 minutes
    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(gamestateSave).not.toHaveBeenCalled();

    // Reset restarts the 5-minute timer
    autosaveReset();

    // Advance another 3 minutes (6 total from original, 3 from reset)
    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(gamestateSave).not.toHaveBeenCalled();

    // Advance 2 more minutes (5 from reset)
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(gamestateSave).toHaveBeenCalledOnce();
  });
});

// --- autosaveCheckPreInvasion ---

describe('autosaveCheckPreInvasion', () => {
  it('should trigger autosave when warning transitions from false to true', () => {
    autosaveCheckPreInvasion(false);
    expect(gamestateSave).not.toHaveBeenCalled();

    autosaveCheckPreInvasion(true);
    expect(gamestateSave).toHaveBeenCalledOnce();
  });

  it('should not trigger again while warning remains active', () => {
    autosaveCheckPreInvasion(true);
    expect(gamestateSave).toHaveBeenCalledOnce();

    autosaveCheckPreInvasion(true);
    expect(gamestateSave).toHaveBeenCalledOnce();
  });

  it('should trigger again after warning deactivates and reactivates', () => {
    autosaveCheckPreInvasion(true);
    expect(gamestateSave).toHaveBeenCalledOnce();

    autosaveCheckPreInvasion(false);
    autosaveCheckPreInvasion(true);
    expect(gamestateSave).toHaveBeenCalledTimes(2);
  });

  it('should not trigger when warning transitions from true to false', () => {
    // Set initial state to warning active
    autosaveCheckPreInvasion(true);
    vi.mocked(gamestateSave).mockClear();

    autosaveCheckPreInvasion(false);
    expect(gamestateSave).not.toHaveBeenCalled();
  });
});

// --- beforeunload ---

describe('autosaveInstallBeforeUnload', () => {
  it('should add beforeunload event listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    autosaveInstallBeforeUnload();

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    addSpy.mockRestore();
  });
});

describe('autosaveRemoveBeforeUnload', () => {
  it('should remove beforeunload event listener', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    autosaveRemoveBeforeUnload();

    expect(removeSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );

    removeSpy.mockRestore();
  });
});

// --- beforeunload handler ---

describe('beforeunload handler', () => {
  it('should call gamestateSave when event fires', () => {
    autosaveInstallBeforeUnload();

    window.dispatchEvent(new Event('beforeunload'));

    expect(gamestateSave).toHaveBeenCalledOnce();

    autosaveRemoveBeforeUnload();
  });

  it('should not save when autosave is disabled', () => {
    vi.mocked(optionsGet).mockImplementation(((key: string) => {
      if (key === 'autosaveEnabled') return false;
      return undefined;
    }) as typeof optionsGet);

    autosaveInstallBeforeUnload();

    window.dispatchEvent(new Event('beforeunload'));

    expect(gamestateSave).not.toHaveBeenCalled();

    autosaveRemoveBeforeUnload();
  });

  it('should not crash if save throws during beforeunload', () => {
    vi.mocked(gamestateSave).mockImplementationOnce(() => {
      throw new Error('Storage full');
    });

    autosaveInstallBeforeUnload();

    expect(() => {
      window.dispatchEvent(new Event('beforeunload'));
    }).not.toThrow();

    autosaveRemoveBeforeUnload();
  });
});
