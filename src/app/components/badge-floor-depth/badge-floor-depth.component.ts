import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { floorAll, floorCurrent } from '@helpers';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-badge-floor-depth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TippyDirective],
  template: `
    <span
      class="badge badge-info badge-soft badge-outline px-1.5 whitespace-nowrap text-info text-xs font-semibold"
      tp="Current Floor / Total Floors"
      tpPlacement="bottom"
    >
      Floor {{ currentFloorDepth() }}/{{ totalFloors() }}
    </span>
  `,
})
export class BadgeFloorDepthComponent {
  public currentFloorDepth = computed(() => floorCurrent()?.depth ?? 1);
  public totalFloors = computed(() => floorAll().length);
}
