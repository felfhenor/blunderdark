import { DecimalPipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { IconComponent } from '@components/icon/icon.component';
import { ModalComponent } from '@components/modal/modal.component';
import { SFXDirective } from '@directives/sfx.directive';
import {
  biomeIsUnlocked,
  cameraFocusOnTile,
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
  gridSearchClear,
  gridSearchFloorMatchCounts,
  gridSearchHasQuery,
  gridSearchMatchingRoomIds,
  gridSearchQuery,
  gridSelectTile,
} from '@helpers';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import { biomeGetContent } from '@helpers/biome';
import { biomeGetAllEffects } from '@helpers/biome-modifiers';
import type { BiomeType, Floor, FloorId } from '@interfaces';
import type { BiomeEffect } from '@interfaces/content-biome';
import { MAX_FLOORS } from '@interfaces/floor';
import type { FloorDepthResourceModifier } from '@interfaces/floor-modifier';
import { TippyDirective } from '@ngneat/helipopper';

type BiomeOption = {
  value: BiomeType;
  name: string;
  description: string;
  color: string;
  icon: string;
};

@Component({
  selector: 'app-panel-floor-selector',
  imports: [
    DecimalPipe,
    FormsModule,
    CurrencyCostComponent,
    CurrencyNameComponent,
    IconComponent,
    ModalComponent,
    SFXDirective,
    TippyDirective,
  ],
  templateUrl: './panel-floor-selector.component.html',
  styleUrl: './panel-floor-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFloorSelectorComponent {
  private titleCasePipe = new TitleCasePipe();
  public floors = floorAll;
  public currentIndex = floorCurrentIndex;
  public selectedFloor = floorCurrent;

  // Search
  public searchText = gridSearchQuery;
  public hasSearch = gridSearchHasQuery;
  public floorMatchCounts = gridSearchFloorMatchCounts;

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
    return PanelFloorSelectorComponent.ALL_BIOME_TYPES.filter((type) =>
      biomeIsUnlocked(type),
    ).map((type) => {
      const data = biomeGetContent(type);
      return {
        value: type,
        name: data?.name ?? type,
        description: data?.description ?? '',
        color: data?.color ?? '#6c757d',
        icon: data?.icon ?? '',
      };
    });
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
    return biomeGetContent(floor?.biome ?? 'neutral');
  });

  public biomeEffects = computed(() => {
    const floor = this.selectedFloor();
    if (!floor) return [];
    return biomeGetAllEffects(floor.biome);
  });

  public depthModifiers = computed<FloorDepthResourceModifier[]>(() => {
    const floor = this.selectedFloor();
    if (!floor) return [];
    return floorModifierGet(floor.depth);
  });

  public nextFloorCost = computed(() => {
    const nextDepth = this.floors().length + 1;
    return floorGetCreationCost(nextDepth, this.selectedBiome());
  });

  public nextFloorCostEntries = computed(() => {
    return Object.entries(this.nextFloorCost()).filter(([, v]) => v && v > 0) as [string, number][];
  });

  public canCreate = computed(() => {
    return floorCanCreate(this.selectedBiome());
  });

  public isMaxFloors = computed(() => {
    return this.floors().length >= MAX_FLOORS;
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

  public removalRefundEntries = computed(() => {
    return Object.entries(this.removalRefund()).filter(([, v]) => v && v > 0) as [string, number][];
  });

  public getBiomeData(biome: BiomeType) {
    return biomeGetContent(biome);
  }

  public isSelected(index: number): boolean {
    return this.currentIndex() === index;
  }

  public getFloorMatchCount(floorId: FloorId): number {
    return this.floorMatchCounts().get(floorId) ?? 0;
  }

  public clearSearch(): void {
    gridSearchClear();
  }

  public async selectFloor(index: number): Promise<void> {
    analyticsSendDesignEvent('Floor:Select');
    await floorSetCurrentByIndex(index);

    if (this.hasSearch()) {
      const floor = this.floors()[index];
      if (floor) {
        const matching = gridSearchMatchingRoomIds();
        const matchRoom = floor.rooms.find((r) => matching.has(r.id));
        if (matchRoom) {
          gridSelectTile(matchRoom.anchorX, matchRoom.anchorY);
          cameraFocusOnTile(matchRoom.anchorX, matchRoom.anchorY);
        }
      }
    }
  }

  public openCreateModal(): void {
    analyticsSendDesignEvent('Floor:Create:Open');
    this.selectedBiome.set('neutral');
    this.showCreateModal.set(true);
  }

  public async onConfirmCreateFloor(): Promise<void> {
    analyticsSendDesignEvent('Floor:Create:Confirm');
    await floorCreate(this.selectedBiome());
    this.showCreateModal.set(false);
  }

  public openChangeBiomeModal(): void {
    analyticsSendDesignEvent('Floor:ChangeBiome:Open');
    const floor = this.selectedFloor();
    if (!floor) return;
    this.changeBiomeTarget.set(floor.biome);
    this.showChangeBiomeModal.set(true);
  }

  public async onConfirmChangeBiome(): Promise<void> {
    analyticsSendDesignEvent('Floor:ChangeBiome:Confirm');
    const floor = this.selectedFloor();
    if (!floor) return;
    await floorChangeBiome(floor.id, this.changeBiomeTarget());
    this.showChangeBiomeModal.set(false);
  }

  public openRemoveModal(): void {
    this.showRemoveModal.set(true);
  }

  public async onConfirmRemoveFloor(): Promise<void> {
    analyticsSendDesignEvent('Floor:Remove:Confirm');
    await floorRemove();
    this.showRemoveModal.set(false);
  }

  public getEffectCurrencyType(effect: BiomeEffect): string | undefined {
    if (effect.targetResourceType) return effect.targetResourceType;
    if (effect.effectType === 'corruption_multiplier') return 'corruption';
    return undefined;
  }

  public getEffectSuffix(effect: BiomeEffect): string | undefined {
    if (effect.effectType === 'creature_production_multiplier') {
      return effect.targetCreatureType ?? 'Creature';
    }
    return undefined;
  }

  public getEffectLabel(effect: BiomeEffect): string {
    const labels: Record<string, string> = {
      defender_attack_multiplier: 'Def. Attack',
      defender_defense_multiplier: 'Def. Defense',
      invader_attack_multiplier: 'Inv. Attack',
      invader_defense_multiplier: 'Inv. Defense',
      fear_reduction: 'Fear',
      creature_production_multiplier:
        this.titleCasePipe.transform(effect.targetCreatureType ?? 'Creature') +
        ' Prod.',
    };
    return labels[effect.effectType] ?? effect.effectType;
  }

  public formatEffectValue(effect: BiomeEffect): string {
    const value =
      effect.effectType === 'fear_reduction'
        ? -effect.effectValue
        : effect.effectValue;
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(0)}%`;
  }

  public isEffectPositive(effect: BiomeEffect): boolean {
    if (effect.effectType === 'fear_reduction') return true;
    return effect.effectValue > 0;
  }

  public isEffectNegative(effect: BiomeEffect): boolean {
    if (effect.effectType === 'fear_reduction') return false;
    return effect.effectValue < 0;
  }

  public formatModifier(percentage: number): string {
    return floorModifierFormatPercentage(percentage);
  }

  public getBiomeBtnBg(color: string, active: boolean): string {
    const pct = active ? 85 : 65;
    return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  }

  public trackByFloorId(_index: number, floor: Floor): string {
    return floor.id;
  }
}
