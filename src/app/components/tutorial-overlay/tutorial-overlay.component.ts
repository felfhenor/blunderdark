import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  tutorialBack,
  tutorialCurrentStep,
  tutorialIsActive,
  tutorialNext,
  tutorialSkip,
  tutorialStepIndex,
  tutorialTotalSteps,
} from '@helpers/tutorial';
import type { TutorialTooltipPosition } from '@interfaces';

const TOOLTIP_W = 360;
const TOOLTIP_H_EST = 180;
const GAP = 16;
const PAD = 8;
const VIEWPORT_MARGIN = 12;

@Component({
  selector: 'app-tutorial-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(window:resize)': 'measureTarget()',
  },
  styles: `
    .tutorial-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      pointer-events: auto;
    }

    .tutorial-backdrop-full {
      background: rgba(0, 0, 0, 0.75);
    }

    .tutorial-spotlight {
      position: absolute;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75);
      border-radius: 8px;
      transition: top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease;
      pointer-events: none;
    }

    .tutorial-tooltip {
      position: fixed;
      width: 360px;
      z-index: 1001;
      transition: top 200ms ease, left 200ms ease, opacity 200ms ease;
      pointer-events: auto;
    }
  `,
  template: `
    @if (isActive()) {
      <div
        class="tutorial-backdrop"
        [class.tutorial-backdrop-full]="useFullBackdrop()"
        (click)="$event.stopPropagation()"
      >
        @if (!useFullBackdrop()) {
          <div
            class="tutorial-spotlight"
            [style.top.px]="spotlightRect().top"
            [style.left.px]="spotlightRect().left"
            [style.width.px]="spotlightRect().width"
            [style.height.px]="spotlightRect().height"
          ></div>
        }
      </div>

      <div
        class="tutorial-tooltip bg-base-200 border border-primary shadow-xl rounded-xl p-4"
        [style.top.px]="tooltipPos().top"
        [style.left.px]="tooltipPos().left"
        (click)="$event.stopPropagation()"
      >
        <h3 class="text-lg font-bold mb-2">{{ currentStep()?.title }}</h3>
        <p class="text-sm mb-4">{{ currentStep()?.description }}</p>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="text-xs opacity-60">
              Step {{ stepIndex() + 1 }} of {{ totalSteps }}
            </span>
            <button class="btn btn-ghost btn-xs" (click)="skip()">
              Skip
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-ghost btn-sm"
              [class.invisible]="stepIndex() === 0"
              (click)="back()"
            >
              Back
            </button>
            <button class="btn btn-primary btn-sm" (click)="next()">
              {{ isLastStep() ? 'Finish' : 'Next' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class TutorialOverlayComponent {
  public isActive = tutorialIsActive;
  public currentStep = tutorialCurrentStep;
  public stepIndex = tutorialStepIndex;
  public totalSteps = tutorialTotalSteps;
  public isLastStep = computed(
    () => tutorialStepIndex() === tutorialTotalSteps - 1,
  );

  public targetRect = signal({ top: 0, left: 0, width: 0, height: 0 });

  public useFullBackdrop = computed(() => {
    const r = this.targetRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return r.width * r.height > vw * vh * 0.5;
  });

  public spotlightRect = computed(() => {
    const r = this.targetRect();
    return {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
  });

  public tooltipPos = computed(() => {
    const r = this.targetRect();
    const step = tutorialCurrentStep();
    const pos: TutorialTooltipPosition = step?.tooltipPosition ?? 'bottom';
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // For large targets (full backdrop mode), center the tooltip
    if (this.useFullBackdrop()) {
      return {
        top: Math.max(VIEWPORT_MARGIN, (vh - TOOLTIP_H_EST) / 2),
        left: Math.max(VIEWPORT_MARGIN, (vw - TOOLTIP_W) / 2),
      };
    }

    let top: number;
    let left: number;

    switch (pos) {
      case 'bottom':
        top = r.top + r.height + GAP;
        left = r.left + r.width / 2 - TOOLTIP_W / 2;
        break;
      case 'top':
        top = r.top - GAP - TOOLTIP_H_EST;
        left = r.left + r.width / 2 - TOOLTIP_W / 2;
        break;
      case 'right':
        top = r.top;
        left = r.left + r.width + GAP;
        break;
      case 'left':
        top = r.top;
        left = r.left - TOOLTIP_W - GAP;
        break;
    }

    // Clamp to viewport
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - TOOLTIP_W - VIEWPORT_MARGIN));
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - TOOLTIP_H_EST - VIEWPORT_MARGIN));

    return { top, left };
  });

  constructor() {
    afterRenderEffect(() => {
      const step = tutorialCurrentStep();
      if (!step) return;
      this.measureTarget();
    });
  }

  public measureTarget(): void {
    const step = tutorialCurrentStep();
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.targetRect.set({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }

  public back(): void {
    tutorialBack();
  }

  public next(): void {
    tutorialNext();
  }

  public skip(): void {
    tutorialSkip();
  }

  public onKeydown(event: KeyboardEvent): void {
    if (!tutorialIsActive()) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.next();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.skip();
    }
  }
}
