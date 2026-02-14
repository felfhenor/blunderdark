import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  elevatorRemovalExecute,
  elevatorRemovalGetInfo,
  elevatorExtendExecute,
  elevatorValidateExtension,
  elevatorShrinkExecute,
  floorCurrent,
  gridDeselectTile,
  gridSelectedTile,
  notifyError,
  notifySuccess,
} from '@helpers';
import { gamestate } from '@helpers/state-game';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-panel-elevator-info',
  imports: [SweetAlert2Module],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (selectedElevator(); as info) {
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4">
          <h3 class="card-title text-sm">Elevator</h3>

          <div class="text-xs opacity-70">
            Connects Floors {{ info.connectedFloors.join(', ') }}
          </div>

          <div class="flex items-center gap-2 mt-1">
            <span class="text-lg">&#8661;</span>
            <span class="text-xs opacity-60">{{ info.connectedFloors.length }} floors, 2x faster than stairs</span>
          </div>

          @if (info.canExtendUp || info.canExtendDown) {
            <div class="divider my-1"></div>
            <div class="flex gap-1">
              @if (info.canExtendUp) {
                <button
                  class="btn btn-xs btn-info btn-outline flex-1"
                  (click)="onExtend('up')"
                >
                  Extend Up
                </button>
              }
              @if (info.canExtendDown) {
                <button
                  class="btn btn-xs btn-info btn-outline flex-1"
                  (click)="onExtend('down')"
                >
                  Extend Down
                </button>
              }
            </div>
            <div class="text-xs opacity-60 text-center">25 Crystals + 10 Flux per floor</div>
          }

          @if (info.connectedFloors.length > 2) {
            <div class="flex gap-1 mt-1">
              <button
                class="btn btn-xs btn-warning btn-outline flex-1"
                (click)="onShrink(info.connectedFloors[0])"
              >
                Shrink Top (F{{ info.connectedFloors[0] }})
              </button>
              <button
                class="btn btn-xs btn-warning btn-outline flex-1"
                (click)="onShrink(info.connectedFloors[info.connectedFloors.length - 1])"
              >
                Shrink Bottom (F{{ info.connectedFloors[info.connectedFloors.length - 1] }})
              </button>
            </div>
          }

          <div class="divider my-1"></div>

          <button
            class="btn btn-sm btn-error btn-outline w-full"
            [disabled]="!info.canRemove"
            [swal]="removeElevatorSwal"
          >
            Remove Elevator
          </button>
          @if (!info.canRemove && info.reason) {
            <div class="text-xs text-warning mt-1">{{ info.reason }}</div>
          }

          <swal
            #removeElevatorSwal
            title="Remove Elevator?"
            [text]="'Refund: ' + info.refundCrystals + ' Crystals + ' + info.refundFlux + ' Flux'"
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
export class PanelElevatorInfoComponent {
  public selectedElevator = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile || gridTile.occupiedBy !== 'elevator' || !gridTile.elevatorId) {
      return undefined;
    }

    const state = gamestate();
    const elevator = state.world.elevators.find((e) => e.id === gridTile.elevatorId);
    if (!elevator) return undefined;

    const removalInfo = elevatorRemovalGetInfo(elevator.id);
    const canExtendUp = elevatorValidateExtension(state.world.floors, elevator, 'up').valid;
    const canExtendDown = elevatorValidateExtension(state.world.floors, elevator, 'down').valid;

    return {
      elevatorId: elevator.id,
      connectedFloors: [...elevator.connectedFloors].sort((a, b) => a - b),
      canRemove: removalInfo.canRemove,
      reason: removalInfo.reason,
      refundCrystals: removalInfo.refundCrystals,
      refundFlux: removalInfo.refundFlux,
      canExtendUp,
      canExtendDown,
    };
  });

  public async onExtend(direction: 'up' | 'down'): Promise<void> {
    const info = this.selectedElevator();
    if (!info) return;

    const result = await elevatorExtendExecute(info.elevatorId, direction);
    if (result.success) {
      notifySuccess('Elevator extended');
    } else {
      notifyError(result.error ?? 'Failed to extend elevator');
    }
  }

  public async onShrink(floorDepth: number): Promise<void> {
    const info = this.selectedElevator();
    if (!info) return;

    const result = await elevatorShrinkExecute(info.elevatorId, floorDepth);
    if (result.success) {
      notifySuccess('Elevator shrunk');
    } else {
      notifyError(result.error ?? 'Failed to shrink elevator');
    }
  }

  public async onConfirmRemove(): Promise<void> {
    const info = this.selectedElevator();
    if (!info) return;

    const result = await elevatorRemovalExecute(info.elevatorId);
    if (result.success) {
      notifySuccess('Elevator removed');
      gridDeselectTile();
    } else {
      notifyError(result.error ?? 'Failed to remove elevator');
    }
  }
}
