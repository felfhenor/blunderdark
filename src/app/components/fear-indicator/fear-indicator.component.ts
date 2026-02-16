import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { fearLevelBreakdownMap, fearLevelGetLabel } from '@helpers';
import type { PlacedRoomId } from '@interfaces';
import type { FearLevelBreakdown } from '@interfaces/fear';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-fear-indicator',
  imports: [TippyDirective, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fearLevel() > 0) {
      <span
        [ngClass]="['fear-badge', fearClass()]"
        [tp]="fearTip"
        [tpDelay]="250"
      >
        {{ fearLabel() }}
      </span>

      <ng-template #fearTip>
        @if (breakdown(); as b) {
          <div class="text-xs font-semibold mb-1">
            Fear: {{ fearLabel() }} ({{ b.effectiveFear }})
          </div>
          <div class="text-xs opacity-70">Base: {{ b.baseFear }}</div>
          @if (b.inhabitantModifier !== 0) {
            <div
              class="text-xs"
              [class]="b.inhabitantModifier > 0 ? 'text-error' : 'text-success'"
            >
              Inhabitants: {{ b.inhabitantModifier > 0 ? '+' : ''
              }}{{ b.inhabitantModifier }}
            </div>
          }
          @if (b.upgradeAdjustment !== 0) {
            <div
              class="text-xs"
              [class]="b.upgradeAdjustment > 0 ? 'text-error' : 'text-success'"
            >
              Upgrades: {{ b.upgradeAdjustment > 0 ? '+' : ''
              }}{{ b.upgradeAdjustment }}
            </div>
          }
          @if (b.altarAuraReduction !== 0) {
            <div class="text-xs text-success">
              Altar Aura: -{{ b.altarAuraReduction }}
            </div>
          }
          @if (b.propagatedFear !== 0) {
            <div class="text-xs text-error">
              Adjacent: +{{ b.propagatedFear }}
            </div>
            @for (source of b.propagationSources; track source.sourceRoomName) {
              <div class="text-xs opacity-50 ml-2">
                +{{ source.amount }} from {{ source.sourceRoomName }}
              </div>
            }
          }
          <hr class="fear-divider" />
          <div class="text-xs opacity-60">{{ fearEffect() }}</div>
        }
      </ng-template>
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
        background-color: var(--color-success);
        color: var(--color-success-content);
      }

      .fear-medium {
        background-color: var(--color-warning);
        color: var(--color-warning-content);
      }

      .fear-high {
        background-color: oklch(0.45 0.15 40);
        color: oklch(0.9 0.05 40);
      }

      .fear-very-high {
        background-color: var(--color-error);
        color: var(--color-error-content);
      }

      .fear-divider {
        border-color: var(--color-base-content / 0.2);
        margin: 4px 0;
      }
    `,
  ],
})
export class FearIndicatorComponent {
  public roomId = input.required<PlacedRoomId>();

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
}
