import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  floorCurrent,
  synergyEvaluateForRoom,
  synergyFormatEffect,
  synergyGetPotentialForRoom,
  productionGetRoomDefinition,
  gridSelectedTile,
} from '@helpers';
import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
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
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room) return undefined;

    const def = productionGetRoomDefinition(room.roomTypeId);
    if (!def) return undefined;

    const roomTiles = new Map<string, { x: number; y: number }[]>();
    for (const r of floor.rooms) {
      const shape = roomShapeResolve(r);
      roomTiles.set(r.id, roomShapeGetAbsoluteTiles(shape, r.anchorX, r.anchorY));
    }

    const thisTiles = roomTiles.get(room.id) ?? [];
    const adjacentRoomIds: string[] = [];
    for (const other of floor.rooms) {
      if (other.id === room.id) continue;
      const otherTiles = roomTiles.get(other.id) ?? [];
      if (adjacencyAreRoomsAdjacent(thisTiles, otherTiles)) {
        adjacentRoomIds.push(other.id);
      }
    }

    const active = synergyEvaluateForRoom(room, floor, adjacentRoomIds);
    const potential = synergyGetPotentialForRoom(
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
    return synergy.effects.map((e) => synergyFormatEffect(e)).join(', ');
  }

  public getPotentialEffect(ps: PotentialSynergy): string {
    return this.formatEffect(ps.synergy);
  }
}
