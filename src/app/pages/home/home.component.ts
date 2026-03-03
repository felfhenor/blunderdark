import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonQuitComponent } from '@components/button-quit/button-quit.component';
import { ButtonSettingsComponent } from '@components/button-settings/button-settings.component';
import { ButtonUpdateComponent } from '@components/button-update/button-update.component';
import { ConnectButtonsComponent } from '@components/connect-buttons/connect-buttons.component';
import { AnalyticsClickDirective } from '@directives/analytics-click.directive';
import { SFXDirective } from '@directives/sfx.directive';
import { TeleportOutletDirective } from '@directives/teleport.outlet.directive';
import { discordSetStatus, gameReset, optionsGet, optionsSet, setupIs } from '@helpers';
import { MetaService } from '@services/meta.service';
import type { VictoryResetProgress } from '@interfaces';
import type { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-home',
  imports: [
    SweetAlert2Module,
    ConnectButtonsComponent,
    AnalyticsClickDirective,
    SFXDirective,
    ButtonUpdateComponent,
    ButtonQuitComponent,
    TeleportOutletDirective,
    ButtonSettingsComponent,
  ],
  providers: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  public meta = inject(MetaService);
  private router = inject(Router);

  public resetGameSwal = viewChild<SwalComponent>('newGameSwal');

  public hasStartedGame = computed(() => setupIs());

  public victoryCount = computed(() => {
    const progress: VictoryResetProgress = optionsGet(
      'victoryResetProgress',
    ) ?? { completedPathIds: [], totalVictories: 0 };
    return progress.totalVictories;
  });

  public completedPathCount = computed(() => {
    const progress: VictoryResetProgress = optionsGet(
      'victoryResetProgress',
    ) ?? { completedPathIds: [], totalVictories: 0 };
    return progress.completedPathIds.length;
  });

  ngOnInit() {
    discordSetStatus({
      state: 'In Main Menu',
    });
  }

  async newGame() {
    if (setupIs()) {
      const res = await this.resetGameSwal()?.fire();
      if (!res) return;

      if (res.isConfirmed) {
        gameReset();
        this.router.navigate(['/setup']);
      }
      return;
    }

    this.router.navigate(['/setup']);
  }

  resumeGame() {
    this.router.navigate(['/game']);
  }

  replayTutorial() {
    optionsSet('tutorialCompleted', false);
    this.router.navigate(['/game']);
  }
}
