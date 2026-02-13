import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import {
  RESEARCH_BASE_PROGRESS_PER_TICK,
  researchSpeedModifier,
} from '@helpers/research-progress';
import { gamestate } from '@helpers/state-game';
import type { IsContentItem, ResearchNode } from '@interfaces';

@Component({
  selector: 'app-panel-research-summary',
  imports: [DecimalPipe],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-4 gap-2">
        <div class="flex items-center justify-between">
          <h3 class="card-title text-sm">Research</h3>
          <button class="btn btn-xs btn-outline" (click)="openResearch()">
            Open
          </button>
        </div>

        @if (activeNode(); as active) {
          <div class="text-xs">{{ active.name }}</div>
          <progress
            class="progress progress-info w-full"
            [value]="progressPercent()"
            max="100"
          ></progress>
          <div class="text-xs opacity-70">
            {{ progressPercent() | number:'1.0-0' }}% &middot; {{ timeRemaining() }}
          </div>
        } @else {
          <div class="text-xs opacity-50">No active research</div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelResearchSummaryComponent {
  private router = inject(Router);

  public activeNode = computed(() => {
    const activeId = gamestate().world.research.activeResearch;
    if (!activeId) return undefined;
    return contentGetEntry<ResearchNode & IsContentItem>(activeId);
  });

  public progressPercent = computed(() => {
    const active = this.activeNode();
    if (!active) return 0;
    const progress = gamestate().world.research.activeResearchProgress;
    return Math.min(100, (progress / active.requiredTicks) * 100);
  });

  public timeRemaining = computed(() => {
    const active = this.activeNode();
    if (!active) return '';
    const progress = gamestate().world.research.activeResearchProgress;
    const remaining = active.requiredTicks - progress;
    if (remaining <= 0) return 'Complete';
    const speed = researchSpeedModifier();
    const ticksRemaining = remaining / (RESEARCH_BASE_PROGRESS_PER_TICK * speed);
    const gameMinutes = ticksRemaining / GAME_TIME_TICKS_PER_MINUTE;
    if (gameMinutes < 1) return '< 1 min';
    if (gameMinutes < 60) return `${Math.ceil(gameMinutes)} min`;
    const hours = Math.floor(gameMinutes / 60);
    const mins = Math.ceil(gameMinutes % 60);
    return `${hours}h ${mins}m`;
  });

  public openResearch(): void {
    this.router.navigate(['/game', 'research']);
  }
}
