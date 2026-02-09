import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterModule } from '@angular/router';

import { GridComponent } from '@components/grid/grid.component';
import { PanelFloorSelectorComponent } from '@components/panel-floor-selector/panel-floor-selector.component';
import { PanelReputationComponent } from '@components/panel-reputation/panel-reputation.component';
import { PanelRoomSelectComponent } from '@components/panel-room-select/panel-room-select.component';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { TeleportOutletDirective } from '@directives/teleport.outlet.directive';
import { getOption } from '@helpers';

@Component({
  selector: 'app-game-play',
  imports: [
    RouterModule,
    TeleportOutletDirective,
    GridComponent,
    PanelFloorSelectorComponent,
    PanelReputationComponent,
    PanelRoomSelectComponent,
  ],
  templateUrl: './game-play.component.html',
  styleUrl: './game-play.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePlayComponent extends OptionsBaseComponent {
  public isPaused = computed(() => getOption('gameloopPaused'));
}
