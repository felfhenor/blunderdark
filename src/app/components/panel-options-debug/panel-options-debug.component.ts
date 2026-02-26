import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { AnalyticsClickDirective } from '@directives/analytics-click.directive';
import {
  merchantDebugForceArrival,
  merchantDebugRestock,
  merchantIsPresent,
} from '@helpers/merchant';

@Component({
  selector: 'app-panel-options-debug',
  imports: [AnalyticsClickDirective],
  templateUrl: './panel-options-debug.component.html',
  styleUrl: './panel-options-debug.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelOptionsDebugComponent extends OptionsBaseComponent {
  public isMerchantPresent = merchantIsPresent;

  public forceArrival(): void {
    merchantDebugForceArrival();
  }

  public restock(): void {
    merchantDebugRestock();
  }
}
