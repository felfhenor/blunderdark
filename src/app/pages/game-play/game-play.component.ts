import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterModule } from '@angular/router';

import { GridComponent } from '@components/grid/grid.component';
import { MoraleBarComponent } from '@components/morale-bar/morale-bar.component';
import { PanelAltarComponent } from '@components/panel-altar/panel-altar.component';
import { PanelFloorSelectorComponent } from '@components/panel-floor-selector/panel-floor-selector.component';
import { PanelReputationComponent } from '@components/panel-reputation/panel-reputation.component';
import { PanelResourcesComponent } from '@components/panel-resources/panel-resources.component';
import { PanelRosterComponent } from '@components/panel-roster/panel-roster.component';
import { PanelHallwayInfoComponent } from '@components/panel-hallway-info/panel-hallway-info.component';
import { PanelRoomInfoComponent } from '@components/panel-room-info/panel-room-info.component';
import { PanelRoomSelectComponent } from '@components/panel-room-select/panel-room-select.component';
import { PanelThroneRoomComponent } from '@components/panel-throne-room/panel-throne-room.component';
import { PanelTrainingGroundsComponent } from '@components/panel-training-grounds/panel-training-grounds.component';
import { PanelResearchSummaryComponent } from '@components/panel-research-summary/panel-research-summary.component';
import { SynergyTooltipComponent } from '@components/synergy-tooltip/synergy-tooltip.component';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { TeleportOutletDirective } from '@directives/teleport.outlet.directive';
import { optionsGet } from '@helpers';

@Component({
  selector: 'app-game-play',
  imports: [
    RouterModule,
    TeleportOutletDirective,
    GridComponent,
    MoraleBarComponent,
    PanelAltarComponent,
    PanelFloorSelectorComponent,
    PanelHallwayInfoComponent,
    PanelReputationComponent,
    PanelResourcesComponent,
    PanelRoomInfoComponent,
    PanelRoomSelectComponent,
    PanelRosterComponent,
    PanelThroneRoomComponent,
    PanelTrainingGroundsComponent,
    PanelResearchSummaryComponent,
    SynergyTooltipComponent,
  ],
  templateUrl: './game-play.component.html',
  styleUrl: './game-play.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePlayComponent extends OptionsBaseComponent {
  public isPaused = computed(() => optionsGet('gameloopPaused'));
}
