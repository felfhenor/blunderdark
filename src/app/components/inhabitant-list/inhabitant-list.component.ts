import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@components/icon/icon.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { SFXDirective } from '@directives/sfx.directive';
import { contentGetEntry } from '@helpers';
import { inhabitantIsTraveling } from '@helpers/inhabitants';
import { sortBy } from 'es-toolkit/compat';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { InhabitantTraitContent } from '@interfaces/content-inhabitanttrait';
import type { InhabitantInstance } from '@interfaces/inhabitant';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type InhabitantListFilter = 'all' | 'assigned' | 'unassigned' | 'traveling';

export type InhabitantListEntry = {
  instance: InhabitantInstance;
  def: InhabitantContent;
};

@Component({
  selector: 'app-inhabitant-list',
  imports: [
    DecimalPipe,
    FormsModule,
    IconComponent,
    InhabitantCardComponent,
    SFXDirective,
  ],
  templateUrl: './inhabitant-list.component.html',
  styleUrl: './inhabitant-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InhabitantListComponent {
  public entries = input.required<InhabitantListEntry[]>();
  public showFilters = input(true);
  public showSearch = input(true);
  public showHunger = input(true);
  public showAssignment = input<boolean | undefined>(undefined);
  public synergyRoomId = input<PlacedRoomId | undefined>(undefined);
  public maxHeight = input('480px');
  public emptyMessage = input('No inhabitants.');
  public actionLabel = input<string | undefined>(undefined);
  public selectedId = input<string | undefined>(undefined);

  public activeFilter = model<InhabitantListFilter>('all');
  public selected = output<InhabitantListEntry>();
  public action = output<InhabitantListEntry>();

  public searchQuery = signal('');

  public allCount = computed(() => this.entries().length);

  public assignedCount = computed(
    () => this.entries().filter((e) => e.instance.assignedRoomId !== undefined).length,
  );

  public unassignedCount = computed(
    () => this.entries().filter((e) => e.instance.assignedRoomId === undefined).length,
  );

  public travelingCount = computed(
    () => this.entries().filter((e) => inhabitantIsTraveling(e.instance)).length,
  );

  public filteredEntries = computed(() => {
    let entries = this.entries();
    const filter = this.activeFilter();

    if (filter === 'assigned') {
      entries = entries.filter((e) => e.instance.assignedRoomId !== undefined);
    } else if (filter === 'unassigned') {
      entries = entries.filter((e) => e.instance.assignedRoomId === undefined);
    } else if (filter === 'traveling') {
      entries = entries.filter((e) => inhabitantIsTraveling(e.instance));
    }

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      entries = entries.filter((e) => this.matchesSearch(e, query));
    }

    return sortBy(entries, [(e) => e.def.name]);
  });

  public setFilter(filter: InhabitantListFilter): void {
    this.activeFilter.set(filter);
  }

  public onSelect(entry: InhabitantListEntry): void {
    this.selected.emit(entry);
  }

  public onAction(entry: InhabitantListEntry, event: MouseEvent): void {
    event.stopPropagation();
    this.action.emit(entry);
  }

  public clearSearch(): void {
    this.searchQuery.set('');
  }

  private matchesSearch(entry: InhabitantListEntry, query: string): boolean {
    // Match on instance name (custom name)
    if (entry.instance.name.toLowerCase().includes(query)) return true;

    // Match on definition name (species name)
    if (entry.def.name.toLowerCase().includes(query)) return true;

    // Match on creature type
    if (entry.def.type.toLowerCase().includes(query)) return true;

    // Match on tier
    if (`tier ${entry.def.tier}`.includes(query)) return true;
    if (`t${entry.def.tier}` === query) return true;

    // Match on state
    if (entry.instance.state.toLowerCase().includes(query)) return true;

    // Match on definition traits
    for (const trait of entry.def.traits) {
      if (trait.name.toLowerCase().includes(query)) return true;
    }

    // Match on mutation traits
    if (entry.instance.mutationTraitIds) {
      for (const traitId of entry.instance.mutationTraitIds) {
        const traitDef = contentGetEntry<InhabitantTraitContent>(traitId);
        if (traitDef && traitDef.name.toLowerCase().includes(query)) return true;
      }
    }

    // Match on instance traits
    if (entry.instance.instanceTraitIds) {
      for (const traitId of entry.instance.instanceTraitIds) {
        const traitDef = contentGetEntry<InhabitantTraitContent>(traitId);
        if (traitDef && traitDef.name.toLowerCase().includes(query)) return true;
      }
    }

    // Match on equipped traits
    if (entry.instance.equippedTraitIds) {
      for (const traitId of entry.instance.equippedTraitIds) {
        const traitDef = contentGetEntry<InhabitantTraitContent>(traitId);
        if (traitDef && traitDef.name.toLowerCase().includes(query)) return true;
      }
    }

    // Match on tags like "hybrid", "summoned", "mutated"
    if (entry.instance.isHybrid && 'hybrid'.includes(query)) return true;
    if (entry.instance.isSummoned && 'summoned'.includes(query)) return true;
    if (entry.instance.mutated && 'mutated'.includes(query)) return true;

    // Match on restriction tags
    for (const tag of entry.def.restrictionTags) {
      if (tag.toLowerCase().includes(query)) return true;
    }

    return false;
  }
}
