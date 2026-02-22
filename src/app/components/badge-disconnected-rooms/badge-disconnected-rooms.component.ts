import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { altarRoomFind } from '@helpers/altar-room';
import { connectivityGetDisconnectedRoomIds, gamestate } from '@helpers';
import { contentGetEntry } from '@helpers/content';
import { verticalTransportFloorsAreConnected } from '@helpers/vertical-transport';
import type { RoomContent } from '@interfaces/content-room';
import { TippyDirective } from '@ngneat/helipopper';

type DisconnectedFloorEntry = {
  floorName: string;
  entireFloor: boolean;
  roomCount: number;
  roomNames: string[];
};

@Component({
  selector: 'app-badge-disconnected-rooms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TippyDirective],
  host: {
    '[class.hidden]': 'disconnectedInfo().totalCount === 0',
  },
  template: `
    <span class="disconnected-badge px-1.5 rounded whitespace-nowrap text-error text-xs font-semibold" [tp]="tooltipTpl" tpPlacement="bottom">
      {{ disconnectedInfo().totalCount }} room{{
        disconnectedInfo().totalCount > 1 ? 's' : ''
      }}
      disconnected
    </span>

    <ng-template #tooltipTpl>
      @for (entry of disconnectedInfo().perFloor; track entry.floorName) {
        @if (entry.entireFloor) {
          <strong>{{ entry.floorName }}</strong> disconnected ({{ entry.roomCount }} room{{ entry.roomCount > 1 ? 's' : '' }})
        } @else {
          <strong>{{ entry.floorName }}</strong>
          <ul>
            @for (name of entry.roomNames; track name) {
              <li>{{ name }}</li>
            }
          </ul>
        }

        <br />
      }
    </ng-template>
  `,
  styles: `
    .disconnected-badge {
      background: color-mix(in oklch, var(--color-error) 15%, transparent);
      border: 1px solid color-mix(in oklch, var(--color-error) 40%, transparent);
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
    const altar = altarRoomFind(floors);
    const altarDepth = altar?.floor.depth;
    let totalCount = 0;
    const perFloor: DisconnectedFloorEntry[] = [];

    for (const floor of floors) {
      const disconnected = connectivityGetDisconnectedRoomIds(floor, floors);
      if (disconnected.size === 0) continue;
      totalCount += disconnected.size;

      const noTransport =
        altarDepth === undefined ||
        !verticalTransportFloorsAreConnected(floors, altarDepth, floor.depth);

      if (noTransport) {
        perFloor.push({
          floorName: floor.name,
          entireFloor: true,
          roomCount: disconnected.size,
          roomNames: [],
        });
      } else {
        const roomNames: string[] = [];
        for (const room of floor.rooms) {
          if (disconnected.has(room.id)) {
            const def = contentGetEntry<RoomContent>(room.roomTypeId);
            const baseName = def?.name ?? 'Unknown Room';
            roomNames.push(
              room.suffix ? `${baseName} ${room.suffix}` : baseName,
            );
          }
        }

        perFloor.push({
          floorName: floor.name,
          entireFloor: false,
          roomCount: disconnected.size,
          roomNames,
        });
      }
    }

    return { totalCount, perFloor };
  });
}
