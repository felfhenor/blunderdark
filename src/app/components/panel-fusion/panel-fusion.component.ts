import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  signal,
} from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { ModalComponent } from '@components/modal/modal.component';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import { contentGetEntry } from '@helpers/content';
import type { FusionPreview } from '@helpers/fusion';
import {
  fusionExecute,
  fusionGetAllRecipes,
  fusionGetPreview,
  fusionValidate,
} from '@helpers/fusion';
import { notifyError, notifySuccess } from '@helpers/notify';
import { resourceCanAfford } from '@helpers/resources';
import { gamestate } from '@helpers/state-game';
import type {
  FusionRecipeContent,
  InhabitantInstance,
  InhabitantInstanceId,
  InhabitantStats,
  ResourceType,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { TippyDirective } from '@ngneat/helipopper';
import { sortBy } from 'es-toolkit/compat';

type FusionTab = 'fuse' | 'recipes';

type StatDelta = {
  stat: keyof InhabitantStats;
  hybridValue: number;
  bestParentValue: number;
  delta: number;
};

type RecipeEntry = {
  recipe: FusionRecipeContent;
  parentADef: InhabitantContent | undefined;
  parentBDef: InhabitantContent | undefined;
  hybridDef: InhabitantContent | undefined;
  canPerform: boolean;
};

@Component({
  selector: 'app-panel-fusion',
  imports: [DecimalPipe, NgClass, CurrencyNameComponent, InhabitantCardComponent, ModalComponent, StatNameComponent, TippyDirective],
  templateUrl: './panel-fusion.component.html',
  styleUrl: './panel-fusion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFusionComponent {
  public visible = model<boolean>(false);

  public activeTab = signal<FusionTab>('fuse');
  public slotA = signal<InhabitantInstanceId | undefined>(undefined);
  public slotB = signal<InhabitantInstanceId | undefined>(undefined);
  public searchQuery = signal('');
  public recipeSearchQuery = signal('');
  public showConfirmation = signal(false);

  public availableInhabitants = computed(() => {
    const inhabitants = gamestate().world.inhabitants;
    const filtered = inhabitants.filter((i) => {
      if (i.isTemporary) return false;
      if (i.travelTicksRemaining && i.travelTicksRemaining > 0) return false;
      return true;
    });
    return sortBy(filtered, [(i) => contentGetEntry<InhabitantContent>(i.definitionId)?.name ?? '']);
  });

  public filteredInhabitants = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const inhabitants = this.availableInhabitants();
    if (!query) return inhabitants;
    return inhabitants.filter((i) => {
      const def = contentGetEntry<InhabitantContent>(i.definitionId);
      return (
        i.name.toLowerCase().includes(query) ||
        def?.name.toLowerCase().includes(query)
      );
    });
  });

  public slotAEntry = computed(() => {
    const id = this.slotA();
    if (!id) return undefined;
    const inst = this.availableInhabitants().find((i) => i.instanceId === id);
    if (!inst) return undefined;
    const def = contentGetEntry<InhabitantContent>(inst.definitionId);
    return def ? { instance: inst, def } : undefined;
  });

  public slotBEntry = computed(() => {
    const id = this.slotB();
    if (!id) return undefined;
    const inst = this.availableInhabitants().find((i) => i.instanceId === id);
    if (!inst) return undefined;
    const def = contentGetEntry<InhabitantContent>(inst.definitionId);
    return def ? { instance: inst, def } : undefined;
  });

  public preview = computed((): FusionPreview | undefined => {
    const a = this.slotAEntry();
    const b = this.slotBEntry();
    if (!a || !b) return undefined;
    return fusionGetPreview(a.def.id, b.def.id);
  });

  public validation = computed(() => {
    const a = this.slotA();
    const b = this.slotB();
    if (!a || !b) return { valid: false, error: 'Select two inhabitants' };
    return fusionValidate(a, b);
  });

  public statComparison = computed((): StatDelta[] => {
    const p = this.preview();
    if (!p) return [];

    const stats: (keyof InhabitantStats)[] = [
      'hp',
      'attack',
      'defense',
      'speed',
      'workerEfficiency',
    ];

    return stats.map((stat) => {
      const hybridValue = p.hybridDef.stats[stat];
      const bestParentValue = Math.max(
        p.parentADef.stats[stat],
        p.parentBDef.stats[stat],
      );
      return {
        stat,
        hybridValue,
        bestParentValue,
        delta: hybridValue - bestParentValue,
      };
    });
  });

  public traitAnalysis = computed(() => {
    const p = this.preview();
    if (!p) return { inherited: [], unique: [] };

    const parentTraitIds = new Set([
      ...p.parentADef.traits.map((t) => t.id),
      ...p.parentBDef.traits.map((t) => t.id),
    ]);

    const inherited = p.hybridDef.traits.filter((t) =>
      parentTraitIds.has(t.id),
    );
    const unique = p.hybridDef.traits.filter((t) => !parentTraitIds.has(t.id));

    return { inherited, unique };
  });

  public allRecipes = computed((): RecipeEntry[] => {
    const recipes = fusionGetAllRecipes();
    const inhabitants = gamestate().world.inhabitants;

    return recipes.map((recipe) => {
      const parentADef = contentGetEntry<InhabitantContent>(
        recipe.firstInhabitantId,
      );
      const parentBDef = contentGetEntry<InhabitantContent>(
        recipe.secondInhabitantId,
      );
      const hybridDef = contentGetEntry<InhabitantContent>(
        recipe.resultInhabitantId,
      );

      const hasParentA = inhabitants.some(
        (i) =>
          i.definitionId === recipe.firstInhabitantId &&
          !i.isTemporary &&
          !(i.travelTicksRemaining && i.travelTicksRemaining > 0),
      );
      const hasParentB = inhabitants.some(
        (i) =>
          i.definitionId === recipe.secondInhabitantId &&
          !i.isTemporary &&
          !(i.travelTicksRemaining && i.travelTicksRemaining > 0),
      );
      const canAfford = resourceCanAfford(recipe.cost);

      return {
        recipe,
        parentADef,
        parentBDef,
        hybridDef,
        canPerform: hasParentA && hasParentB && canAfford,
      };
    });
  });

  public filteredRecipes = computed(() => {
    const query = this.recipeSearchQuery().toLowerCase().trim();
    const recipes = this.allRecipes();
    if (!query) return recipes;
    return recipes.filter(
      (r) =>
        r.recipe.name.toLowerCase().includes(query) ||
        r.parentADef?.name.toLowerCase().includes(query) ||
        r.parentBDef?.name.toLowerCase().includes(query) ||
        r.hybridDef?.name.toLowerCase().includes(query),
    );
  });

  public getInhabitantDef(
    instance: InhabitantInstance,
  ): InhabitantContent | undefined {
    return contentGetEntry<InhabitantContent>(instance.definitionId);
  }

  public isSelected(instanceId: InhabitantInstanceId): boolean {
    return this.slotA() === instanceId || this.slotB() === instanceId;
  }

  public selectInhabitant(instanceId: InhabitantInstanceId): void {
    if (this.slotA() === instanceId) {
      this.slotA.set(undefined);
      return;
    }
    if (this.slotB() === instanceId) {
      this.slotB.set(undefined);
      return;
    }

    if (!this.slotA()) {
      this.slotA.set(instanceId);
    } else if (!this.slotB()) {
      this.slotB.set(instanceId);
    }
  }

  public resetSlots(): void {
    this.slotA.set(undefined);
    this.slotB.set(undefined);
    this.showConfirmation.set(false);
  }

  public setTab(tab: FusionTab): void {
    this.activeTab.set(tab);
  }

  public requestFuse(): void {
    this.showConfirmation.set(true);
  }

  public cancelFuse(): void {
    this.showConfirmation.set(false);
  }

  public async confirmFuse(): Promise<void> {
    const a = this.slotA();
    const b = this.slotB();
    if (!a || !b) return;

    this.showConfirmation.set(false);

    const result = await fusionExecute(a, b);
    if (result.success) {
      notifySuccess(
        `Fusion complete! Created ${result.hybridInstance?.name ?? 'hybrid'}.`,
      );
      this.resetSlots();
    } else {
      notifyError(result.error ?? 'Fusion failed');
    }
  }

  public close(): void {
    this.visible.set(false);
    this.resetSlots();
    this.searchQuery.set('');
    this.recipeSearchQuery.set('');
    this.activeTab.set('fuse');
  }

  public formatCost(
    cost: Partial<Record<string, number>>,
  ): { type: ResourceType; amount: number }[] {
    return Object.entries(cost)
      .filter(([, amount]) => amount && amount > 0)
      .map(([type, amount]) => ({ type: type as ResourceType, amount: amount! }));
  }

  public getDeltaClass(delta: number): string {
    if (delta > 0) return 'stat-up';
    if (delta < 0) return 'stat-down';
    return '';
  }

  public formatDelta(delta: number): string {
    if (delta > 0) return `+${delta.toLocaleString()}`;
    if (delta < 0) return `${delta.toLocaleString()}`;
    return '0';
  }

}
