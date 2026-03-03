import { ChangeDetectionStrategy, Component, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '@components/navbar/navbar.component';
import { discordUpdateStatus } from '@helpers/discord';

@Component({
  selector: 'app-game',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent {
  constructor() {
    effect(() => discordUpdateStatus());
  }
}
