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
  host: {
    class: 'inline-block relative',
  },
  template: `
    @if (fearLevel() > 0) {
      <span
        class="inline-flex items-center px-1 rounded leading-3.5 whitespace-nowrap cursor-default text-xs font-bold"
        [ngClass]="fearClass()"
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
              [class.text-error]="b.inhabitantModifier > 0"
              [class.text-success]="b.inhabitantModifier <= 0"
            >
              Inhabitants: {{ b.inhabitantModifier > 0 ? '+' : ''
              }}{{ b.inhabitantModifier }}
            </div>
          }
          @if (b.upgradeAdjustment !== 0) {
            <div
              class="text-xs"
              [class.text-error]="b.upgradeAdjustment > 0"
              [class.text-success]="b.upgradeAdjustment <= 0"
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
          <hr class="my-1 border-base-content/20" />
          <div class="text-xs opacity-60">{{ fearEffect() }}</div>
        }
      </ng-template>
    }
  `,
  styles: [
    `
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
