import { Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hostBinding } from 'ngxtension/host-binding';
import { ICON_ALL } from '@helpers';
import type { Icon } from '@interfaces';

@Component({
  selector: 'app-icon',
  imports: [NgIcon],
  providers: [provideIcons(ICON_ALL)],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  public name = input.required<Icon>();
  public size = input<string>('1em');
  public color = input<string>('');

  public icon = computed(() => {
    return ICON_ALL[this.name()];
  });

  maxHeight = hostBinding(
    'style.height',
    computed(() => this.size()),
  );
}
