import { computed, Directive } from '@angular/core';
import { setupIs } from '@helpers';
import { hostBinding } from 'ngxtension/host-binding';

@Directive({
  selector: '[appRequireNotSetup]',
})
export class RequireNotSetupDirective {
  public hidden = hostBinding(
    'class.hidden',
    computed(() => setupIs()),
  );
}
