import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { connectivityGetDisconnectedRoomIds, gamestate } from '@helpers';
import { contentGetEntry } from '@helpers/content';
import type { RoomContent } from '@interfaces/content-room';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-badge-disconnected-rooms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TippyDirective],
  host: {
    '[class.hidden]': 'disconnectedInfo().totalCount === 0',
  },
  template: `
    <span class="disconnected-badge" [tp]="tooltipTpl" tpPlacement="bottom">
      {{ disconnectedInfo().totalCount }} room{{
        disconnectedInfo().totalCount > 1 ? 's' : ''
      }}
      disconnected
    </span>

    <ng-template #tooltipTpl>
      @for (entry of disconnectedInfo().perFloor; track entry.floorName) {
        <strong>{{ entry.floorName }}</strong>
        <ul>
          @for (name of entry.roomNames; track name) {
            <li>{{ name }}</li>
          }
        </ul>

        <br />
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: inline;
    }

    :host.hidden {
      display: none;
    }

    .disconnected-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0 0.375rem;
      border-radius: 0.25rem;
      color: var(--color-error);
      background: color-mix(in oklch, var(--color-error) 15%, transparent);
      border: 1px solid color-mix(in oklch, var(--color-error) 40%, transparent);
      white-space: nowrap;
      animation: disconnected-flash 1.5s ease-in-out infinite;
    }

    @keyframes disconnected-flash {
      50% {
        opacity: 0.4;
      }
    }
  `,
})
export class BadgeDisconnectedRoomsComponent {
  public disconnectedInfo = computed(() => {
    const state = gamestate();
    const floors = state.world.floors;
    let totalCount = 0;
    const perFloor: Array<{ floorName: string; roomNames: string[] }> = [];

    for (const floor of floors) {
      const disconnected = connectivityGetDisconnectedRoomIds(floor, floors);
      if (disconnected.size === 0) continue;
      totalCount += disconnected.size;

      const roomNames: string[] = [];
      for (const room of floor.rooms) {
        if (disconnected.has(room.id)) {
          const def = contentGetEntry<RoomContent>(room.roomTypeId);
          const baseName = def?.name ?? 'Unknown Room';
          roomNames.push(room.suffix ? `${baseName} ${room.suffix}` : baseName);
        }
      }

      perFloor.push({ floorName: floor.name, roomNames });
    }

    return { totalCount, perFloor };
  });
}
