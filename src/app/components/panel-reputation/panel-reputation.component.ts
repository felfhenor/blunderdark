import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  gamestate,
  getReputationLevel,
  getReputationLevelLabel,
} from '@helpers';
import type { ReputationLevel, ReputationType } from '@interfaces';
import { REPUTATION_THRESHOLDS } from '@interfaces/reputation';

type ReputationCategory = {
  type: ReputationType;
  label: string;
  icon: string;
  color: string;
};

const REPUTATION_CATEGORIES: ReputationCategory[] = [
  { type: 'terror', label: 'Terror', icon: '💀', color: 'progress-error' },
  { type: 'wealth', label: 'Wealth', icon: '💰', color: 'progress-warning' },
  { type: 'knowledge', label: 'Knowledge', icon: '📚', color: 'progress-info' },
  { type: 'harmony', label: 'Harmony', icon: '🌿', color: 'progress-success' },
  { type: 'chaos', label: 'Chaos', icon: '🌀', color: 'progress-secondary' },
];

@Component({
  selector: 'app-panel-reputation',
  imports: [DecimalPipe],
  templateUrl: './panel-reputation.component.html',
  styleUrl: './panel-reputation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelReputationComponent {
  public readonly categories = REPUTATION_CATEGORIES;

  public reputation = computed(() => gamestate().world.reputation);

  public getPoints(type: ReputationType): number {
    return this.reputation()[type];
  }

  public getLevel(type: ReputationType): ReputationLevel {
    return getReputationLevel(this.getPoints(type));
  }

  public getLevelLabel(type: ReputationType): string {
    return getReputationLevelLabel(this.getLevel(type));
  }

  public getProgressPercent(type: ReputationType): number {
    const points = this.getPoints(type);
    const level = this.getLevel(type);

    // Legendary is maxed
    if (level === 'legendary') {
      return 100;
    }

    const currentThreshold = REPUTATION_THRESHOLDS[level];
    const nextThreshold = this.getNextThreshold(level);

    const progress =
      ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  public isLegendary(type: ReputationType): boolean {
    return this.getLevel(type) === 'legendary';
  }

  private getNextThreshold(level: ReputationLevel): number {
    const thresholds: Record<ReputationLevel, number> = {
      none: REPUTATION_THRESHOLDS.low,
      low: REPUTATION_THRESHOLDS.medium,
      medium: REPUTATION_THRESHOLDS.high,
      high: REPUTATION_THRESHOLDS.legendary,
      legendary: REPUTATION_THRESHOLDS.legendary,
    };
    return thresholds[level];
  }
}
