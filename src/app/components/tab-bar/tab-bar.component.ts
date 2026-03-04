import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';

export type TabDefinition = {
  id: string;
  label: string;
  count?: number;
  hidden?: boolean;
};

@Component({
  selector: 'app-tab-bar',
  imports: [SFXDirective],
  template: `
    <div role="tablist" class="tabs"
      [class.tabs-bordered]="variant() === 'bordered'"
      [class.tabs-boxed]="variant() === 'boxed'"
      [class.tabs-xs]="size() === 'xs'">
      @for (tab of tabs(); track tab.id; let i = $index) {
        @if (!tab.hidden) {
          <button role="tab" class="tab"
            appSfx="ui-click"
            [sfxOffset]="i"
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
