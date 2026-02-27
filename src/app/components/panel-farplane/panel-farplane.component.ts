import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { StatRowComponent } from '@components/stat-row/stat-row.component';
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
  ResourceCost,
  ResourceType,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';

@Component({
  selector: 'app-panel-farplane',
  imports: [CurrencyCostComponent, StatRowComponent],
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
      return { soul, def, cost, costEntries };
    });
  });

  public canAfford(cost: ResourceCost): boolean {
    return resourceCanAfford(cost);
  }

  public async recruitSoul(soulId: FarplaneSoulId): Promise<void> {
    await farplaneRecruitSoul(soulId);
  }
}
