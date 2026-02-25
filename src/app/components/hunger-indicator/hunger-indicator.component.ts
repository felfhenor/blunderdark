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
  host: {
    class: 'inline-block relative',
  },
  template: `
    @if (shouldShow()) {
      <span
        class="inline-flex items-center px-1 rounded leading-3.5 whitespace-nowrap cursor-default text-xs font-bold"
        [class.bg-warning]="hungerState() === 'hungry'"
        [class.text-warning-content]="hungerState() === 'hungry'"
        [class.bg-error]="hungerState() === 'starving'"
        [class.text-error-content]="hungerState() === 'starving'"
        [class.bg-neutral]="isInappetent()"
        [class.text-neutral-content]="isInappetent()"
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
    return contentGetEntry<InhabitantContent>(inh.definitionId);
  });

  public isInappetent = computed(() => {
    const def = this.definition();
    return def ? hungerIsInappetent(def.foodConsumptionRate ?? 0) : false;
  });

  public hungerState = computed(() => this.inhabitant()?.state ?? 'normal');

  public shouldShow = computed(() => {
    const state = this.hungerState();
    return state === 'hungry' || state === 'starving';
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
