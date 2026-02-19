import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import {
  altarRoomFearReductionAura,
  altarRoomLevel,
  altarRoomApplyUpgrade,
  resourceCanAfford,
  altarRoomCanRecruit,
  recruitmentCurrentInhabitantCount,
  RESOURCE_LABEL_MAP,
  gamestate,
  altarRoomGetNextUpgrade,
  recruitmentGetRecruitable,
  recruitmentGetShortfall,
  recruitmentIsRosterFull,
  recruitmentMaxInhabitantCount,
  notifyError,
  notifySuccess,
  recruitmentRecruit,
  recruitmentUnlockedTier,
  researchUnlockIsResearchGated,
  researchUnlockIsUnlocked,
} from '@helpers';
import type {
  ResourceType,
  RoomUpgradePath,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { TippyDirective } from '@ngneat/helipopper';
import { sortBy } from 'es-toolkit/compat';

type RecruitableEntry = {
  def: InhabitantContent;
  affordable: boolean;
  shortfall: { type: ResourceType; needed: number }[];
  costEntries: { type: ResourceType; amount: number }[];
};

@Component({
  selector: 'app-panel-altar',
  imports: [DecimalPipe, CurrencyNameComponent, StatNameComponent, TippyDirective],
  templateUrl: './panel-altar.component.html',
  styleUrl: './panel-altar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAltarComponent {
  public fearReduction = altarRoomFearReductionAura;
  public recruitmentAvailable = altarRoomCanRecruit;
  public level = altarRoomLevel;
  public rosterFull = recruitmentIsRosterFull;
  public inhabitantCount = recruitmentCurrentInhabitantCount;
  public maxInhabitants = recruitmentMaxInhabitantCount;
  public tierUnlocked = recruitmentUnlockedTier;

  public nextUpgrade = computed<RoomUpgradePath | undefined>(() => {
    return altarRoomGetNextUpgrade(gamestate().world.floors);
  });

  public canAffordUpgrade = computed(() => {
    const upgrade = this.nextUpgrade();
    if (!upgrade) return false;
    return resourceCanAfford(upgrade.cost);
  });

  public recruitableInhabitants = computed<RecruitableEntry[]>(() => {
    const state = gamestate();
    const defs = recruitmentGetRecruitable();
    const tier = this.tierUnlocked();

    const entries = defs
      .filter((def) => {
        if (def.tier > tier) return false;
        const researchGated = researchUnlockIsResearchGated('inhabitant', def.id);
        return !researchGated || researchUnlockIsUnlocked('inhabitant', def.id);
      })
      .map((def) => {
        const affordable = resourceCanAfford(def.cost);
        const shortfall = !affordable
          ? recruitmentGetShortfall(def.cost, state.world.resources)
          : [];
        const costEntries = Object.entries(def.cost)
          .filter(([, amount]) => amount && amount > 0)
          .map(([type, amount]) => ({ type: type as ResourceType, amount: amount as number }));

        return { def, affordable, shortfall, costEntries };
      });
    return sortBy(entries, [(e) => e.def.name]);
  });

  public getCostEntries(
    upgrade: RoomUpgradePath,
  ): { type: ResourceType; amount: number }[] {
    return Object.entries(upgrade.cost)
      .filter(([, amount]) => amount && amount > 0)
      .map(([type, amount]) => ({ type: type as ResourceType, amount: amount as number }));
  }

  public isResourceShort(entry: RecruitableEntry, costType: string): boolean {
    return entry.shortfall.some((s) => s.type === costType);
  }

  public getDisabledReason(entry: RecruitableEntry): string {
    if (this.rosterFull()) return 'Roster full';
    if (!entry.affordable) {
      const parts = entry.shortfall.map(
        (s) => `${s.needed} more ${RESOURCE_LABEL_MAP[s.type]}`,
      );
      return `Need: ${parts.join(', ')}`;
    }
    return '';
  }

  public async onUpgrade(): Promise<void> {
    const upgrade = this.nextUpgrade();
    if (!upgrade) return;

    const result = await altarRoomApplyUpgrade(upgrade.id);
    if (result.success) {
      notifySuccess(`Altar upgraded to ${upgrade.name}`);
    } else if (result.error) {
      notifyError(result.error);
    }
  }

  public async onRecruit(def: InhabitantContent): Promise<void> {
    const result = await recruitmentRecruit(def);
    if (result.success) {
      notifySuccess(`Recruited ${result.instance!.name} the ${def.name}!`);
    } else if (result.error) {
      notifyError(result.error);
    }
  }
}
