import { computed, signal } from '@angular/core';
import { exitPlacementMode } from '@helpers/room-placement';

export type HallwayBuildStep =
  | 'inactive'
  | 'selectSource'
  | 'selectDestination'
  | 'preview';

export const hallwayBuildStep = signal<HallwayBuildStep>('inactive');

export const isHallwayBuildMode = computed(
  () => hallwayBuildStep() !== 'inactive',
);

export const hallwaySourceRoomId = signal<string | null>(null);
export const hallwayDestRoomId = signal<string | null>(null);

export function enterHallwayBuildMode(): void {
  exitPlacementMode();
  hallwayBuildStep.set('selectSource');
  hallwaySourceRoomId.set(null);
  hallwayDestRoomId.set(null);
}

export function exitHallwayBuildMode(): void {
  hallwayBuildStep.set('inactive');
  hallwaySourceRoomId.set(null);
  hallwayDestRoomId.set(null);
}
