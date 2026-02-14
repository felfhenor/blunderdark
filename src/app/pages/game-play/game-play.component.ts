import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { GridComponent } from '@components/grid/grid.component';
import { MoraleBarComponent } from '@components/morale-bar/morale-bar.component';
import { PanelAltarComponent } from '@components/panel-altar/panel-altar.component';
import { PanelBreedingPitsComponent } from '@components/panel-breeding-pits/panel-breeding-pits.component';
import { PanelAlchemyLabComponent } from '@components/panel-alchemy-lab/panel-alchemy-lab.component';
import { PanelDarkForgeComponent } from '@components/panel-dark-forge/panel-dark-forge.component';
import { PanelFloorMinimapComponent } from '@components/panel-floor-minimap/panel-floor-minimap.component';
import { PanelFloorSelectorComponent } from '@components/panel-floor-selector/panel-floor-selector.component';
import { PanelReputationComponent } from '@components/panel-reputation/panel-reputation.component';
import { PanelResourcesComponent } from '@components/panel-resources/panel-resources.component';
import { PanelRosterComponent } from '@components/panel-roster/panel-roster.component';
import { PanelHallwayInfoComponent } from '@components/panel-hallway-info/panel-hallway-info.component';
import { PanelStairInfoComponent } from '@components/panel-stair-info/panel-stair-info.component';
import { PanelRoomInfoComponent } from '@components/panel-room-info/panel-room-info.component';
import { PanelRoomSelectComponent } from '@components/panel-room-select/panel-room-select.component';
import { PanelThroneRoomComponent } from '@components/panel-throne-room/panel-throne-room.component';
import { PanelTrainingGroundsComponent } from '@components/panel-training-grounds/panel-training-grounds.component';
import { PanelResearchSummaryComponent } from '@components/panel-research-summary/panel-research-summary.component';
import { PanelSummoningCircleComponent } from '@components/panel-summoning-circle/panel-summoning-circle.component';
import { PanelTortureChamberComponent } from '@components/panel-torture-chamber/panel-torture-chamber.component';
import { SynergyTooltipComponent } from '@components/synergy-tooltip/synergy-tooltip.component';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { TeleportOutletDirective } from '@directives/teleport.outlet.directive';
import { GameResearchComponent } from '@pages/game-research/game-research.component';
import {
  floorAll,
  floorCurrent,
  floorCurrentIndex,
  floorSetCurrentByIndex,
  optionsGet,
} from '@helpers';

@Component({
  selector: 'app-game-play',
  imports: [
    RouterModule,
    TeleportOutletDirective,
    GridComponent,
    GameResearchComponent,
    MoraleBarComponent,
    PanelAlchemyLabComponent,
    PanelAltarComponent,
    PanelBreedingPitsComponent,
    PanelDarkForgeComponent,
    PanelFloorMinimapComponent,
    PanelFloorSelectorComponent,
    PanelHallwayInfoComponent,
    PanelStairInfoComponent,
    PanelReputationComponent,
    PanelResourcesComponent,
    PanelRoomInfoComponent,
    PanelRoomSelectComponent,
    PanelRosterComponent,
    PanelThroneRoomComponent,
    PanelTrainingGroundsComponent,
    PanelResearchSummaryComponent,
    PanelSummoningCircleComponent,
    PanelTortureChamberComponent,
    SynergyTooltipComponent,
  ],
  templateUrl: './game-play.component.html',
  styleUrl: './game-play.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.PageUp)': 'navigateFloorUp($event)',
    '(document:keydown.PageDown)': 'navigateFloorDown($event)',
  },
})
export class GamePlayComponent extends OptionsBaseComponent {
  public isPaused = computed(() => optionsGet('gameloopPaused'));
  public showResearch = signal(false);

  public currentFloorDepth = computed(() => {
    const floor = floorCurrent();
    return floor?.depth ?? 1;
  });

  public totalFloors = computed(() => floorAll().length);

  public navigateFloorUp(event: KeyboardEvent): void {
    event.preventDefault();
    const currentIdx = floorCurrentIndex();
    if (currentIdx > 0) {
      floorSetCurrentByIndex(currentIdx - 1);
    }
  }

  public navigateFloorDown(event: KeyboardEvent): void {
    event.preventDefault();
    const currentIdx = floorCurrentIndex();
    const total = floorAll().length;
    if (currentIdx < total - 1) {
      floorSetCurrentByIndex(currentIdx + 1);
    }
  }
}
