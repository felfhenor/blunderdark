import type { Signal, TemplateRef } from '@angular/core';
import type { Icon } from '@interfaces/artable';

export type SideTabDefinition = {
  id: string;
  label: string;
  icon?: Icon;
  condition?: Signal<boolean>;
  isModal: boolean;
  templateRef?: TemplateRef<unknown>;
};
