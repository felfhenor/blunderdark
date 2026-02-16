import type { Signal } from '@angular/core';
import { environment } from '@environments/environment';
import { signalLocalStorage } from '@helpers/signal';
import type { GameOptions } from '@interfaces';

export function optionsDefault(): GameOptions {
  return {
    showDebug: !environment.production,
    debugConsoleLogStateUpdates: false,
    debugGameloopTimerUpdates: false,
    debugAllowBackgroundOperations: false,
    debugTickMultiplier: 1,
    debugSaveInterval: 15,

    uiTheme: 'dark',

    sfxPlay: true,
    sfxVolume: 0.3,

    bgmPlay: true,
    bgmVolume: 0.1,

    gameloopPaused: false,
    gameSpeed: 1,
    optionsTab: 'UI',

    autosaveEnabled: true,
    autosaveIntervalMinutes: 5,
  };
}

const _options = signalLocalStorage<GameOptions>('options', optionsDefault());
export const options: Signal<GameOptions> = _options.asReadonly();

export function optionsSetAll(options: GameOptions) {
  _options.set(options);
}

export function optionsSet<T extends keyof GameOptions>(
  option: T,
  value: GameOptions[T],
): void {
  _options.update((state) => ({
    ...state,
    [option]: value,
  }));
}

export function optionsGet<T extends keyof GameOptions>(
  option: T,
): GameOptions[T] {
  return options()[option];
}
