import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import {
  dayNightFormatMultiplier,
  dayNightGetAllActiveModifiers,
  dayNightGetPhaseLabel,
  gamestate,
  gameTimeFormatted,
} from '@helpers';
import type {
  DayNightCreatureModifier,
  DayNightResourceModifier,
} from '@interfaces/day-night';

@Component({
  selector: 'app-panel-time-of-day',
  imports: [CurrencyNameComponent],
  template: `
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-4 gap-2">
        <div class="flex items-center justify-between">
          <h3 class="card-title text-sm">Time of Day</h3>
          <span class="badge badge-sm" [class]="phaseBadgeClass()">
            {{ phaseLabel() }}
          </span>
        </div>

        <div class="text-xs opacity-70 font-mono">{{ time() }}</div>

        @if (hasModifiers()) {
          <div class="flex flex-col gap-1 mt-1">
            @for (mod of modifiers().resourceModifiers; track mod.resourceType + mod.phase) {
              <div class="flex items-center justify-between text-xs">
                <span class="opacity-70"><app-currency-name [type]="$any(mod.resourceType)" /></span>
                <span
                  class="font-semibold"
                  [class.text-success]="isPositive(mod)"
                  [class.text-error]="!isPositive(mod)"
                >
                  {{ format(mod) }}
                </span>
              </div>
            }
            @for (mod of modifiers().creatureModifiers; track mod.creatureType + mod.phase) {
              <div class="flex items-center justify-between text-xs">
                <span class="opacity-70 capitalize">{{ mod.creatureType }}</span>
                <span
                  class="font-semibold"
                  [class.text-success]="isPositive(mod)"
                  [class.text-error]="!isPositive(mod)"
                >
                  {{ format(mod) }}
                </span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelTimeOfDayComponent {
  public time = gameTimeFormatted;

  public modifiers = computed(() => {
    const hour = gamestate().clock.hour;
    return dayNightGetAllActiveModifiers(hour);
  });

  public phaseLabel = computed(() => dayNightGetPhaseLabel(this.modifiers().phase));

  public phaseBadgeClass = computed(() => {
    switch (this.modifiers().phase) {
      case 'day':
        return 'badge-warning';
      case 'night':
        return 'badge-neutral';
      case 'dawn':
        return 'badge-info';
      case 'dusk':
        return 'badge-secondary';
    }
  });

  public hasModifiers = computed(
    () =>
      this.modifiers().resourceModifiers.length > 0 ||
      this.modifiers().creatureModifiers.length > 0,
  );

  public format(mod: DayNightResourceModifier | DayNightCreatureModifier): string {
    return dayNightFormatMultiplier(mod.multiplier);
  }

  public isPositive(mod: DayNightResourceModifier | DayNightCreatureModifier): boolean {
    return mod.multiplier > 1.0;
  }
}
