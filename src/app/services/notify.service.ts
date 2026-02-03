import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import {
  getReputationLevelLabel,
  notification$,
  reputationLevelUp$,
} from '@helpers';
import type { ReputationLevelUpEvent } from '@helpers/reputation';
import type { ReputationType } from '@interfaces';
import { LoggerService } from '@services/logger.service';

const REPUTATION_FLAVOR_TEXT: Record<ReputationType, string> = {
  terror: 'Your dungeon strikes fear into the hearts of all!',
  wealth: 'Tales of your riches spread far and wide!',
  knowledge: 'Your arcane discoveries become legendary!',
  harmony: 'Balance flows through your domain!',
  chaos: 'Unpredictable power surges through your halls!',
};

const REPUTATION_LABELS: Record<ReputationType, string> = {
  terror: 'Terror',
  wealth: 'Wealth',
  knowledge: 'Knowledge',
  harmony: 'Harmony',
  chaos: 'Chaos',
};

@Injectable({
  providedIn: 'root',
})
export class NotifyService {
  private logger = inject(LoggerService);
  private toast = inject(ToastrService);

  async init() {
    notification$.subscribe((messageData) => {
      const { message, type } = messageData;
      this.logger.debug(`Notify:${type}`, message);

      this.toast?.[type]?.(message);
    });

    reputationLevelUp$.subscribe((event: ReputationLevelUpEvent) => {
      this.showReputationLevelUp(event);
    });
  }

  private showReputationLevelUp(event: ReputationLevelUpEvent): void {
    const categoryLabel = REPUTATION_LABELS[event.type];
    const levelLabel = getReputationLevelLabel(event.newLevel);
    const flavorText = REPUTATION_FLAVOR_TEXT[event.type];

    const title = `${categoryLabel} Reputation: ${levelLabel}!`;
    const message = flavorText;

    this.logger.debug('Notify:ReputationLevelUp', `${title} - ${message}`);

    this.toast.success(message, title, {
      timeOut: 5000,
      extendedTimeOut: 1000,
      tapToDismiss: true,
      progressBar: true,
    });
  }
}
