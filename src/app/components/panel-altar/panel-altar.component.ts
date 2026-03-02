import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { IconComponent } from '@components/icon/icon.component';
import { StatRowComponent } from '@components/stat-row/stat-row.component';
import { analyticsSendDesignEvent } from '@helpers/analytics';
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
  legendaryInhabitantCanRecruit,
  legendaryInhabitantGetResearchUnlocked,
  legendaryInhabitantIsRecruited,
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
  resourcePayCost,
  inhabitantAdd,
} from '@helpers';
import { generateInhabitantName } from '@helpers/inhabitant-names';
import { rngUuid } from '@helpers/rng';
import type {
  InhabitantInstance,
  InhabitantInstanceId,
  ResourceType,
  RoomUpgradeContent,
} from '@interfaces';
import type { LegendaryRequirementCheck } from '@helpers/legendary-inhabitant';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { TippyDirective } from '@ngneat/helipopper';
import { sortBy } from 'es-toolkit/compat';

type RecruitableEntry = {
  def: InhabitantContent;
  affordable: boolean;
  shortfall: { type: ResourceType; needed: number }[];
  costEntries: { type: ResourceType; amount: number }[];
};

type LegendaryEntry = {
  def: InhabitantContent;
  recruited: boolean;
  canRecruit: boolean;
  affordable: boolean;
  requirements: LegendaryRequirementCheck[];
  costEntries: { type: ResourceType; amount: number }[];
};

@Component({
  selector: 'app-panel-altar',
  imports: [DecimalPipe, CurrencyCostComponent, IconComponent, StatRowComponent, TippyDirective],
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

  public nextUpgrade = computed<RoomUpgradeContent | undefined>(() => {
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
    upgrade: RoomUpgradeContent,
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
    analyticsSendDesignEvent('Room:Altar:Upgrade');
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
    analyticsSendDesignEvent('Room:Altar:Recruit');
    const result = await recruitmentRecruit(def);
    if (result.success) {
      notifySuccess(`Recruited ${result.instance!.name} the ${def.name}!`);
    } else if (result.error) {
      notifyError(result.error);
    }
  }

  // --- Legendary Recruitment ---

  public legendaryInhabitants = computed<LegendaryEntry[]>(() => {
    const state = gamestate();
    const unlocked = legendaryInhabitantGetResearchUnlocked();

    return unlocked.map((def) => {
      const recruited = legendaryInhabitantIsRecruited(def.id, state.world.inhabitants);
      const result = legendaryInhabitantCanRecruit(
        def, state.world.inhabitants, state.world.floors, state.world.resources,
      );
      const affordable = resourceCanAfford(def.cost);
      const costEntries = Object.entries(def.cost)
        .filter(([, amount]) => amount && amount > 0)
        .map(([type, amount]) => ({ type: type as ResourceType, amount: amount as number }));

      return {
        def,
        recruited,
        canRecruit: result.allowed && affordable && !this.rosterFull(),
        affordable,
        requirements: result.missingRequirements,
        costEntries,
      };
    });
  });

  public hasLegendaries = computed(() => this.legendaryInhabitants().length > 0);

  public getLegendaryDisabledReason(entry: LegendaryEntry): string {
    if (entry.recruited) return 'Already recruited';
    if (this.rosterFull()) return 'Roster full';
    const unmet = entry.requirements.filter((r) => !r.met);
    if (unmet.length > 0) {
      return unmet.map((r) => r.requirement.description).join(', ');
    }
    if (!entry.affordable) return 'Insufficient resources';
    return '';
  }

  public async onRecruitLegendary(def: InhabitantContent): Promise<void> {
    analyticsSendDesignEvent('Room:Altar:Recruit:Legendary');
    const state = gamestate();
    const result = legendaryInhabitantCanRecruit(
      def, state.world.inhabitants, state.world.floors, state.world.resources,
    );
    if (!result.allowed) {
      notifyError('Requirements not met');
      return;
    }

    if (!resourceCanAfford(def.cost)) {
      notifyError('Not enough resources');
      return;
    }

    const paid = await resourcePayCost(def.cost);
    if (!paid) {
      notifyError('Not enough resources');
      return;
    }

    const instance: InhabitantInstance = {
      instanceId: rngUuid<InhabitantInstanceId>(),
      definitionId: def.id,
      name: generateInhabitantName(def.type),
      state: 'normal',
      assignedRoomId: undefined,
    };

    await inhabitantAdd(instance);
    notifySuccess(`Recruited ${instance.name} the ${def.name}!`);
  }
}
