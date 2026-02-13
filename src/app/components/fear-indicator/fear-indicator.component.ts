import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import {
  fearLevelBreakdownMap,
  fearLevelGetLabel,
} from '@helpers';
import type { FearLevelBreakdown } from '@helpers/fear-level';

const TOOLTIP_DELAY_MS = 250;

@Component({
  selector: 'app-fear-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fearLevel() > 0) {
      <span
        class="fear-badge"
        [class]="fearClass()"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
      >
        {{ fearLabel() }}
      </span>
      @if (showTooltip()) {
        <div class="fear-tooltip">
          @if (breakdown(); as b) {
            <div class="font-semibold text-xs mb-1">
              Fear: {{ fearLabel() }} ({{ b.effectiveFear }})
            </div>
            <div class="text-[10px] opacity-70">Base: {{ b.baseFear }}</div>
            @if (b.inhabitantModifier !== 0) {
              <div
                class="text-[10px]"
                [class.text-error]="b.inhabitantModifier > 0"
                [class.text-success]="b.inhabitantModifier < 0"
              >
                Inhabitants: {{ b.inhabitantModifier > 0 ? '+' : ''
                }}{{ b.inhabitantModifier }}
              </div>
            }
            @if (b.upgradeAdjustment !== 0) {
              <div
                class="text-[10px]"
                [class.text-error]="b.upgradeAdjustment > 0"
                [class.text-success]="b.upgradeAdjustment < 0"
              >
                Upgrades: {{ b.upgradeAdjustment > 0 ? '+' : ''
                }}{{ b.upgradeAdjustment }}
              </div>
            }
            @if (b.altarAuraReduction !== 0) {
              <div class="text-[10px] text-success">
                Altar Aura: -{{ b.altarAuraReduction }}
              </div>
            }
            @if (b.propagatedFear !== 0) {
              <div class="text-[10px] text-error">
                Adjacent: +{{ b.propagatedFear }}
              </div>
              @for (source of b.propagationSources; track source.sourceRoomId) {
                <div class="text-[10px] opacity-50 ml-2">
                  +{{ source.amount }} from {{ source.sourceRoomName }}
                </div>
              }
            }
            <div class="divider my-0.5 h-0"></div>
            <div class="text-[10px] opacity-60">{{ fearEffect() }}</div>
          }
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: inline-block;
        position: relative;
      }

      .fear-badge {
        display: inline-flex;
        align-items: center;
        font-size: 9px;
        font-weight: 700;
        padding: 0 3px;
        border-radius: 3px;
        line-height: 14px;
        white-space: nowrap;
        cursor: default;
      }

      .fear-low {
        background-color: oklch(0.45 0.15 145);
        color: oklch(0.9 0.05 145);
      }

      .fear-medium {
        background-color: oklch(0.45 0.15 80);
        color: oklch(0.9 0.05 80);
      }

      .fear-high {
        background-color: oklch(0.45 0.15 40);
        color: oklch(0.9 0.05 40);
      }

      .fear-very-high {
        background-color: oklch(0.4 0.15 25);
        color: oklch(0.9 0.05 25);
      }

      .fear-tooltip {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 50;
        background: oklch(0.2 0.01 260);
        border: 1px solid oklch(0.35 0.02 260);
        border-radius: 6px;
        padding: 8px;
        min-width: 160px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        pointer-events: none;
      }
    `,
  ],
})
export class FearIndicatorComponent {
  public roomId = input.required<string>();

  public breakdown = computed<FearLevelBreakdown | undefined>(() =>
    fearLevelBreakdownMap().get(this.roomId()),
  );

  public fearLevel = computed(() => this.breakdown()?.effectiveFear ?? 0);

  public fearLabel = computed(() => fearLevelGetLabel(this.fearLevel()));

  public fearClass = computed(() => {
    switch (this.fearLevel()) {
      case 1:
        return 'fear-low';
      case 2:
        return 'fear-medium';
      case 3:
        return 'fear-high';
      case 4:
        return 'fear-very-high';
      default:
        return '';
    }
  });

  public fearEffect = computed(() => {
    switch (this.fearLevel()) {
      case 1:
        return 'Low fear: minor unease';
      case 2:
        return 'Medium fear: some inhabitants may be scared';
      case 3:
        return 'High fear: scared inhabitants produce -50%';
      case 4:
        return 'Very High fear: most inhabitants scared';
      default:
        return '';
    }
  });

  public showTooltip = signal(false);
  private tooltipTimer: ReturnType<typeof setTimeout> | undefined;

  public onMouseEnter(): void {
    this.clearTimer();
    this.tooltipTimer = setTimeout(() => {
      this.showTooltip.set(true);
    }, TOOLTIP_DELAY_MS);
  }

  public onMouseLeave(): void {
    this.clearTimer();
    this.showTooltip.set(false);
  }

  private clearTimer(): void {
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
      this.tooltipTimer = undefined;
    }
  }
}
