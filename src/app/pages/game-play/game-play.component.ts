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
import { GridComponent } from '@components/grid/grid.component';
import { MoraleBarComponent } from '@components/morale-bar/morale-bar.component';
import { PanelAlchemyLabComponent } from '@components/panel-alchemy-lab/panel-alchemy-lab.component';
import { PanelAltarComponent } from '@components/panel-altar/panel-altar.component';
import { PanelDarkForgeComponent } from '@components/panel-dark-forge/panel-dark-forge.component';
import { PanelFloorSelectorComponent } from '@components/panel-floor-selector/panel-floor-selector.component';
import { PanelFusionComponent } from '@components/panel-fusion/panel-fusion.component';
import { PanelHallwayInfoComponent } from '@components/panel-hallway-info/panel-hallway-info.component';
import { PanelMerchantComponent } from '@components/panel-merchant/panel-merchant.component';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { PanelReputationComponent } from '@components/panel-reputation/panel-reputation.component';
import { PanelRoomInfoComponent } from '@components/panel-room-info/panel-room-info.component';
import { PanelRoomSelectComponent } from '@components/panel-room-select/panel-room-select.component';
import { PanelRosterComponent } from '@components/panel-roster/panel-roster.component';
import { PanelSummoningCircleComponent } from '@components/panel-summoning-circle/panel-summoning-circle.component';
import { PanelTimeOfDayComponent } from '@components/panel-time-of-day/panel-time-of-day.component';
import { PanelTortureChamberComponent } from '@components/panel-torture-chamber/panel-torture-chamber.component';
import { PanelTrainingGroundsComponent } from '@components/panel-training-grounds/panel-training-grounds.component';
import { PanelVictoryComponent } from '@components/panel-victory/panel-victory.component';
import { ResourceBarTopComponent } from '@components/resource-bar-top/resource-bar-top.component';
import { SideTabRailComponent } from '@components/side-tab-rail/side-tab-rail.component';
import { VictoryMenuComponent } from '@components/victory-menu/victory-menu.component';
import { TeleportOutletDirective } from '@directives/teleport.outlet.directive';
import {
  contentGetEntry,
  floorAll,
  floorCurrent,
  floorCurrentIndex,
  floorSetCurrentByIndex,
  gridSelectedTile,
  optionsGet,
  signalLocalStorage,
} from '@helpers';
import type { RoomContent } from '@interfaces/content-room';
import {
  autosaveEvent$,
  autosaveInstallBeforeUnload,
  autosaveIsSaving,
  autosaveRemoveBeforeUnload,
  autosaveStart,
  autosaveStop,
} from '@helpers/autosave';
import { fusionHasAvailableCreatures, fusionHasRoom } from '@helpers/fusion';
import { gamestate } from '@helpers/state-game';
import { merchantIsPresent } from '@helpers/merchant';
import { notifyError } from '@helpers/notify';
import { roomRoleFindById } from '@helpers/room-roles';
import type { SideTabDefinition } from '@interfaces';
import { GameResearchComponent } from '@pages/game-research/game-research.component';

