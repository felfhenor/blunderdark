import { computed, Directive, input } from '@angular/core';
import { hostBinding } from 'ngxtension/host-binding';
import { optionsGet } from '@helpers';
import type { GameOption } from '@interfaces';

@Directive({
  selector: '[appShowIfOption]',
})
export class ShowIfOptionDirective {
  public appShowIfOption = input.required<GameOption>();

  public hidden = hostBinding(
    'class.hidden',
    computed(() => !optionsGet(this.appShowIfOption())),
  );
}
