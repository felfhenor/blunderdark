import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { floorAll, floorCurrent } from '@helpers';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-badge-floor-depth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TippyDirective],
  template: `
    <span
      class="badge-floor-depth px-1.5 rounded whitespace-nowrap text-info text-xs font-semibold"
      tp="Current Floor / Total Floors"
      tpPlacement="bottom"
    >
      Floor {{ currentFloorDepth() }}/{{ totalFloors() }}
    </span>
  `,
  styles: `
    .badge-floor-depth {
      background: color-mix(in oklch, var(--color-info) 15%, transparent);
      border: 1px solid color-mix(in oklch, var(--color-info) 40%, transparent);
    }
  `,
})
export class BadgeFloorDepthComponent {
  public currentFloorDepth = computed(() => floorCurrent()?.depth ?? 1);
  public totalFloors = computed(() => floorAll().length);
}
