import { computed, Directive } from '@angular/core';
import { discordIsInElectron } from '@helpers';
import { hostBinding } from 'ngxtension/host-binding';

@Directive({
  selector: '[appHideInElectron]',
})
export class HideInElectronDirective {
  public hidden = hostBinding(
    'class.hidden',
    computed(() => discordIsInElectron()),
  );
}
