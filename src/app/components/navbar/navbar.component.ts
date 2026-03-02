import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { BadgeDisconnectedRoomsComponent } from '@components/badge-disconnected-rooms/badge-disconnected-rooms.component';
import { BadgeFloorDepthComponent } from '@components/badge-floor-depth/badge-floor-depth.component';
import { BadgeInvasionWarningComponent } from '@components/badge-invasion-warning/badge-invasion-warning.component';
import { ButtonQuitComponent } from '@components/button-quit/button-quit.component';
import { ButtonSettingsComponent } from '@components/button-settings/button-settings.component';
import { ButtonUpdateComponent } from '@components/button-update/button-update.component';
import { DisplayGameTimeComponent } from '@components/display-game-time/display-game-time.component';
import { IconComponent } from '@components/icon/icon.component';
import { ModalComponent } from '@components/modal/modal.component';
import { RequireNotSetupDirective } from '@directives/no-setup.directive';
import { RequireSetupDirective } from '@directives/require-setup.directive';
import { AnalyticsClickDirective } from '@directives/analytics-click.directive';
import { SFXDirective } from '@directives/sfx.directive';
import {
  uiCloseAllMenus,
  GAME_TIME_SPEEDS,
  gameTimeSpeed,
  optionsGet,
  setupIs,
  uiIsAnyModalOpen,
  uiIsShowingAnyMenu,
  gamestateSave,
  gameTimeSetSpeed,
  optionsSet,
  uiShowOptionsMenu,
} from '@helpers';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import type { GameSpeed, Icon } from '@interfaces';
import { TippyDirective } from '@ngneat/helipopper';
import { HotkeysDirective } from '@ngneat/hotkeys';
import { MetaService } from '@services/meta.service';
import type { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-navbar',
  imports: [
    BadgeDisconnectedRoomsComponent,
    BadgeFloorDepthComponent,
    BadgeInvasionWarningComponent,
    TippyDirective,
    RequireSetupDirective,
    IconComponent,
    SweetAlert2Module,
    SFXDirective,
    ButtonUpdateComponent,
    HotkeysDirective,
    RequireNotSetupDirective,
    ModalComponent,
    ButtonQuitComponent,
    ButtonSettingsComponent,
    DisplayGameTimeComponent,
    AnalyticsClickDirective,
  ],
  providers: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  public meta = inject(MetaService);
  public router = inject(Router);

  public showPauseMenu = signal<boolean>(false);
  private wasPausedBeforeOpeningMenu = signal<boolean>(false);

  public leaveSwal = viewChild<SwalComponent>('leaveSwal');

  public isPaused = computed(() => optionsGet('gameloopPaused'));
  public gameTimeSpeed = gameTimeSpeed;
  public gameSpeeds = GAME_TIME_SPEEDS;
  public readonly panelConfigs: Array<{
    name: string;
    icon: Icon;
    hotkey: string;
    clickCb: () => void;
  }> = [];

  public toggleOptions() {
    if (uiShowOptionsMenu()) {
      uiShowOptionsMenu.set(false);
      return;
    }

    uiCloseAllMenus();
    uiShowOptionsMenu.set(!uiShowOptionsMenu());
  }

  public togglePause() {
    analyticsSendDesignEvent('Nav:Pause:Toggle');
    if (this.showPauseMenu()) return;
    optionsSet('gameloopPaused', !this.isPaused());
  }

  public setSpeed(speed: GameSpeed) {
    gameTimeSetSpeed(speed);
  }

  public goToHome() {
    gamestateSave();
    uiCloseAllMenus();
    this.router.navigate(['..']);
  }

  public closePauseMenu() {
    this.showPauseMenu.set(false);
    if (!this.wasPausedBeforeOpeningMenu()) {
      optionsSet('gameloopPaused', false);
    }
  }

  public openPauseMenu() {
    if (!setupIs()) return;

    this.showPauseMenu.set(true);
    if (this.isPaused()) {
      this.wasPausedBeforeOpeningMenu.set(true);
    } else {
      this.wasPausedBeforeOpeningMenu.set(false);
      optionsSet('gameloopPaused', true);
    }
  }

  public uiCloseAllMenus() {
    if (uiIsAnyModalOpen()) return;

    if (uiShowOptionsMenu()) {
      uiShowOptionsMenu.set(false);
      return;
    }

    if (this.showPauseMenu()) {
      this.closePauseMenu();
      return;
    }

    if (!uiIsShowingAnyMenu()) {
      this.openPauseMenu();
      return;
    }

    uiCloseAllMenus(true);
  }
}
