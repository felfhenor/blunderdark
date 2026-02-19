import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import {
  contentGetEntry,
  corruptionEffectEvent$,
  notifyNotification$,
  reputationGetLevelLabel,
  reputationLevelUp$,
  researchUnlock$,
} from '@helpers';
import type { IsContentItem, ReputationType, UnlockEffect } from '@interfaces';
import type { CorruptionEffectEvent } from '@interfaces/corruption-effect';
import type { ReputationLevelUpEvent } from '@interfaces/reputation';
import { getUnlockTargetId } from '@interfaces/research';
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
    notifyNotification$.subscribe((messageData) => {
      const { message, type } = messageData;
      this.logger.debug(`Notify:${type}`, message);

      this.toast?.[type]?.(message);
    });

    reputationLevelUp$.subscribe((event: ReputationLevelUpEvent) => {
      this.showReputationLevelUp(event);
    });

    corruptionEffectEvent$.subscribe((event: CorruptionEffectEvent) => {
      this.showCorruptionEffect(event);
    });

    researchUnlock$.subscribe((event) => {
      this.showResearchUnlock(event);
    });
  }

  private showCorruptionEffect(event: CorruptionEffectEvent): void {
    const titles: Record<CorruptionEffectEvent['type'], string> = {
      dark_upgrade_unlocked: 'Dark Upgrades Unlocked',
      mutation_applied: 'Corruption Mutation',
      crusade_triggered: 'Crusade Triggered',
    };

    const title = titles[event.type];
    this.logger.debug(
      'Notify:CorruptionEffect',
      `${title} - ${event.description}`,
    );

    const isWarning = event.type === 'crusade_triggered';
    if (isWarning) {
      this.toast.warning(event.description, title, {
        timeOut: 8000,
        extendedTimeOut: 2000,
        tapToDismiss: true,
        progressBar: true,
      });
    } else {
      this.toast.info(event.description, title, {
        timeOut: 5000,
        extendedTimeOut: 1000,
        tapToDismiss: true,
        progressBar: true,
      });
    }
  }

  private getUnlockDescription(unlock: UnlockEffect): string {
    if (unlock.type === 'passive_bonus') {
      return unlock.description;
    }

    if (unlock.type === 'feature_flag') {
      return unlock.description;
    }

    const targetId = getUnlockTargetId(unlock)!;
    const entry = contentGetEntry<IsContentItem>(targetId);
    const label =
      unlock.type === 'room'
        ? 'Room'
        : unlock.type === 'inhabitant'
          ? 'Creature'
          : unlock.type === 'ability'
            ? 'Ability'
            : 'Upgrade';

    return `${label}: ${entry?.name ?? targetId}`;
  }

  private showResearchUnlock(event: {
    nodeName: string;
    unlocks: UnlockEffect[];
  }): void {
    const title = `Research Complete: ${event.nodeName}`;
    const unlockLines = event.unlocks.map((u) => this.getUnlockDescription(u));
    const message =
      unlockLines.length > 0
        ? `Unlocked: ${unlockLines.join(', ')}`
        : 'No new content unlocked';

    this.logger.debug('Notify:ResearchUnlock', `${title} - ${message}`);

    this.toast.success(message, title, {
      timeOut: 6000,
      extendedTimeOut: 2000,
      tapToDismiss: true,
      progressBar: true,
    });
  }

  private showReputationLevelUp(event: ReputationLevelUpEvent): void {
    const categoryLabel = REPUTATION_LABELS[event.type];
    const levelLabel = reputationGetLevelLabel(event.newLevel);
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
