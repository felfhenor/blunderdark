import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  portalRemovalExecute,
  portalRemovalGetInfo,
  floorCurrent,
  gridDeselectTile,
  gridSelectedTile,
  notifyError,
  notifySuccess,
} from '@helpers';
import { gamestate } from '@helpers/state-game';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-panel-portal-info',
  imports: [SweetAlert2Module],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (selectedPortal(); as info) {
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4">
          <h3 class="card-title text-sm">Portal</h3>

          <div class="text-xs opacity-70">
            Connects Floor {{ info.floorDepthA }} to Floor {{ info.floorDepthB }}
          </div>

          <div class="flex items-center gap-2 mt-1">
            <span class="text-lg">&#10022;</span>
            <span class="text-xs opacity-60">Instant travel (0 travel time)</span>
          </div>

          <div class="text-xs opacity-50 mt-1">
            Position A: ({{ info.positionA.x }}, {{ info.positionA.y }}) on F{{ info.floorDepthA }}
          </div>
          <div class="text-xs opacity-50">
            Position B: ({{ info.positionB.x }}, {{ info.positionB.y }}) on F{{ info.floorDepthB }}
          </div>

          <div class="divider my-1"></div>

          <button
            class="btn btn-sm btn-error btn-outline w-full"
            [disabled]="!info.canRemove"
            [swal]="removePortalSwal"
          >
            Remove Portal
          </button>
          @if (!info.canRemove && info.reason) {
            <div class="text-xs text-warning mt-1">{{ info.reason }}</div>
          }

          <swal
            #removePortalSwal
            title="Remove Portal?"
            [text]="'Refund: ' + info.refundFlux + ' Flux + ' + info.refundEssence + ' Essence'"
            icon="warning"
            confirmButtonText="Yes, remove"
            cancelButtonText="Cancel"
            [showCancelButton]="true"
            (confirm)="onConfirmRemove()"
          ></swal>
        </div>
      </div>
    }
  `,
})
export class PanelPortalInfoComponent {
  public selectedPortal = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile || gridTile.occupiedBy !== 'portal' || !gridTile.portalId) {
      return undefined;
    }

    const state = gamestate();
    const portal = state.world.portals.find((p) => p.id === gridTile.portalId);
    if (!portal) return undefined;

    const removalInfo = portalRemovalGetInfo(portal.id);

    return {
      portalId: portal.id,
      floorDepthA: portal.floorDepthA,
      floorDepthB: portal.floorDepthB,
      positionA: portal.positionA,
      positionB: portal.positionB,
      canRemove: removalInfo.canRemove,
      reason: removalInfo.reason,
      refundFlux: removalInfo.refundFlux,
      refundEssence: removalInfo.refundEssence,
    };
  });

  public async onConfirmRemove(): Promise<void> {
    const info = this.selectedPortal();
    if (!info) return;

    const result = await portalRemovalExecute(info.portalId);
    if (result.success) {
      notifySuccess('Portal removed');
      gridDeselectTile();
    } else {
      notifyError(result.error ?? 'Failed to remove portal');
    }
  }
}
