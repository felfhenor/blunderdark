import { computed, Directive } from '@angular/core';
import { discordIsInElectron } from '@helpers';
import { hostBinding } from 'ngxtension/host-binding';

@Directive({
  selector: '[appDisableOutsideElectron]',
})
export class DisableOutsideElectronDirective {
  public disabled = hostBinding(
    'class.disabled',
    computed(() => !discordIsInElectron()),
  );

  public disabledAttr = hostBinding(
    'attr.disabled',
    computed(() => !discordIsInElectron()),
  );
}
