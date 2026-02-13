import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  floorAll,
  floorCanCreate,
  floorCreate,
  floorCurrent,
  floorCurrentIndex,
  floorGetCreationCost,
  floorSetCurrentByIndex,
} from '@helpers';
import { BIOME_DATA, type BiomeType, type Floor } from '@interfaces';
import { MAX_FLOORS } from '@interfaces/floor';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-panel-floor-selector',
  imports: [SweetAlert2Module],
  templateUrl: './panel-floor-selector.component.html',
  styleUrl: './panel-floor-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFloorSelectorComponent {
  public floors = floorAll;
  public currentIndex = floorCurrentIndex;
  public selectedFloor = floorCurrent;

  public selectedFloorBiome = computed(() => {
    const floor = this.selectedFloor();
    if (!floor) return BIOME_DATA.neutral;
    return BIOME_DATA[floor.biome];
  });

  public nextFloorCost = computed(() => {
    const nextDepth = this.floors().length + 1;
    return floorGetCreationCost(nextDepth);
  });

  public canCreate = computed(() => {
    return floorCanCreate();
  });

  public isMaxFloors = computed(() => {
    return this.floors().length >= MAX_FLOORS;
  });

  public nextFloorCostLabel = computed(() => {
    const cost = this.nextFloorCost();
    const parts: string[] = [];
    if (cost.crystals) parts.push(`${cost.crystals} Crystals`);
    if (cost.gold) parts.push(`${cost.gold} Gold`);
    return parts.join(' + ');
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
    await floorSetCurrentByIndex(index);
  }

  public async onConfirmCreateFloor(): Promise<void> {
    await floorCreate();
  }

  public trackByFloorId(_index: number, floor: Floor): string {
    return floor.id;
  }
}
