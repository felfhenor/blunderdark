import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { ModalComponent } from '@components/modal/modal.component';
import {
  floorAll,
  floorCanCreate,
  floorCreate,
  floorCurrent,
  floorCurrentIndex,
  floorGetCreationCost,
  floorModifierFormatPercentage,
  floorModifierGet,
  floorSetCurrentByIndex,
} from '@helpers';
import type { FloorDepthResourceModifier } from '@interfaces/floor-modifier';
import { BIOME_DATA, type BiomeType, type Floor } from '@interfaces';
import { MAX_FLOORS } from '@interfaces/floor';

type BiomeOption = {
  value: BiomeType;
  name: string;
  description: string;
  color: string;
};

@Component({
  selector: 'app-panel-floor-selector',
  imports: [DecimalPipe, CurrencyNameComponent, ModalComponent],
  templateUrl: './panel-floor-selector.component.html',
  styleUrl: './panel-floor-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFloorSelectorComponent {
  public floors = floorAll;
  public currentIndex = floorCurrentIndex;
  public selectedFloor = floorCurrent;

  public showCreateModal = signal(false);
  public selectedBiome = signal<BiomeType>('neutral');

  public readonly biomeOptions: BiomeOption[] = [
    {
      value: 'neutral',
      name: BIOME_DATA.neutral.name,
      description: BIOME_DATA.neutral.description,
      color: BIOME_DATA.neutral.color,
    },
    {
      value: 'volcanic',
      name: BIOME_DATA.volcanic.name,
      description: BIOME_DATA.volcanic.description,
      color: BIOME_DATA.volcanic.color,
    },
    {
      value: 'flooded',
      name: BIOME_DATA.flooded.name,
      description: BIOME_DATA.flooded.description,
      color: BIOME_DATA.flooded.color,
    },
    {
      value: 'crystal',
      name: BIOME_DATA.crystal.name,
      description: BIOME_DATA.crystal.description,
      color: BIOME_DATA.crystal.color,
    },
    {
      value: 'corrupted',
      name: BIOME_DATA.corrupted.name,
      description: BIOME_DATA.corrupted.description,
      color: BIOME_DATA.corrupted.color,
    },
    {
      value: 'fungal',
      name: BIOME_DATA.fungal.name,
      description: BIOME_DATA.fungal.description,
      color: BIOME_DATA.fungal.color,
    },
  ];

  public currentFloorDepth = computed(() => {
    const floor = this.selectedFloor();
    return floor?.depth ?? 1;
  });

  public selectedFloorBiome = computed(() => {
    const floor = this.selectedFloor();
    if (!floor) return BIOME_DATA.neutral;
    return BIOME_DATA[floor.biome];
  });

  public depthModifiers = computed<FloorDepthResourceModifier[]>(() => {
    const floor = this.selectedFloor();
    if (!floor) return [];
    return floorModifierGet(floor.depth);
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

  public openCreateModal(): void {
    this.selectedBiome.set('neutral');
    this.showCreateModal.set(true);
  }

  public async onConfirmCreateFloor(): Promise<void> {
    await floorCreate(this.selectedBiome());
    this.showCreateModal.set(false);
  }

  public formatModifier(percentage: number): string {
    return floorModifierFormatPercentage(percentage);
  }

  public trackByFloorId(_index: number, floor: Floor): string {
    return floor.id;
  }

}
