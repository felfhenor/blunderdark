import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
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
  stairPlacementActive,
  stairPlacementEnter,
  stairPlacementExit,
  STAIR_PLACEMENT_COST,
  elevatorPlacementActive,
  elevatorPlacementEnter,
  elevatorPlacementExit,
  ELEVATOR_PLACEMENT_COST_CRYSTALS,
  ELEVATOR_PLACEMENT_COST_FLUX,
  portalPlacementActive,
  portalPlacementEnter,
  portalPlacementExit,
  PORTAL_PLACEMENT_COST_FLUX,
  PORTAL_PLACEMENT_COST_ESSENCE,
} from '@helpers';
import type { FloorDepthResourceModifier } from '@interfaces/floor-modifier';
import { BIOME_DATA, type BiomeType, type Floor } from '@interfaces';
import { MAX_FLOORS } from '@interfaces/floor';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-panel-floor-selector',
  imports: [DecimalPipe, SweetAlert2Module],
  templateUrl: './panel-floor-selector.component.html',
  styleUrl: './panel-floor-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFloorSelectorComponent {
  public floors = floorAll;
  public currentIndex = floorCurrentIndex;
  public selectedFloor = floorCurrent;

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

  public async onConfirmCreateFloor(): Promise<void> {
    await floorCreate();
  }

  public formatModifier(percentage: number): string {
    return floorModifierFormatPercentage(percentage);
  }

  public getResourceLabel(resourceType: string): string {
    const labels: Record<string, string> = {
      crystals: 'Crystals',
      food: 'Food',
      gold: 'Gold',
      flux: 'Flux',
      essence: 'Essence',
      corruption: 'Corruption',
      research: 'Research',
    };
    return labels[resourceType] ?? resourceType;
  }

  public trackByFloorId(_index: number, floor: Floor): string {
    return floor.id;
  }

  public isStairModeActive = stairPlacementActive;
  public stairCost = STAIR_PLACEMENT_COST;

  public isElevatorModeActive = elevatorPlacementActive;
  public elevatorCostCrystals = ELEVATOR_PLACEMENT_COST_CRYSTALS;
  public elevatorCostFlux = ELEVATOR_PLACEMENT_COST_FLUX;

  public isPortalModeActive = portalPlacementActive;
  public portalCostFlux = PORTAL_PLACEMENT_COST_FLUX;
  public portalCostEssence = PORTAL_PLACEMENT_COST_ESSENCE;

  public canBuildStairs = computed(() => {
    return this.floors().length >= 2;
  });

  public toggleStairMode(direction: 'up' | 'down'): void {
    if (stairPlacementActive()) {
      stairPlacementExit();
    } else {
      elevatorPlacementExit();
      portalPlacementExit();
      stairPlacementEnter(direction);
    }
  }

  public toggleElevatorMode(): void {
    if (elevatorPlacementActive()) {
      elevatorPlacementExit();
    } else {
      stairPlacementExit();
      portalPlacementExit();
      elevatorPlacementEnter();
    }
  }

  public togglePortalMode(): void {
    if (portalPlacementActive()) {
      portalPlacementExit();
    } else {
      stairPlacementExit();
      elevatorPlacementExit();
      portalPlacementEnter();
    }
  }
}
