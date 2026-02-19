import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
} from '@angular/core';
import { contentGetEntry } from '@helpers/content';
import { formatRealDuration } from '@helpers/game-time';
import {
  RESEARCH_BASE_PROGRESS_PER_TICK,
  researchSpeedModifier,
} from '@helpers/research-progress';
import { gamestate } from '@helpers/state-game';
import type { ResearchContent } from '@interfaces';

@Component({
  selector: 'app-panel-research-summary',
  imports: [DecimalPipe],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-4 gap-2">
        <div class="flex items-center justify-between">
          <h3 class="card-title text-sm">Research</h3>
          <button class="btn btn-xs btn-outline" (click)="openResearch.emit()">
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
            {{ progressPercent() | number: '1.0-0' }}% &middot;
            {{ timeRemaining() }}
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
  public openResearch = output<void>();

  public activeNode = computed(() => {
    const activeId = gamestate().world.research.activeResearch;
    if (!activeId) return undefined;
    return contentGetEntry<ResearchContent>(activeId);
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
    const ticksRemaining =
      remaining / (RESEARCH_BASE_PROGRESS_PER_TICK * speed);
    return formatRealDuration(ticksRemaining);
  });
}
