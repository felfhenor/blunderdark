import { optionsGet, optionsSet } from '@helpers';
import type { GameOptions } from '@interfaces';

export class OptionsBaseComponent {
  public optionsGet<T extends keyof GameOptions>(option: T) {
    return optionsGet(option);
  }

  public optionsSet<T extends keyof GameOptions>(
    option: T,
    value: GameOptions[T],
  ) {
    optionsSet(option, value);
  }
}
