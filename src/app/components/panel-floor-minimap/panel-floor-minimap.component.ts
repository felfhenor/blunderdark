import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  floorAll,
  floorCurrentIndex,
  floorSetCurrentByIndex,
} from '@helpers';
import { BIOME_DATA, type BiomeType, type Floor } from '@interfaces';
import { GRID_SIZE } from '@interfaces/grid';

type MinimapTile = {
  x: number;
  y: number;
  type: 'room' | 'hallway';
};

type MinimapFloor = {
  index: number;
  depth: number;
  name: string;
  biome: BiomeType;
  biomeColor: string;
  tiles: MinimapTile[];
};

@Component({
  selector: 'app-panel-floor-minimap',
  templateUrl: './panel-floor-minimap.component.html',
  styleUrl: './panel-floor-minimap.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFloorMinimapComponent {
  public readonly gridSize = GRID_SIZE;
  public currentIndex = floorCurrentIndex;

  public minimapFloors = computed<MinimapFloor[]>(() => {
    const floors = floorAll();
    return floors.map((floor, index) => ({
      index,
      depth: floor.depth,
      name: floor.name,
      biome: floor.biome,
      biomeColor: BIOME_DATA[floor.biome].color,
      tiles: this.extractTiles(floor),
    }));
  });

  public isSelected(index: number): boolean {
    return this.currentIndex() === index;
  }

  public async selectFloor(index: number): Promise<void> {
    await floorSetCurrentByIndex(index);
  }

  private extractTiles(floor: Floor): MinimapTile[] {
    const tiles: MinimapTile[] = [];
    const grid = floor.grid;
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (tile && tile.occupied) {
          tiles.push({
            x,
            y,
            type: tile.occupiedBy === 'hallway' ? 'hallway' : 'room',
          });
        }
      }
    }
    return tiles;
  }
}
