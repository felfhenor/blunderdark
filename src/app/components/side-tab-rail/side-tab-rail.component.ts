import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@components/icon/icon.component';

import { roomPlacementPreviewShape } from '@helpers/room-placement';
import { uiIsAnyModalOpen } from '@helpers/ui';
import type { SideTabDefinition } from '@interfaces';

@Component({
  selector: 'app-side-tab-rail',
  imports: [NgTemplateOutlet, IconComponent],
  templateUrl: './side-tab-rail.component.html',
  styleUrl: './side-tab-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'absolute left-0 top-0 z-30 flex items-start',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class SideTabRailComponent {
  private el = inject(ElementRef);

  public tabs = input.required<SideTabDefinition[]>();
  public position = input<'top' | 'bottom'>('top');
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

  public onDocumentClick(event: MouseEvent): void {
    if (this.activePanel() && !this.el.nativeElement.contains(event.target)) {
      this.activePanel.set(undefined);
    }
  }

  public onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Skip panel hotkeys during room placement so R can rotate
    if (roomPlacementPreviewShape()) return;

    const key = event.key.toLowerCase();
    const tab = this.visibleTabs().find((t) => t.hotkey === key);
    if (tab) {
      // Don't open a modal if one is already open
      if (tab.isModal && uiIsAnyModalOpen()) return;

      event.preventDefault();
      this.onTabClick(tab);
    }
  }

  public onTabClick(tab: SideTabDefinition): void {
    if (tab.action) {
      tab.action();
      return;
    }

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
