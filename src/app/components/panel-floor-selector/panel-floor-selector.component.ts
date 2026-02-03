import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  allFloors,
  currentFloorIndex,
  currentFloor,
  setCurrentFloorByIndex,
} from '@helpers';
import { BIOME_DATA, type BiomeType, type Floor } from '@interfaces';

@Component({
  selector: 'app-panel-floor-selector',
  templateUrl: './panel-floor-selector.component.html',
  styleUrl: './panel-floor-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFloorSelectorComponent {
  public floors = allFloors;
  public currentIndex = currentFloorIndex;
  public selectedFloor = currentFloor;

  public selectedFloorBiome = computed(() => {
    const floor = this.selectedFloor();
    if (!floor) return BIOME_DATA.neutral;
    return BIOME_DATA[floor.biome];
  });

  public getBiomeData(biome: BiomeType) {
    return BIOME_DATA[biome];
  }

  public getBiomeIcon(biome: BiomeType): string {
    const icons: Record<BiomeType, string> = {
      volcanic: '🌋',
      flooded: '💧',
      crystal: '💎',
      corrupted: '☠️',
      fungal: '🍄',
      neutral: '⛰️',
    };
    return icons[biome];
  }

  public isSelected(index: number): boolean {
    return this.currentIndex() === index;
  }

  public async selectFloor(index: number): Promise<void> {
    await setCurrentFloorByIndex(index);
  }

  public trackByFloorId(_index: number, floor: Floor): string {
    return floor.id;
  }
}
