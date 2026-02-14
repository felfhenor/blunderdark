import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  floorCurrent,
  gridDeselectTile,
  gridSelectedTile,
  notifyError,
  notifySuccess,
  stairRemovalExecute,
  stairRemovalGetInfo,
  STAIR_REMOVAL_REFUND,
} from '@helpers';
import { gamestate } from '@helpers/state-game';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-panel-stair-info',
  imports: [SweetAlert2Module],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (selectedStair(); as info) {
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4">
          <h3 class="card-title text-sm">Stairs</h3>

          <div class="text-xs opacity-70">
            Connects Floor {{ info.floorDepthA }} to Floor {{ info.floorDepthB }}
          </div>

          <div class="flex items-center gap-2 mt-1">
            <span class="text-lg">{{ info.direction === 'up' ? '&#9650;' : '&#9660;' }}</span>
            <span class="text-xs opacity-60">{{ info.direction === 'up' ? 'Goes up' : 'Goes down' }}</span>
          </div>

          <div class="divider my-1"></div>

          <button
            class="btn btn-sm btn-error btn-outline w-full"
            [disabled]="!info.canRemove"
            [swal]="removeStairSwal"
          >
            Remove Stairs
          </button>
          @if (!info.canRemove && info.reason) {
            <div class="text-xs text-warning mt-1">{{ info.reason }}</div>
          }

          <swal
            #removeStairSwal
            title="Remove Stairs?"
            [text]="'Refund: ' + refund + ' Crystals'"
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
export class PanelStairInfoComponent {
  public refund = STAIR_REMOVAL_REFUND;

  public selectedStair = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile || gridTile.occupiedBy !== 'stair' || !gridTile.stairId) {
      return undefined;
    }

    const state = gamestate();
    const stair = state.world.stairs.find((s) => s.id === gridTile.stairId);
    if (!stair) return undefined;

    const direction = stair.floorDepthA === floor.depth ? 'down' : 'up';
    const removalInfo = stairRemovalGetInfo(stair.id);

    return {
      stairId: stair.id,
      floorDepthA: stair.floorDepthA,
      floorDepthB: stair.floorDepthB,
      direction,
      canRemove: removalInfo.canRemove,
      reason: removalInfo.reason,
    };
  });

  public async onConfirmRemove(): Promise<void> {
    const info = this.selectedStair();
    if (!info) return;

    const result = await stairRemovalExecute(info.stairId);
    if (result.success) {
      notifySuccess('Stairs removed');
      gridDeselectTile();
    } else {
      notifyError(result.error ?? 'Failed to remove stairs');
    }
  }
}
