import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import {
  contentGetEntry,
  corruptionEffectEvent$,
  merchantEvent$,
  notifyNotification$,
  reputationGetLevelLabel,
  reputationLevelUp$,
  researchUnlock$,
} from '@helpers';
import type {
  IsContentItem,
  ReputationType,
  UnlockContentType,
  UnlockEffect,
} from '@interfaces';
import type { CorruptionEffectEvent } from '@interfaces/corruption-effect';
import type { MerchantEvent } from '@helpers/merchant';
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

    merchantEvent$.subscribe((event) => {
      this.showMerchantEvent(event);
    });
  }

  private showCorruptionEffect(event: CorruptionEffectEvent): void {
    this.logger.debug(
      'Notify:CorruptionEffect',
      `${event.title} - ${event.description}`,
    );

    const isWarning = event.severity === 'warning' || event.severity === 'error';
    if (isWarning) {
      this.toast.warning(event.description, event.title, {
        timeOut: 8000,
        extendedTimeOut: 2000,
        tapToDismiss: true,
        progressBar: true,
      });
    } else {
      this.toast.info(event.description, event.title, {
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

    if (unlock.type === 'biome') {
      const biomeNames: Record<string, string> = {
        volcanic: 'Volcanic',
        flooded: 'Flooded',
        crystal: 'Crystal',
        corrupted: 'Corrupted',
        fungal: 'Fungal',
        neutral: 'Neutral',
      };
      return `Biome: ${biomeNames[unlock.targetBiome] ?? 'Unknown'}`;
    }

    const targetId = getUnlockTargetId(unlock)!;
    const entry = contentGetEntry<IsContentItem>(targetId);
    const UNLOCK_LABELS: Record<UnlockContentType, string> = {
      room: 'Room',
      inhabitant: 'Creature',
      ability: 'Ability',
      roomfeature: 'Room Feature',
      roomupgrade: 'Upgrade',
      biome: 'Biome',
    };
    const label = UNLOCK_LABELS[unlock.type];

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

  private showMerchantEvent(event: MerchantEvent): void {
    if (event.type === 'arrival') {
      this.logger.debug('Notify:Merchant', 'Merchant has arrived');
      this.toast.info('A travelling merchant has arrived at your dungeon!', 'Merchant Arrived', {
        timeOut: 5000,
        extendedTimeOut: 1000,
        tapToDismiss: true,
        progressBar: true,
      });
    } else {
      this.logger.debug('Notify:Merchant', 'Merchant has departed');
      this.toast.info('The merchant has packed up and left your dungeon.', 'Merchant Departed', {
        timeOut: 5000,
        extendedTimeOut: 1000,
        tapToDismiss: true,
        progressBar: true,
      });
    }
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
