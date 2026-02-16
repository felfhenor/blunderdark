import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  gamestate,
  contentGetEntry,
  hungerIsInappetent,
  hungerGetConsumptionRate,
} from '@helpers';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-hunger-indicator',
  imports: [TippyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shouldShow()) {
      <span
        class="hunger-badge"
        [class]="hungerClass()"
        [tp]="hungerTip"
        [tpDelay]="250"
      >
        {{ hungerLabel() }}
      </span>

      <ng-template #hungerTip>
        @if (isInappetent()) {
          <div class="text-xs opacity-70">Does not eat.</div>
        } @else {
          <div class="font-semibold text-xs mb-1">{{ hungerLabel() }}</div>
          <div class="text-xs opacity-70">
            Consumes {{ consumptionRatePerHour().toFixed(1) }} Food/hr
          </div>
          <div class="divider my-0.5 h-0"></div>
          <div class="text-xs opacity-60">{{ hungerEffect() }}</div>
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

      .hunger-badge {
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

      .hunger-normal {
        display: none;
      }

      .hunger-hungry {
        background-color: oklch(var(--wa));
        color: oklch(var(--wac, 0.9 0.05 80));
      }

      .hunger-starving {
        background-color: oklch(var(--er));
        color: oklch(var(--erc, 0.9 0.05 25));
      }

      .hunger-inappetent {
        background-color: oklch(var(--n));
        color: oklch(var(--nc));
      }
    `,
  ],
})
export class HungerIndicatorComponent {
  public inhabitantId = input.required<string>();

  private inhabitant = computed(() => {
    return gamestate().world.inhabitants.find(
      (i) => i.instanceId === this.inhabitantId(),
    );
  });

  private definition = computed(() => {
    const inh = this.inhabitant();
    if (!inh) return undefined;
    return contentGetEntry<InhabitantContent>(
      inh.definitionId,
    );
  });

  public isInappetent = computed(() => {
    const def = this.definition();
    return def ? hungerIsInappetent(def.foodConsumptionRate ?? 0) : false;
  });

  public hungerState = computed(
    () => this.inhabitant()?.state ?? 'normal',
  );

  public shouldShow = computed(() => {
    const state = this.hungerState();
    return (
      state === 'hungry' || state === 'starving' || this.isInappetent()
    );
  });

  public hungerLabel = computed(() => {
    if (this.isInappetent()) return 'N/A';
    switch (this.hungerState()) {
      case 'hungry':
        return 'Hungry';
      case 'starving':
        return 'Starving';
      default:
        return 'Fed';
    }
  });

  public hungerClass = computed(() => {
    if (this.isInappetent()) return 'hunger-inappetent';
    switch (this.hungerState()) {
      case 'hungry':
        return 'hunger-hungry';
      case 'starving':
        return 'hunger-starving';
      default:
        return 'hunger-normal';
    }
  });

  public hungerEffect = computed(() => {
    switch (this.hungerState()) {
      case 'hungry':
        return 'Hungry: -50% production';
      case 'starving':
        return 'Starving: -90% production, -50% food consumption';
      default:
        return '';
    }
  });

  public consumptionRatePerHour = computed(() => {
    const inh = this.inhabitant();
    if (!inh) return 0;
    return hungerGetConsumptionRate(inh.definitionId);
  });
}
