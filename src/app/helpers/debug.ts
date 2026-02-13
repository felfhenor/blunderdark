import { optionsSet } from '@helpers/state-options';

export function debugToggle() {
  optionsSet('showDebug', true);
}
