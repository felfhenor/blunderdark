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
  imports: [TippyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-block relative',
  },
  template: `
    @if (fearLevel() > 0) {
      <span
        class="inline-flex items-center px-1 rounded leading-3.5 whitespace-nowrap cursor-default text-xs font-bold"
        [class.bg-success]="fearLevel() === 1"
        [class.text-success-content]="fearLevel() === 1"
        [class.bg-warning]="fearLevel() === 2"
        [class.text-warning-content]="fearLevel() === 2"
        [class.fear-high]="fearLevel() === 3"
        [class.bg-error]="fearLevel() === 4"
        [class.text-error-content]="fearLevel() === 4"
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
      .fear-high {
        background-color: oklch(0.45 0.15 40);
        color: oklch(0.9 0.05 40);
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
