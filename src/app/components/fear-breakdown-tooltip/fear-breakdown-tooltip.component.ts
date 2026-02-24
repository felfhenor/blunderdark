import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { FearLevelBreakdown } from '@interfaces';

@Component({
  selector: 'app-fear-breakdown-tooltip',
  imports: [DecimalPipe],
  template: `
    <div class="text-xs opacity-70">
      Base: {{ breakdown().baseFear | number: '1.0-2' }}
    </div>
    @if (breakdown().inhabitantModifier !== 0) {
      <div
        class="text-xs"
        [class.text-error]="breakdown().inhabitantModifier > 0"
        [class.text-success]="breakdown().inhabitantModifier < 0"
      >
        Inhabitants: {{ breakdown().inhabitantModifier > 0 ? '+' : ''
        }}{{ breakdown().inhabitantModifier | number: '1.0-2' }}
      </div>
    }
    @if (breakdown().upgradeAdjustment !== 0) {
      <div
        class="text-xs"
        [class.text-error]="breakdown().upgradeAdjustment > 0"
        [class.text-success]="breakdown().upgradeAdjustment < 0"
      >
        Upgrades: {{ breakdown().upgradeAdjustment > 0 ? '+' : ''
        }}{{ breakdown().upgradeAdjustment | number: '1.0-2' }}
      </div>
    }
    @if (breakdown().altarAuraReduction !== 0) {
      <div class="text-xs text-success">
        Altar Aura: -{{ breakdown().altarAuraReduction | number: '1.0-2' }}
      </div>
    }
    @if (breakdown().researchReduction !== 0) {
      <div class="text-xs text-success">
        Research: -{{ breakdown().researchReduction | number: '1.0-2' }}
      </div>
    }
    @if (breakdown().propagatedFear !== 0) {
      <div class="text-xs text-error">
        Adjacent: +{{ breakdown().propagatedFear | number: '1.0-2' }}
      </div>
      @for (
        source of breakdown().propagationSources;
        track source.sourceRoomId
      ) {
        <div class="text-xs opacity-70 ml-2">
          +{{ source.amount | number: '1.0-2' }} from
          {{ source.sourceRoomName }}
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FearBreakdownTooltipComponent {
  public breakdown = input.required<FearLevelBreakdown>();
}
