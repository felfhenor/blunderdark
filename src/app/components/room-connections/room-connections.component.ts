import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { ButtonCloseComponent } from '@components/button-close/button-close.component';
import type { PlacedRoomId } from '@interfaces/room-shape';

@Component({
  selector: 'app-room-connections',
  imports: [ButtonCloseComponent, SFXDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (connectTo().length > 0) {
      <div class="divider my-2 text-xs opacity-60">Connect to</div>
      <div class="flex flex-col gap-2">
        @for (adj of connectTo(); track adj.id) {
          <button
            class="btn btn-xs btn-outline btn-success"
            appSfx="ui-click"
            (click)="connect.emit(adj.id)"
          >
            {{ adj.name }}
          </button>
        }
      </div>
    }

    @if (connections().length > 0) {
      <div class="divider my-2 text-xs opacity-60">Connected</div>
      <div class="flex flex-col gap-2">
        @for (conn of connections(); track conn.connectionId) {
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs">{{ conn.name }}</span>
            <app-button-close
              class="text-error"
              (click)="disconnect.emit(conn.connectionId)"
            ></app-button-close>
          </div>
        }
      </div>
    }

    @if (connectTo().length === 0 && connections().length === 0) {
      <p class="text-xs opacity-50 mt-1">No adjacent rooms to connect.</p>
    }
  `,
})
export class RoomConnectionsComponent {
  public connectTo =
    input.required<readonly { id: PlacedRoomId; name: string }[]>();
  public connections =
    input.required<readonly { connectionId: string; name: string }[]>();

  public connect = output<PlacedRoomId>();
  public disconnect = output<string>();
}
