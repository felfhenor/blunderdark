import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  type ElementRef,
  type OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { GridComponent } from '@components/grid/grid.component';
import { HudInvasionComponent } from '@components/hud-invasion/hud-invasion.component';
import { MoraleBarComponent } from '@components/morale-bar/morale-bar.component';
import { PanelAlchemyLabComponent } from '@components/panel-alchemy-lab/panel-alchemy-lab.component';
import { PanelAltarComponent } from '@components/panel-altar/panel-altar.component';
import { PanelBreedingPitsComponent } from '@components/panel-breeding-pits/panel-breeding-pits.component';
import { PanelDarkForgeComponent } from '@components/panel-dark-forge/panel-dark-forge.component';
import { PanelFloorSelectorComponent } from '@components/panel-floor-selector/panel-floor-selector.component';
import { PanelInvasionBattleComponent } from '@components/panel-invasion-battle/panel-invasion-battle.component';
import { PanelFusionComponent } from '@components/panel-fusion/panel-fusion.component';
import { ResourceBreakdownModalComponent } from '@components/resource-breakdown-modal/resource-breakdown-modal.component';
import { PanelHallwayInfoComponent } from '@components/panel-hallway-info/panel-hallway-info.component';
import { PanelMerchantComponent } from '@components/panel-merchant/panel-merchant.component';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { PanelReputationComponent } from '@components/panel-reputation/panel-reputation.component';
import { PanelRoomInfoComponent } from '@components/panel-room-info/panel-room-info.component';
import { PanelRoomSelectComponent } from '@components/panel-room-select/panel-room-select.component';
import { PanelRosterComponent } from '@components/panel-roster/panel-roster.component';
import { PanelSummoningCircleComponent } from '@components/panel-summoning-circle/panel-summoning-circle.component';
import { PanelTimeOfDayComponent } from '@components/panel-time-of-day/panel-time-of-day.component';
import { PanelThroneRoomComponent } from '@components/panel-throne-room/panel-throne-room.component';
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
  hallwayPlacementBuildStep,
  optionsGet,
  roomPlacementSelectedTypeId,
} from '@helpers';
import {
  roomShapeGetAbsoluteTiles,
  roomShapeResolve,
} from '@helpers/room-shapes';
import {
  autosaveEvent$,
  autosaveInstallBeforeUnload,
  autosaveIsSaving,
  autosaveRemoveBeforeUnload,
  autosaveStart,
  autosaveStop,
} from '@helpers/autosave';
import {
  invasionBattleLog,
  invasionIsActive,
  invasionIsCompleted,
} from '@helpers/invasion-process';
import { fusionHasAvailableCreatures, fusionHasRoom } from '@helpers/fusion';
import { gameloopIsPaused } from '@helpers/gameloop';
import { merchantIsPresent } from '@helpers/merchant';
import { notifyError } from '@helpers/notify';
import { roomRoleFindById } from '@helpers/room-roles';
import { gamestate } from '@helpers/state-game';
import { transportPlacementActive } from '@helpers/transport-placement';
import type { ResourceType, SideTabDefinition } from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';
import { GameResearchComponent } from '@pages/game-research/game-research.component';

