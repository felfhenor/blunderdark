import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { ModalComponent } from '@components/modal/modal.component';
import {
  biomeIsUnlocked,
  floorAll,
  floorCanChangeBiome,
  floorCanCreate,
  floorCanRemove,
  floorChangeBiome,
  floorCreate,
  floorCurrent,
  floorCurrentIndex,
  floorGetCreationCost,
  floorGetRemovalRefund,
  floorModifierFormatPercentage,
  floorModifierGet,
  floorRemove,
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

  public showChangeBiomeModal = signal(false);
  public changeBiomeTarget = signal<BiomeType>('neutral');

  public showRemoveModal = signal(false);

  private static readonly ALL_BIOME_TYPES: BiomeType[] = [
    'neutral',
    'volcanic',
    'flooded',
    'crystal',
    'corrupted',
    'fungal',
  ];

  public biomeOptions = computed<BiomeOption[]>(() => {
    return PanelFloorSelectorComponent.ALL_BIOME_TYPES
      .filter((type) => biomeIsUnlocked(type))
      .map((type) => ({
        value: type,
        name: BIOME_DATA[type].name,
        description: BIOME_DATA[type].description,
        color: BIOME_DATA[type].color,
      }));
  });

  public changeBiomeValidation = computed(() => {
    const floor = this.selectedFloor();
    if (!floor) return { canChange: false, reason: 'No floor selected' };
    return floorCanChangeBiome(floor.id, this.changeBiomeTarget());
  });

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

  public canRemove = computed(() => {
    return floorCanRemove();
  });

  public isLastFloor = computed(() => {
    const floors = this.floors();
    return this.currentIndex() === floors.length - 1 && floors.length > 1;
  });

  public removalRefund = computed(() => {
    return floorGetRemovalRefund();
  });

  public removalRefundLabel = computed(() => {
    const refund = this.removalRefund();
    const parts: string[] = [];
    if (refund.crystals) parts.push(`${refund.crystals} Crystals`);
    if (refund.gold) parts.push(`${refund.gold} Gold`);
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

  public openChangeBiomeModal(): void {
    const floor = this.selectedFloor();
    if (!floor) return;
    this.changeBiomeTarget.set(floor.biome);
    this.showChangeBiomeModal.set(true);
  }

  public async onConfirmChangeBiome(): Promise<void> {
    const floor = this.selectedFloor();
    if (!floor) return;
    await floorChangeBiome(floor.id, this.changeBiomeTarget());
    this.showChangeBiomeModal.set(false);
  }

  public openRemoveModal(): void {
    this.showRemoveModal.set(true);
  }

  public async onConfirmRemoveFloor(): Promise<void> {
    await floorRemove();
    this.showRemoveModal.set(false);
  }

  public formatModifier(percentage: number): string {
    return floorModifierFormatPercentage(percentage);
  }

  public trackByFloorId(_index: number, floor: Floor): string {
    return floor.id;
  }

}
