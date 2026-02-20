import type { Signal, TemplateRef } from '@angular/core';
import type { Icon } from '@interfaces/artable';

export type SideTabDefinition = {
  id: string;
  label: string;
  icon?: Icon;
  iconGlow?: Signal<boolean>;
  condition?: Signal<boolean>;
  isModal: boolean;
  templateRef?: TemplateRef<unknown>;
};
