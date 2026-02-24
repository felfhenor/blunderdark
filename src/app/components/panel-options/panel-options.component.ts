import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { ButtonCloseComponent } from '@components/button-close/button-close.component';
import { CardPageComponent } from '@components/card-page/card-page.component';
import { ConnectButtonsComponent } from '@components/connect-buttons/connect-buttons.component';
import { PanelOptionsDebugComponent } from '@components/panel-options-debug/panel-options-debug.component';
import { PanelOptionsSavefileComponent } from '@components/panel-options-savefile/panel-options-savefile.component';
import { PanelOptionsUIComponent } from '@components/panel-options-ui/panel-options-ui.component';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { TabBarComponent } from '@components/tab-bar/tab-bar.component';
import type { TabDefinition } from '@components/tab-bar/tab-bar.component';
import { options, uiShowOptionsMenu } from '@helpers';
import type { OptionsTab } from '@interfaces';

@Component({
  selector: 'app-panel-options',
  imports: [
    CardPageComponent,
    ConnectButtonsComponent,
    PanelOptionsDebugComponent,
    PanelOptionsSavefileComponent,
    PanelOptionsUIComponent,
    ButtonCloseComponent,
    TabBarComponent,
  ],
  templateUrl: './panel-options.component.html',
  styleUrl: './panel-options.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelOptionsComponent extends OptionsBaseComponent {
  public activeTab = computed(() => options()['optionsTab']);

  public tabDefs = computed<TabDefinition[]>(() => [
    { id: 'UI', label: 'UI' },
    { id: 'Savefile', label: 'Savefile' },
    { id: 'Debug', label: 'Debug', hidden: !options().showDebug },
  ]);

  public changeActiveTab(tab: string): void {
    this.optionsSet('optionsTab', tab as OptionsTab);
  }

  closeMenu() {
    uiShowOptionsMenu.set(false);
  }
}
