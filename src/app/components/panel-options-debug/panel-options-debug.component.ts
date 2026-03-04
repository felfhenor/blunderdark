import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { AnalyticsClickDirective } from '@directives/analytics-click.directive';
import { SFXDirective } from '@directives/sfx.directive';
import {
  merchantDebugForceArrival,
  merchantDebugForceDeparture,
  merchantDebugRestock,
  merchantIsPresent,
} from '@helpers/merchant';
import { victoryDebugShowPanel, victoryIsAchieved } from '@helpers/victory';

@Component({
  selector: 'app-panel-options-debug',
  imports: [AnalyticsClickDirective, SFXDirective],
  templateUrl: './panel-options-debug.component.html',
  styleUrl: './panel-options-debug.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelOptionsDebugComponent extends OptionsBaseComponent {
  public isMerchantPresent = merchantIsPresent;
  public isVictoryAchieved = victoryIsAchieved;

  public forceArrival(): void {
    merchantDebugForceArrival();
  }

  public forceDeparture(): void {
    merchantDebugForceDeparture();
  }

  public restock(): void {
    merchantDebugRestock();
  }

  public showVictoryPanel(): void {
    victoryDebugShowPanel();
  }
}
