import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  currentFloor,
  evaluateSynergiesForRoom,
  formatSynergyEffect,
  getPotentialSynergiesForRoom,
  getRoomDefinition,
  selectedTile,
} from '@helpers';
import { areRoomsAdjacent } from '@helpers/adjacency';
import { getAbsoluteTiles, resolveRoomShape } from '@helpers/room-shapes';
import type { SynergyDefinition } from '@interfaces';
import type { PotentialSynergy } from '@helpers/synergy';

@Component({
  selector: 'app-synergy-tooltip',
  templateUrl: './synergy-tooltip.component.html',
  styleUrl: './synergy-tooltip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SynergyTooltipComponent {
  public roomData = computed(() => {
    const tile = selectedTile();
    const floor = currentFloor();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room) return undefined;

    const def = getRoomDefinition(room.roomTypeId);
    if (!def) return undefined;

    const roomTiles = new Map<string, { x: number; y: number }[]>();
    for (const r of floor.rooms) {
      const shape = resolveRoomShape(r);
      roomTiles.set(r.id, getAbsoluteTiles(shape, r.anchorX, r.anchorY));
    }

    const thisTiles = roomTiles.get(room.id) ?? [];
    const adjacentRoomIds: string[] = [];
    for (const other of floor.rooms) {
      if (other.id === room.id) continue;
      const otherTiles = roomTiles.get(other.id) ?? [];
      if (areRoomsAdjacent(thisTiles, otherTiles)) {
        adjacentRoomIds.push(other.id);
      }
    }

    const active = evaluateSynergiesForRoom(room, floor, adjacentRoomIds);
    const potential = getPotentialSynergiesForRoom(
      room,
      floor,
      adjacentRoomIds,
    );

    if (active.length === 0 && potential.length === 0) return undefined;

    return {
      roomName: def.name,
      active,
      potential,
    };
  });

  public formatEffect(synergy: SynergyDefinition): string {
    return synergy.effects.map((e) => formatSynergyEffect(e)).join(', ');
  }

  public getPotentialEffect(ps: PotentialSynergy): string {
    return this.formatEffect(ps.synergy);
  }
}
