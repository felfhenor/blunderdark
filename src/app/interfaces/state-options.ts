import type { Signal } from '@angular/core';

export type GameOption =
  | 'showDebug'
  | 'debugConsoleLogStateUpdates'
  | 'debugGameloopTimerUpdates'
  | 'debugAllowBackgroundOperations'
  | 'sfxPlay'
  | 'bgmPlay'
  | 'gameloopPaused'
  | 'autosaveEnabled';

export type NotificationCategory = 'Error' | 'Success' | 'Warning' | 'Invasion' | 'Corruption' | 'Breeding' | 'Summoning' | 'Forging' | 'Alchemy' | 'Torture' | 'Merchant' | 'SeasonalEvent';

export type OptionsTab = 'UI' | 'Savefile' | 'Debug';

export interface OptionsTabLink {
  name: 'UI' | 'Savefile' | 'Debug';
  link: OptionsTab;
  showIf: Signal<boolean>;
}

export type GameSpeed = 1 | 2 | 4;

export type AutosaveInterval = 1 | 3 | 5 | 10;

export type GameOptions = Record<GameOption, boolean> & {
  uiTheme: string;
  sfxVolume: number;
  bgmVolume: number;
  gameSpeed: GameSpeed;
  debugTickMultiplier: number;
  debugSaveInterval: number;
  optionsTab: OptionsTab;
  autosaveIntervalMinutes: AutosaveInterval;
};
