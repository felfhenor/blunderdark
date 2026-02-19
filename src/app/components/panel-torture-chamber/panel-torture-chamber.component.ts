import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ModalComponent } from '@components/modal/modal.component';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import {
  contentGetEntry,
  floorAll,
  floorCurrent,
  gamestate,
  notify,
  roomRoleFindById,
  tortureConversionComplete$,
  tortureExtractionComplete$,
  tortureGetAdjacentRoomTypeIds,
  tortureGetConversionRate,
  tortureGetConversionTicks,
  tortureGetExtractionTicks,
  updateGamestate,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  InvaderClassType,
  PrisonerId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

@Component({
  selector: 'app-panel-torture-chamber',
  imports: [DecimalPipe, ModalComponent, StatNameComponent],
  templateUrl: './panel-torture-chamber.component.html',
  styleUrl: './panel-torture-chamber.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelTortureChamberComponent {
  public showResult = signal(false);
  public lastResult = signal<
    | { type: 'extraction'; prisonerName: string; researchGained: number }
    | { type: 'conversion'; prisonerName: string; success: boolean; inhabitantName?: string }
    | undefined
  >(undefined);

  private subscriptions = [
    tortureExtractionComplete$.subscribe((evt) => {
      this.lastResult.set({
        type: 'extraction',
        prisonerName: evt.prisonerName,
        researchGained: evt.researchGained,
      });
      this.showResult.set(true);
      notify('Torture', `Extracted ${evt.researchGained} research from ${evt.prisonerName}`);
    }),
    tortureConversionComplete$.subscribe((evt) => {
      this.lastResult.set({
        type: 'conversion',
        prisonerName: evt.prisonerName,
        success: evt.success,
        inhabitantName: evt.inhabitantName,
      });
      this.showResult.set(true);
      if (evt.success) {
        notify('Torture', `Converted ${evt.prisonerName} into ${evt.inhabitantName}`);
      } else {
        notify('Torture', `Failed to convert ${evt.prisonerName}`);
      }
    }),
  ];

  public tortureRoom = computed(() => {
    const roleId = roomRoleFindById('tortureChamber');
    if (!roleId) return undefined;

    for (const floor of floorAll()) {
      const room = floor.rooms.find((r) => r.roomTypeId === roleId);
      if (room) return room;
    }

    return undefined;
  });

  public assignedInhabitants = computed(() => {
    const room = this.tortureRoom();
    if (!room) return [];

    const state = gamestate();
    return state.world.inhabitants
      .filter((i) => i.assignedRoomId === room.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(
          i.definitionId,
        );
        return { ...i, defName: def?.name ?? i.name };
      });
  });

  public availablePrisoners = computed(() => {
    const room = this.tortureRoom();
    if (!room || room.tortureJob) return [];

    return gamestate().world.prisoners;
  });

  public tortureProgress = computed(() => {
    const room = this.tortureRoom();
    if (!room?.tortureJob) return undefined;
    const job = room.tortureJob;
    const elapsed = job.targetTicks - job.ticksRemaining;
    const percent = Math.min(100, Math.round((elapsed / job.targetTicks) * 100));
    const prisoner = gamestate().world.prisoners.find((p) => p.id === job.prisonerId);
    return {
      percent,
      prisonerName: prisoner?.name ?? 'Unknown',
      action: job.action,
      ticksRemaining: job.ticksRemaining,
    };
  });

  public canStartJob = computed(() => {
    const room = this.tortureRoom();
    if (!room || room.tortureJob) return false;
    const hasWorker = this.assignedInhabitants().length > 0;
    const hasPrisoners = gamestate().world.prisoners.length > 0;
    return hasWorker && hasPrisoners;
  });

  public getConversionRate(invaderClass: InvaderClassType): number {
    const room = this.tortureRoom();
    if (!room) return 0;
    const floor = floorCurrent();
    const adjacentTypes = floor
      ? tortureGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();
    return Math.round(tortureGetConversionRate(room, adjacentTypes, invaderClass) * 100);
  }

  public getExtractionTime(): number {
    const room = this.tortureRoom();
    if (!room) return 0;
    const floor = floorCurrent();
    const adjacentTypes = floor
      ? tortureGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();
    const ticks = tortureGetExtractionTicks(room, adjacentTypes);
    return ticksToRealSeconds(ticks);
  }

  public getConversionTime(): number {
    const room = this.tortureRoom();
    if (!room) return 0;
    const floor = floorCurrent();
    const adjacentTypes = floor
      ? tortureGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();
    const ticks = tortureGetConversionTicks(room, adjacentTypes);
    return ticksToRealSeconds(ticks);
  }

  public async startExtraction(prisonerId: PrisonerId): Promise<void> {
    const room = this.tortureRoom();
    if (!room) return;

    const floor = floorCurrent();
    const adjacentTypes = floor
      ? tortureGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();
    const targetTicks = tortureGetExtractionTicks(room, adjacentTypes);

    await updateGamestate((state) => {
      for (const flr of state.world.floors) {
        const target = flr.rooms.find((r) => r.id === room.id);
        if (target) {
          target.tortureJob = {
            prisonerId,
            action: 'extract',
            ticksRemaining: targetTicks,
            targetTicks,
          };
          break;
        }
      }
      return state;
    });
  }

  public async startConversion(prisonerId: PrisonerId): Promise<void> {
    const room = this.tortureRoom();
    if (!room) return;

    const floor = floorCurrent();
    const adjacentTypes = floor
      ? tortureGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();
    const targetTicks = tortureGetConversionTicks(room, adjacentTypes);

    await updateGamestate((state) => {
      for (const flr of state.world.floors) {
        const target = flr.rooms.find((r) => r.id === room.id);
        if (target) {
          target.tortureJob = {
            prisonerId,
            action: 'convert',
            ticksRemaining: targetTicks,
            targetTicks,
          };
          break;
        }
      }
      return state;
    });
  }
}