@Component({
  selector: 'app-game-play',
  imports: [
    TeleportOutletDirective,
    GridComponent,
    GameResearchComponent,
    MoraleBarComponent,
    PanelAlchemyLabComponent,
    PanelAltarComponent,
    PanelDarkForgeComponent,
    PanelFloorSelectorComponent,
    PanelFusionComponent,
    PanelHallwayInfoComponent,
    PanelMerchantComponent,
    PanelVictoryComponent,
    VictoryMenuComponent,
    PanelReputationComponent,
    ResourceBarTopComponent,
    PanelRoomInfoComponent,
    PanelRoomSelectComponent,
    PanelRosterComponent,
    SideTabRailComponent,
    PanelTimeOfDayComponent,
    PanelTrainingGroundsComponent,
    PanelSummoningCircleComponent,
    PanelTortureChamberComponent,
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

  public activePanel = signalLocalStorage<string | undefined>(
    'blunderdark-active-panel',
    undefined,
  );

  private placeholderPanel = viewChild('placeholderPanel', {
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
  private summoningPanel = viewChild('summoningPanel', { read: TemplateRef });
  private forgePanel = viewChild('forgePanel', { read: TemplateRef });
  private alchemyPanel = viewChild('alchemyPanel', { read: TemplateRef });
  private torturePanel = viewChild('torturePanel', { read: TemplateRef });
  private altarPanel = viewChild('altarPanel', { read: TemplateRef });
  private merchantPanel = viewChild('merchantPanel', { read: TemplateRef });

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
  public hasSummoningCircle = computed(() =>
    this.hasRoomOfRole('summoningCircle'),
  );
  public hasDarkForge = computed(() => this.hasRoomOfRole('darkForge'));
  public hasAlchemyLab = computed(() => this.hasRoomOfRole('alchemyLab'));
  public hasTortureChamber = computed(() =>
    this.hasRoomOfRole('tortureChamber'),
  );
  public isMerchantPresent = merchantIsPresent;
  public hasNoActiveResearch = computed(
    () => !gamestate().world.research.activeResearch,
  );

  private readonly roleToTabId: Record<string, string> = {
    altar: 'altar',
    trainingGrounds: 'training',
    summoningCircle: 'summoning',
    darkForge: 'forge',
    alchemyLab: 'alchemy',
    tortureChamber: 'torture',
  };

  private selectedRoomTabId = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room) return undefined;

    const def = contentGetEntry<RoomContent>(room.roomTypeId);
    if (!def?.role) return undefined;

    return this.roleToTabId[def.role];
  });

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
      const tabId = this.selectedRoomTabId();
      if (tabId) {
        this.activePanel.set(tabId);
      }
    });
  }

  public tabDefinitions = computed<SideTabDefinition[]>(() => {
    const placeholder = this.placeholderPanel();
    return [
      {
        id: 'floors',
        label: 'Floors',
        icon: 'game3dStairs',
        isModal: false,
        templateRef: this.floorsPanel() ?? placeholder,
      },
      {
        id: 'time',
        label: 'Time',
        icon: 'gameAlarmClock',
        isModal: false,
        templateRef: this.timePanel() ?? placeholder,
      },
      {
        id: 'build',
        label: 'Build',
        icon: 'gameGearHammer',
        isModal: false,
        templateRef: this.buildPanel() ?? placeholder,
      },
      {
        id: 'roster',
        label: 'Roster',
        icon: 'gameMinions',
        isModal: false,
        templateRef: this.rosterPanel() ?? placeholder,
      },
      {
        id: 'reputation',
        label: 'Reputation',
        icon: 'gameCondorEmblem',
        isModal: false,
        templateRef: this.reputationPanel() ?? placeholder,
      },
      {
        id: 'altar',
        label: 'Altar',
        icon: 'gameStarAltar',
        isModal: false,
        templateRef: this.altarPanel() ?? placeholder,
      },
      {
        id: 'training',
        label: 'Training',
        icon: 'gameSwordClash',
        isModal: false,
        templateRef: this.trainingPanel() ?? placeholder,
        condition: this.hasTrainingGrounds,
      },
      {
        id: 'summoning',
        label: 'Summon',
        icon: 'gameMagicGate',
        isModal: false,
        templateRef: this.summoningPanel() ?? placeholder,
        condition: this.hasSummoningCircle,
      },
      {
        id: 'forge',
        label: 'Forge',
        icon: 'gameAnvilImpact',
        isModal: false,
        templateRef: this.forgePanel() ?? placeholder,
        condition: this.hasDarkForge,
      },
      {
        id: 'alchemy',
        label: 'Alchemy',
        icon: 'gameChemicalDrop',
        isModal: false,
        templateRef: this.alchemyPanel() ?? placeholder,
        condition: this.hasAlchemyLab,
      },
      {
        id: 'torture',
        label: 'Torture',
        icon: 'gameChoppedSkull',
        isModal: false,
        templateRef: this.torturePanel() ?? placeholder,
        condition: this.hasTortureChamber,
      },
      {
        id: 'merchant',
        label: 'Merchant',
        icon: 'gamePouchWithBeads',
        isModal: false,
        templateRef: this.merchantPanel() ?? placeholder,
        condition: this.isMerchantPresent,
      },
    ];
  });

  public modalTabDefinitions = computed<SideTabDefinition[]>(() => [
    { id: 'research', label: 'Research', icon: 'gameMaterialsScience', iconGlow: this.hasNoActiveResearch, isModal: true },
    {
      id: 'fusion',
      label: 'Fusion',
      icon: 'gameDuality',
      isModal: true,
      condition: this.canShowFusion,
    },
    { id: 'victory', label: 'Victory', icon: 'gameChampions', isModal: true },
  ]);

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
