import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { discordIsInElectron } from '@helpers/discord';
import { MetaService } from '@services/meta.service';

@Component({
  selector: 'app-button-update',
  imports: [SFXDirective],
  templateUrl: './button-update.component.html',
  styleUrl: './button-update.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonUpdateComponent {
  public meta = inject(MetaService);

  public shouldShowUpdate = !discordIsInElectron();
}
