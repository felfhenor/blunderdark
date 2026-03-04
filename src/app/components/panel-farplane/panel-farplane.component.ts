import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import {
  contentGetEntry,
  farplaneGetRecruitCost,
  farplaneGetSoulCapacity,
  farplaneRecruitSoul,
  findRoomByRole,
  gamestate,
  resourceCanAfford,
} from '@helpers';
import { recruitmentIsRosterFull } from '@helpers/recruitment';
import type {
  FarplaneSoulId,
  InhabitantInstance,
  InhabitantInstanceId,
  ResourceCost,
  ResourceType,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';

@Component({
  selector: 'app-panel-farplane',
  imports: [CurrencyCostComponent, InhabitantCardComponent, SFXDirective],
  templateUrl: './panel-farplane.component.html',
  styleUrl: './panel-farplane.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelFarplaneComponent {
  public farplaneRoom = computed(() => {
    return findRoomByRole('farplane')?.room;
  });

  public roomDef = computed(() => {
    const room = this.farplaneRoom();
    if (!room) return undefined;
    return contentGetEntry<RoomContent>(room.roomTypeId);
  });

  public souls = computed(() => {
    return gamestate().world.farplaneSouls;
  });

  public soulCapacity = computed(() => {
    return farplaneGetSoulCapacity();
  });

  public isRosterFull = recruitmentIsRosterFull;

  public soulEntries = computed(() => {
    return this.souls().map((soul) => {
      const def = contentGetEntry<InhabitantContent>(soul.definitionId);
      const cost = farplaneGetRecruitCost(soul.definitionId);
      const costEntries = Object.entries(cost)
        .filter(([, amount]) => amount > 0)
        .map(([type, amount]) => ({
          type: type as ResourceType,
          amount,
        }));
      const syntheticInstance: InhabitantInstance = {
        instanceId: soul.soulId as unknown as InhabitantInstanceId,
        definitionId: soul.definitionId,
        name: soul.instanceName,
        state: 'normal',
        assignedRoomId: undefined,
        instanceStatBonuses: soul.instanceStatBonuses,
        mutated: soul.mutated,
        mutationTraitIds: soul.mutationTraitIds,
        instanceTraitIds: soul.instanceTraitIds,
        isHybrid: soul.isHybrid,
        hybridParentIds: soul.hybridParentIds,
        isSummoned: soul.isSummoned,
      };
      return { soul, def, cost, costEntries, syntheticInstance };
    });
  });

  public canAfford(cost: ResourceCost): boolean {
    return resourceCanAfford(cost);
  }

  public async recruitSoul(soulId: FarplaneSoulId): Promise<void> {
    analyticsSendDesignEvent('Room:Farplane:Recruit');
    await farplaneRecruitSoul(soulId);
  }
}