@Component({
  selector: 'app-game-play',
  imports: [
    NgClass,
    TeleportOutletDirective,
    GridComponent,
    GameResearchComponent,
    HudInvasionComponent,
    MoraleBarComponent,
    PanelAlchemyLabComponent,
    PanelAltarComponent,
    PanelBreedingPitsComponent,
    PanelDarkForgeComponent,
    PanelFloorSelectorComponent,
    PanelFusionComponent,
    PanelInvasionBattleComponent,
    PanelHallwayInfoComponent,
    PanelMerchantComponent,
    PanelVictoryComponent,
    ResourceBreakdownModalComponent,
    VictoryMenuComponent,
    PanelReputationComponent,
    PanelThroneRoomComponent,
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
    '(document:keydown.ArrowUp)': 'navigateFloorUp($event)',
    '(document:keydown.ArrowDown)': 'navigateFloorDown($event)',
    '(document:keydown.-)': 'navigateFloorUp($event)',
    '(document:keydown.=)': 'navigateFloorDown($event)',
  },
})
export class GamePlayComponent extends OptionsBaseComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  public isPaused = computed(() => optionsGet('gameloopPaused'));
  public showResearch = signal(false);
  public showFusion = signal(false);
  public showVictoryMenu = signal(false);
  public showResourceBreakdown = signal(false);
  public breakdownResourceType = signal<ResourceType | undefined>(undefined);
  public canShowFusion = computed(
    () => fusionHasAvailableCreatures() && fusionHasRoom(),
  );
  public isAutosaving = autosaveIsSaving;
  public invasionIsActive = invasionIsActive;
  public invasionRecentLog = computed(() => invasionBattleLog().slice(-15));

  private invasionBattle = viewChild(PanelInvasionBattleComponent);
  private invasionLogContainer = viewChild<ElementRef<HTMLElement>>(
    'invasionLogContainer',
  );

  public activePanel = signal<string | undefined>(undefined);
  private buildPanelClosedForPlacement = false;

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
  private breedingPanel = viewChild('breedingPanel', { read: TemplateRef });
  private altarPanel = viewChild('altarPanel', { read: TemplateRef });
  private thronePanel = viewChild('thronePanel', { read: TemplateRef });
  private merchantPanel = viewChild('merchantPanel', { read: TemplateRef });

  private hasRoomOfRole(role: string): boolean {
    const roomTypeId = roomRoleFindById(role);
    if (!roomTypeId) return false;
    return floorAll().some((floor) =>
      floor.rooms.some((room) => room.roomTypeId === roomTypeId),
    );
  }

  public hasThrone = computed(() => this.hasRoomOfRole('throne'));
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
  public hasBreedingPits = computed(() => this.hasRoomOfRole('breedingPits'));
  public isMerchantPresent = merchantIsPresent;
  public hasNoActiveResearch = computed(
    () => !gamestate().world.research.activeResearch,
  );

  private readonly roleToTabId: Record<string, string> = {
    throne: 'throne',
    altar: 'altar',
    trainingGrounds: 'training',
    summoningCircle: 'summoning',
    darkForge: 'forge',
    alchemyLab: 'alchemy',
    tortureChamber: 'torture',
    breedingPits: 'breeding',
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

    // When a role-based tab is opened (e.g. via hotkey), select its room on the grid
    // so the right-side room info panel also appears.
    effect(() => {
      const panel = this.activePanel();
      if (!panel) return;

      // Only act for role-based tabs
      const roleForTab = Object.entries(this.roleToTabId).find(
        ([, tabId]) => tabId === panel,
      );
      if (!roleForTab) return;

      // If the grid already has the right room selected, skip
      const currentTile = untracked(() => gridSelectedTile());
      if (currentTile) {
        const currentFloor = untracked(floorCurrent);
        const gridCell = currentFloor?.grid[currentTile.y]?.[currentTile.x];
        if (gridCell?.roomId) {
          const selectedRoom = currentFloor?.rooms.find(
            (r) => r.id === gridCell.roomId,
          );
          const selectedDef = selectedRoom
            ? contentGetEntry<RoomContent>(selectedRoom.roomTypeId)
            : undefined;
          if (selectedDef?.role === roleForTab[0]) return;
        }
      }

      // Find the room and select one of its tiles
      const roomTypeId = roomRoleFindById(roleForTab[0]);
      if (!roomTypeId) return;

      for (const floor of floorAll()) {
        const room = floor.rooms.find((r) => r.roomTypeId === roomTypeId);
        if (room) {
          const shape = roomShapeResolve(room);
          const tiles = roomShapeGetAbsoluteTiles(
            shape,
            room.anchorX,
            room.anchorY,
          );
          if (tiles.length > 0) {
            gridSelectedTile.set({ x: tiles[0].x, y: tiles[0].y });
          }
          break;
        }
      }
    });

    // Close build panel when entering placement mode; reopen when exiting
    effect(() => {
      const roomActive = !!roomPlacementSelectedTypeId();
      const transportActive = transportPlacementActive();
      const anyPlacementActive = roomActive || transportActive;

      if (anyPlacementActive) {
        if (untracked(() => this.activePanel()) === 'build') {
          this.buildPanelClosedForPlacement = true;
        }
        this.activePanel.set(undefined);
      } else if (this.buildPanelClosedForPlacement) {
        this.buildPanelClosedForPlacement = false;
        this.activePanel.set('build');
      }
    });

    // Reopen build panel when hallway placement reaches preview step
    effect(() => {
      const step = hallwayPlacementBuildStep();
      if (step === 'preview') {
        this.activePanel.set('build');
      }
    });

    // When invasion completes, open the results modal
    effect(() => {
      if (invasionIsCompleted()) {
        untracked(() => {
          const state = gamestate();
          const invasion = state.world.activeInvasion;
          if (invasion?.completed && invasion.result) {
            this.invasionBattle()?.showResults(invasion);
          }
        });
      }
    });

    // Auto-scroll invasion log to bottom on new entries
    afterRenderEffect(() => {
      const log = this.invasionRecentLog();
      if (log.length > 0) {
        const el = this.invasionLogContainer()?.nativeElement;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }
    });

    // Pause CSS animations when game is paused to reduce idle CPU
    effect(() => {
      document.body.classList.toggle('game-paused', gameloopIsPaused());
    });

    // Pause CSS animations when tab is not visible
    const onVisibilityChange = () => {
      document.body.classList.toggle('tab-hidden', document.hidden);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.body.classList.remove('game-paused', 'tab-hidden');
    });
  }

  public tabDefinitions = computed<SideTabDefinition[]>(() => {
    const placeholder = this.placeholderPanel();
    return [
      {
        id: 'floors',
        label: 'Floors',
        icon: 'game3dStairs',
        hotkey: 'f',
        isModal: false,
        templateRef: this.floorsPanel() ?? placeholder,
      },
      {
        id: 'time',
        label: 'Time',
        icon: 'gameAlarmClock',
        hotkey: 't',
        isModal: false,
        templateRef: this.timePanel() ?? placeholder,
      },
      {
        id: 'build',
        label: 'Build',
        icon: 'gameGearHammer',
        hotkey: 'b',
        isModal: false,
        templateRef: this.buildPanel() ?? placeholder,
      },
      {
        id: 'roster',
        label: 'Roster',
        icon: 'gameMinions',
        hotkey: 'r',
        isModal: false,
        templateRef: this.rosterPanel() ?? placeholder,
      },
      {
        id: 'reputation',
        label: 'Reputation',
        icon: 'gameCondorEmblem',
        hotkey: 'p',
        isModal: false,
        templateRef: this.reputationPanel() ?? placeholder,
      },
      {
        id: 'altar',
        label: 'Altar',
        icon: 'gameStarAltar',
        hotkey: 'a',
        isModal: false,
        templateRef: this.altarPanel() ?? placeholder,
      },
      {
        id: 'throne',
        label: 'Throne',
        icon: 'gameThroneKing',
        hotkey: 'k',
        isModal: false,
        templateRef: this.thronePanel() ?? placeholder,
        condition: this.hasThrone,
      },
      {
        id: 'training',
        label: 'Training',
        icon: 'gameSwordClash',
        hotkey: 'g',
        isModal: false,
        templateRef: this.trainingPanel() ?? placeholder,
        condition: this.hasTrainingGrounds,
      },
      {
        id: 'summoning',
        label: 'Summon',
        icon: 'gameMagicGate',
        hotkey: 's',
        isModal: false,
        templateRef: this.summoningPanel() ?? placeholder,
        condition: this.hasSummoningCircle,
      },
      {
        id: 'forge',
        label: 'Forge',
        icon: 'gameAnvilImpact',
        hotkey: 'd',
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
        hidden: true,
      },
      {
        id: 'torture',
        label: 'Torture',
        icon: 'gameChoppedSkull',
        hotkey: 'x',
        isModal: false,
        templateRef: this.torturePanel() ?? placeholder,
        condition: this.hasTortureChamber,
      },
      {
        id: 'breeding',
        label: 'Breeding',
        isModal: false,
        templateRef: this.breedingPanel() ?? placeholder,
        condition: this.hasBreedingPits,
        hidden: true,
      },
      {
        id: 'merchant',
        label: 'Merchant',
        icon: 'gamePouchWithBeads',
        hotkey: 'm',
        isModal: false,
        templateRef: this.merchantPanel() ?? placeholder,
        condition: this.isMerchantPresent,
      },
    ];
  });

  public modalTabDefinitions = computed<SideTabDefinition[]>(() => [
    {
      id: 'research',
      label: 'Research',
      icon: 'gameMaterialsScience',
      hotkey: 'e',
      iconGlow: this.hasNoActiveResearch,
      isModal: true,
    },
    {
      id: 'fusion',
      label: 'Fusion',
      icon: 'gameDuality',
      hotkey: 'u',
      isModal: true,
      condition: this.canShowFusion,
    },
    {
      id: 'victory',
      label: 'Victory',
      icon: 'gameChampions',
      hotkey: 'v',
      isModal: true,
    },
  ]);

  public openResourceBreakdown(type: ResourceType): void {
    this.breakdownResourceType.set(type);
    this.showResourceBreakdown.set(true);
  }

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

  public navigateFloorUp(event?: Event): void {
    event?.preventDefault();
    const currentIdx = floorCurrentIndex();
    if (currentIdx > 0) {
      floorSetCurrentByIndex(currentIdx - 1);
    }
  }

  public navigateFloorDown(event?: Event): void {
    event?.preventDefault();
    const currentIdx = floorCurrentIndex();
    const total = floorAll().length;
    if (currentIdx < total - 1) {
      floorSetCurrentByIndex(currentIdx + 1);
    }
  }

  public getLogEntryClass(type: string): string {
    switch (type) {
      case 'combat_kill':
        return 'text-success';
      case 'defender_killed':
        return 'text-error font-bold';
      case 'trap_trigger':
      case 'morale_change':
      case 'retreat':
        return 'text-warning';
      case 'trap_disarm':
        return 'text-info';
      case 'altar_damage':
        return 'text-error';
      case 'room_enter':
        return 'text-primary font-semibold';
      case 'room_cleared':
        return 'text-accent';
      case 'invasion_end':
        return 'font-bold';
      default:
        return '';
    }
  }
}
