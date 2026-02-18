import type { Signal, TemplateRef } from '@angular/core';

export type SideTabDefinition = {
  id: string;
  label: string;
  condition?: Signal<boolean>;
  isModal: boolean;
  templateRef?: TemplateRef<unknown>;
};
