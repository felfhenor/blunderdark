import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import type { SideTabDefinition } from '@interfaces';

@Component({
  selector: 'app-side-tab-rail',
  imports: [NgTemplateOutlet],
  templateUrl: './side-tab-rail.component.html',
  styleUrl: './side-tab-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideTabRailComponent {
  public tabs = input.required<SideTabDefinition[]>();
  public activePanel = model<string | undefined>(undefined);
  public modalTabClick = output<string>();

  public visibleTabs = computed(() =>
    this.tabs().filter((tab) => !tab.condition || tab.condition()),
  );

  public activePanelTemplate = computed(() => {
    const panelId = this.activePanel();
    if (!panelId) return undefined;
    const tab = this.tabs().find((t) => t.id === panelId);
    if (!tab || tab.isModal || !tab.templateRef) return undefined;
    return tab.templateRef;
  });

  constructor() {
    effect(() => {
      const panelId = this.activePanel();
      if (!panelId) return;
      const tab = this.tabs().find((t) => t.id === panelId);
      if (tab?.condition && !tab.condition()) {
        this.activePanel.set(undefined);
      }
    });
  }

  public onTabClick(tab: SideTabDefinition): void {
    if (tab.isModal) {
      this.modalTabClick.emit(tab.id);
      return;
    }

    if (this.activePanel() === tab.id) {
      this.activePanel.set(undefined);
    } else {
      this.activePanel.set(tab.id);
    }
  }
}
