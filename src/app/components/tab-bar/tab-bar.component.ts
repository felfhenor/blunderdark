import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export type TabDefinition = {
  id: string;
  label: string;
  count?: number;
  hidden?: boolean;
};

@Component({
  selector: 'app-tab-bar',
  template: `
    <div role="tablist" class="tabs"
      [class.tabs-bordered]="variant() === 'bordered'"
      [class.tabs-boxed]="variant() === 'boxed'"
      [class.tabs-xs]="size() === 'xs'">
      @for (tab of tabs(); track tab.id) {
        @if (!tab.hidden) {
          <button role="tab" class="tab"
            [class.tab-active]="activeTab() === tab.id"
            (click)="activeTab.set(tab.id)">
            {{ tab.label }}@if (tab.count !== undefined) { ({{ tab.count }})}
          </button>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabBarComponent {
  tabs = input.required<TabDefinition[]>();
  activeTab = model.required<string>();
  variant = input<'bordered' | 'boxed'>('bordered');
  size = input<'xs' | 'sm' | 'md'>('md');
}
