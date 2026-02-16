import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debug } from '@helpers/logging';
import { gamestateSave } from '@helpers/state-game';
import { optionsGet } from '@helpers/state-options';

// --- Constants ---

export const AUTOSAVE_MIN_DISPLAY_MS = 1000;

// --- Events ---

export const autosaveEvent$ = new Subject<{
  type: 'success' | 'error';
  message?: string;
}>();

// --- State ---

export const autosaveIsSaving = signal(false);

let _autosaveTimerId: ReturnType<typeof setInterval> | undefined;
let _autosavePrevWarningActive = false;

// --- Core save function ---

export function autosavePerform(): boolean {
  if (!optionsGet('autosaveEnabled')) return false;

  try {
    autosaveIsSaving.set(true);
    gamestateSave();
    debug('Autosave', 'Autosave completed');

    // Keep indicator visible for minimum display time
    setTimeout(() => autosaveIsSaving.set(false), AUTOSAVE_MIN_DISPLAY_MS);

    autosaveEvent$.next({ type: 'success' });
    return true;
  } catch (e) {
    autosaveIsSaving.set(false);
    const message =
      e instanceof Error ? e.message : 'Unknown autosave error';
    autosaveEvent$.next({
      type: 'error',
      message: `Autosave failed: ${message}. Please save manually.`,
    });
    return false;
  }
}

// --- Timer ---

export function autosaveStart(): void {
  autosaveStop();
  if (!optionsGet('autosaveEnabled')) return;

  const intervalMs = optionsGet('autosaveIntervalMinutes') * 60 * 1000;
  _autosaveTimerId = setInterval(() => {
    autosavePerform();
  }, intervalMs);

  debug('Autosave', `Timer started (${optionsGet('autosaveIntervalMinutes')}min)`);
}

export function autosaveStop(): void {
  if (_autosaveTimerId !== undefined) {
    clearInterval(_autosaveTimerId);
    _autosaveTimerId = undefined;
  }
}

export function autosaveReset(): void {
  autosaveStart();
}

// --- Pre-invasion ---

export function autosaveCheckPreInvasion(warningActive: boolean): void {
  if (warningActive && !_autosavePrevWarningActive) {
    debug('Autosave', 'Pre-invasion autosave triggered');
    autosavePerform();
    // Reset the periodic timer since we just saved
    autosaveStart();
  }
  _autosavePrevWarningActive = warningActive;
}

export function autosaveResetPreInvasionState(): void {
  _autosavePrevWarningActive = false;
}

// --- Quit save ---

function onBeforeUnload(): void {
  if (!optionsGet('autosaveEnabled')) return;
  try {
    gamestateSave();
  } catch {
    // Swallow - browser is closing
  }
}

export function autosaveInstallBeforeUnload(): void {
  window.addEventListener('beforeunload', onBeforeUnload);
}

export function autosaveRemoveBeforeUnload(): void {
  window.removeEventListener('beforeunload', onBeforeUnload);
}
