import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  fearLevelBreakdownMap,
  fearLevelGetLabel,
} from '@helpers';
import type { FearLevelBreakdown } from '@helpers/fear-level';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-fear-indicator',
  imports: [TippyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fearLevel() > 0) {
      <span
        class="fear-badge"
        [class]="fearClass()"
        [tp]="fearTip"
        [tpDelay]="250"
        [tpClassName]="'game-tooltip'"
      >
        {{ fearLabel() }}
      </span>

      <ng-template #fearTip>
        @if (breakdown(); as b) {
          <div style="font-weight:600;font-size:12px;margin-bottom:4px">
            Fear: {{ fearLabel() }} ({{ b.effectiveFear }})
          </div>
          <div style="font-size:10px;opacity:0.7">Base: {{ b.baseFear }}</div>
          @if (b.inhabitantModifier !== 0) {
            <div
              style="font-size:10px"
              [class]="b.inhabitantModifier > 0 ? 'text-error' : 'text-success'"
            >
              Inhabitants: {{ b.inhabitantModifier > 0 ? '+' : '' }}{{ b.inhabitantModifier }}
            </div>
          }
          @if (b.upgradeAdjustment !== 0) {
            <div
              style="font-size:10px"
              [class]="b.upgradeAdjustment > 0 ? 'text-error' : 'text-success'"
            >
              Upgrades: {{ b.upgradeAdjustment > 0 ? '+' : '' }}{{ b.upgradeAdjustment }}
            </div>
          }
          @if (b.altarAuraReduction !== 0) {
            <div class="text-success" style="font-size:10px">
              Altar Aura: -{{ b.altarAuraReduction }}
            </div>
          }
          @if (b.propagatedFear !== 0) {
            <div class="text-error" style="font-size:10px">
              Adjacent: +{{ b.propagatedFear }}
            </div>
            @for (source of b.propagationSources; track source.sourceRoomName) {
              <div style="font-size:10px;opacity:0.5;margin-left:8px">
                +{{ source.amount }} from {{ source.sourceRoomName }}
              </div>
            }
          }
          <hr class="fear-divider">
          <div style="font-size:10px;opacity:0.6">{{ fearEffect() }}</div>
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
        background-color: oklch(var(--su));
        color: oklch(var(--suc, 0.9 0.05 145));
      }

      .fear-medium {
        background-color: oklch(var(--wa));
        color: oklch(var(--wac, 0.9 0.05 80));
      }

      .fear-high {
        background-color: oklch(0.45 0.15 40);
        color: oklch(0.9 0.05 40);
      }

      .fear-very-high {
        background-color: oklch(var(--er));
        color: oklch(var(--erc, 0.9 0.05 25));
      }

      .fear-divider {
        border-color: oklch(var(--bc) / 0.2);
        margin: 4px 0;
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
}
