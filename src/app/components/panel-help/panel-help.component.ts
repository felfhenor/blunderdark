import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonCloseComponent } from '@components/button-close/button-close.component';
import { CardPageComponent } from '@components/card-page/card-page.component';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import { StatRowComponent } from '@components/stat-row/stat-row.component';
import { TabBarComponent } from '@components/tab-bar/tab-bar.component';
import type { TabDefinition } from '@components/tab-bar/tab-bar.component';
import { contentGetEntriesByType } from '@helpers/content';
import { formatTierBadgeClass } from '@helpers/format';
import {
  researchUnlockIsResearchGated,
  researchUnlockIsUnlocked,
} from '@helpers/research-unlocks';
import { uiShowHelpMenu } from '@helpers/ui';
import {
  workAffinityGetForType,
  WORK_CATEGORY_LABELS,
} from '@helpers/work-affinity';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { sortBy } from 'es-toolkit/compat';

type SortMode = 'name' | 'tier' | 'type';

@Component({
  selector: 'app-panel-help',
  imports: [
    CardPageComponent,
    ButtonCloseComponent,
    TabBarComponent,
    CurrencyCostListComponent,
    StatRowComponent,
    DecimalPipe,
    NgClass,
    FormsModule,
  ],
  templateUrl: './panel-help.component.html',
  styleUrl: './panel-help.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelHelpComponent {
  public searchText = signal('');
  public sortMode = signal<SortMode>('name');
  public selectedCreatureId = signal<string | undefined>(undefined);

  public helpTab = signal('Creature Compendium');
  public tabDefs: TabDefinition[] = [
    { id: 'Creature Compendium', label: 'Creature Compendium' },
  ];

  public changeHelpTab(tab: string): void {
    this.helpTab.set(tab);
  }

  private allBaseCreatures = computed(() => {
    const all = contentGetEntriesByType<InhabitantContent>('inhabitant');
    return all.filter(
      (c) =>
        !c.restrictionTags.includes('hybrid') &&
        !c.restrictionTags.includes('summoned') &&
        !c.restrictionTags.includes('converted'),
    );
  });

  public unlockedCreatures = computed(() => {
    const base = this.allBaseCreatures();
    const search = this.searchText().toLowerCase();
    const sort = this.sortMode();

    let filtered = base.filter((c) => {
      if (!researchUnlockIsResearchGated('inhabitant', c.id)) return true;
      return researchUnlockIsUnlocked('inhabitant', c.id);
    });

    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.type.toLowerCase().includes(search),
      );
    }

    switch (sort) {
      case 'name':
        return sortBy(filtered, [(c) => c.name.toLowerCase()]);
      case 'tier':
        return sortBy(filtered, [(c) => c.tier, (c) => c.name.toLowerCase()]);
      case 'type':
        return sortBy(filtered, [
          (c) => c.type.toLowerCase(),
          (c) => c.name.toLowerCase(),
        ]);
    }
  });

  public undiscoveredCount = computed(() => {
    const base = this.allBaseCreatures();
    return base.filter((c) => {
      if (!researchUnlockIsResearchGated('inhabitant', c.id)) return false;
      return !researchUnlockIsUnlocked('inhabitant', c.id);
    }).length;
  });

  public selectedCreature = computed(() => {
    const id = this.selectedCreatureId();
    const creatures = this.unlockedCreatures();
    if (id) {
      const found = creatures.find((c) => c.id === id);
      if (found) return found;
    }
    return creatures[0] ?? undefined;
  });

  public selectedAffinities = computed(() => {
    const creature = this.selectedCreature();
    if (!creature) return undefined;
    const affinity = workAffinityGetForType(creature.type);
    return {
      preferred: affinity.preferred.map((c) => WORK_CATEGORY_LABELS[c]),
      disliked: affinity.disliked.map((c) => WORK_CATEGORY_LABELS[c]),
    };
  });

  public selectedTierClass = computed(() => {
    const creature = this.selectedCreature();
    if (!creature) return '';
    return formatTierBadgeClass(creature.tier);
  });

  public isLegendary = computed(() => {
    const creature = this.selectedCreature();
    if (!creature) return false;
    return creature.restrictionTags.includes('unique');
  });

  public selectCreature(id: string): void {
    this.selectedCreatureId.set(id);
  }

  public tierClass = formatTierBadgeClass;

  public closeMenu(): void {
    uiShowHelpMenu.set(false);
  }
}
