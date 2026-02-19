import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  TemplateRef,
  viewChild,
  type OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';

import { GridComponent } from '@components/grid/grid.component';
import { MoraleBarComponent } from '@components/morale-bar/morale-bar.component';
import { PanelAlchemyLabComponent } from '@components/panel-alchemy-lab/panel-alchemy-lab.component';
import { PanelAltarComponent } from '@components/panel-altar/panel-altar.component';
import { PanelBreedingPitsComponent } from '@components/panel-breeding-pits/panel-breeding-pits.component';
import { PanelDarkForgeComponent } from '@components/panel-dark-forge/panel-dark-forge.component';
import { PanelFloorSelectorComponent } from '@components/panel-floor-selector/panel-floor-selector.component';
import { PanelFusionComponent } from '@components/panel-fusion/panel-fusion.component';
import { PanelHallwayInfoComponent } from '@components/panel-hallway-info/panel-hallway-info.component';
import { PanelMerchantComponent } from '@components/panel-merchant/panel-merchant.component';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { PanelReputationComponent } from '@components/panel-reputation/panel-reputation.component';
import { PanelTimeOfDayComponent } from '@components/panel-time-of-day/panel-time-of-day.component';
import { PanelResourcesComponent } from '@components/panel-resources/panel-resources.component';
import { PanelRoomInfoComponent } from '@components/panel-room-info/panel-room-info.component';
import { PanelRoomSelectComponent } from '@components/panel-room-select/panel-room-select.component';
import { PanelRosterComponent } from '@components/panel-roster/panel-roster.component';
import { PanelSummoningCircleComponent } from '@components/panel-summoning-circle/panel-summoning-circle.component';
import { PanelThroneRoomComponent } from '@components/panel-throne-room/panel-throne-room.component';
import { PanelTortureChamberComponent } from '@components/panel-torture-chamber/panel-torture-chamber.component';
import { PanelTrainingGroundsComponent } from '@components/panel-training-grounds/panel-training-grounds.component';
import { PanelVictoryComponent } from '@components/panel-victory/panel-victory.component';
import { SideTabRailComponent } from '@components/side-tab-rail/side-tab-rail.component';
import { SynergyTooltipComponent } from '@components/synergy-tooltip/synergy-tooltip.component';
import { VictoryMenuComponent } from '@components/victory-menu/victory-menu.component';
import { TeleportOutletDirective } from '@directives/teleport.outlet.directive';
import {
  floorAll,
  floorCurrent,
  floorCurrentIndex,
  floorSetCurrentByIndex,
  gridSelectedTile,
  optionsGet,
} from '@helpers';
import {
  autosaveEvent$,
  autosaveInstallBeforeUnload,
  autosaveIsSaving,
  autosaveRemoveBeforeUnload,
  autosaveStart,
  autosaveStop,
} from '@helpers/autosave';
import { fusionHasAvailableCreatures, fusionHasRoom } from '@helpers/fusion';
import { merchantIsPresent } from '@helpers/merchant';
import { notifyError } from '@helpers/notify';
import { roomRoleFindById } from '@helpers/room-roles';
import type { SideTabDefinition } from '@interfaces';
import { GameResearchComponent } from '@pages/game-research/game-research.component';

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
    PanelFloorSelectorComponent,
    PanelFusionComponent,
    PanelHallwayInfoComponent,
    PanelMerchantComponent,
    PanelVictoryComponent,
    VictoryMenuComponent,
    PanelReputationComponent,
    PanelResourcesComponent,
    PanelRoomInfoComponent,
    PanelRoomSelectComponent,
    PanelRosterComponent,
    PanelThroneRoomComponent,
    SideTabRailComponent,
    PanelTimeOfDayComponent,
    PanelTrainingGroundsComponent,
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
export class GamePlayComponent extends OptionsBaseComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  public isPaused = computed(() => optionsGet('gameloopPaused'));
  public showResearch = signal(false);
  public showFusion = signal(false);
  public showVictoryMenu = signal(false);
  public canShowFusion = computed(
    () => fusionHasAvailableCreatures() && fusionHasRoom(),
  );
  public isAutosaving = autosaveIsSaving;

  public activePanel = signal<string | undefined>(undefined);

  private placeholderPanel = viewChild('placeholderPanel', {
    read: TemplateRef,
  });
  private resourcesPanel = viewChild('resourcesPanel', {
    read: TemplateRef,
  });
  private floorsPanel = viewChild('floorsPanel', {
    read: TemplateRef,
  });
  private timePanel = viewChild('timePanel', { read: TemplateRef });
  private buildPanel = viewChild('buildPanel', { read: TemplateRef });
  private rosterPanel = viewChild('rosterPanel', { read: TemplateRef });
  private reputationPanel = viewChild('reputationPanel', {
    read: TemplateRef,
  });
  private trainingPanel = viewChild('trainingPanel', { read: TemplateRef });
  private breedingPanel = viewChild('breedingPanel', { read: TemplateRef });
  private summoningPanel = viewChild('summoningPanel', { read: TemplateRef });
  private forgePanel = viewChild('forgePanel', { read: TemplateRef });
  private alchemyPanel = viewChild('alchemyPanel', { read: TemplateRef });
  private torturePanel = viewChild('torturePanel', { read: TemplateRef });
  private altarPanel = viewChild('altarPanel', { read: TemplateRef });
  private thronePanel = viewChild('thronePanel', { read: TemplateRef });
  private merchantPanel = viewChild('merchantPanel', { read: TemplateRef });
  private roomInfoPanel = viewChild('roomInfoPanel', { read: TemplateRef });
  private hallwayInfoPanel = viewChild('hallwayInfoPanel', {
    read: TemplateRef,
  });
  private synergyPanel = viewChild('synergyPanel', { read: TemplateRef });

  private hasRoomOfRole(role: string): boolean {
    const roomTypeId = roomRoleFindById(role);
    if (!roomTypeId) return false;
    return floorAll().some((floor) =>
      floor.rooms.some((room) => room.roomTypeId === roomTypeId),
    );
  }

  public hasTrainingGrounds = computed(() =>
    this.hasRoomOfRole('trainingGrounds'),
  );
  public hasBreedingPits = computed(() => this.hasRoomOfRole('breedingPits'));
  public hasSummoningCircle = computed(() =>
    this.hasRoomOfRole('summoningCircle'),
  );
  public hasDarkForge = computed(() => this.hasRoomOfRole('darkForge'));
  public hasAlchemyLab = computed(() => this.hasRoomOfRole('alchemyLab'));
  public hasTortureChamber = computed(() =>
    this.hasRoomOfRole('tortureChamber'),
  );
  public hasAltar = computed(() => this.hasRoomOfRole('altar'));
  public hasThrone = computed(() => this.hasRoomOfRole('throne'));
  public isMerchantPresent = merchantIsPresent;

  public hasSelectedRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return false;
    const gridTile = floor.grid[tile.y]?.[tile.x];
    return !!gridTile?.roomId;
  });

  public hasSelectedHallway = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return false;
    const gridTile = floor.grid[tile.y]?.[tile.x];
    return gridTile?.occupiedBy === 'hallway' && !!gridTile?.hallwayId;
  });

  constructor() {
    super();
    effect(() => {
      const hasRoom = this.hasSelectedRoom();
      const hasHallway = this.hasSelectedHallway();
      if (hasRoom) {
        this.activePanel.set('room-info');
      } else if (hasHallway) {
        this.activePanel.set('hallway-info');
      }
    });
  }

  public tabDefinitions = computed<SideTabDefinition[]>(() => {
    const placeholder = this.placeholderPanel();
    return [
      {
        id: 'resources',
        label: 'Resources',
        isModal: false,
        templateRef: this.resourcesPanel() ?? placeholder,
      },
      {
        id: 'floors',
        label: 'Floors',
        isModal: false,
        templateRef: this.floorsPanel() ?? placeholder,
      },
      {
        id: 'time',
        label: 'Time',
        isModal: false,
        templateRef: this.timePanel() ?? placeholder,
      },
      {
        id: 'build',
        label: 'Build',
        isModal: false,
        templateRef: this.buildPanel() ?? placeholder,
      },
      {
        id: 'roster',
        label: 'Roster',
        isModal: false,
        templateRef: this.rosterPanel() ?? placeholder,
      },
      {
        id: 'reputation',
        label: 'Rep',
        isModal: false,
        templateRef: this.reputationPanel() ?? placeholder,
      },
      { id: 'research', label: 'Research', isModal: true },
      {
        id: 'fusion',
        label: 'Fusion',
        isModal: true,
        condition: this.canShowFusion,
      },
      { id: 'victory', label: 'Victory', isModal: true },
      {
        id: 'room-info',
        label: 'Room',
        isModal: false,
        templateRef: this.roomInfoPanel() ?? placeholder,
        condition: this.hasSelectedRoom,
      },
      {
        id: 'hallway-info',
        label: 'Hallway',
        isModal: false,
        templateRef: this.hallwayInfoPanel() ?? placeholder,
        condition: this.hasSelectedHallway,
      },
      {
        id: 'synergy',
        label: 'Synergy',
        isModal: false,
        templateRef: this.synergyPanel() ?? placeholder,
        condition: this.hasSelectedRoom,
      },
      {
        id: 'training',
        label: 'Training',
        isModal: false,
        templateRef: this.trainingPanel() ?? placeholder,
        condition: this.hasTrainingGrounds,
      },
      {
        id: 'breeding',
        label: 'Breeding',
        isModal: false,
        templateRef: this.breedingPanel() ?? placeholder,
        condition: this.hasBreedingPits,
      },
      {
        id: 'summoning',
        label: 'Summon',
        isModal: false,
        templateRef: this.summoningPanel() ?? placeholder,
        condition: this.hasSummoningCircle,
      },
      {
        id: 'forge',
        label: 'Forge',
        isModal: false,
        templateRef: this.forgePanel() ?? placeholder,
        condition: this.hasDarkForge,
      },
      {
        id: 'alchemy',
        label: 'Alchemy',
        isModal: false,
        templateRef: this.alchemyPanel() ?? placeholder,
        condition: this.hasAlchemyLab,
      },
      {
        id: 'torture',
        label: 'Torture',
        isModal: false,
        templateRef: this.torturePanel() ?? placeholder,
        condition: this.hasTortureChamber,
      },
      {
        id: 'altar',
        label: 'Altar',
        isModal: false,
        templateRef: this.altarPanel() ?? placeholder,
        condition: this.hasAltar,
      },
      {
        id: 'throne',
        label: 'Throne',
        isModal: false,
        templateRef: this.thronePanel() ?? placeholder,
        condition: this.hasThrone,
      },
      {
        id: 'merchant',
        label: 'Merchant',
        isModal: false,
        templateRef: this.merchantPanel() ?? placeholder,
        condition: this.isMerchantPresent,
      },
    ];
  });

  public onModalTabClick(tabId: string): void {
    switch (tabId) {
      case 'research':
        this.showResearch.set(true);
        break;
      case 'fusion':
        this.showFusion.set(true);
        break;
      case 'victory':
        this.showVictoryMenu.set(true);
        break;
    }
  }

  ngOnInit(): void {
    autosaveStart();
    autosaveInstallBeforeUnload();

    autosaveEvent$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type === 'error' && event.message) {
          notifyError(event.message);
        }
      });

    this.destroyRef.onDestroy(() => {
      autosaveStop();
      autosaveRemoveBeforeUnload();
    });
  }

  public navigateFloorUp(event: Event): void {
    event.preventDefault();
    const currentIdx = floorCurrentIndex();
    if (currentIdx > 0) {
      floorSetCurrentByIndex(currentIdx - 1);
    }
  }

  public navigateFloorDown(event: Event): void {
    event.preventDefault();
    const currentIdx = floorCurrentIndex();
    const total = floorAll().length;
    if (currentIdx < total - 1) {
      floorSetCurrentByIndex(currentIdx + 1);
    }
  }
}
