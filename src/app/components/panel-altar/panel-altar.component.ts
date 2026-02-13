import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  altarRoomFearReductionAura,
  altarRoomLevel,
  altarRoomApplyUpgrade,
  resourceCanAfford,
  altarRoomCanRecruit,
  floorCurrent,
  recruitmentCurrentInhabitantCount,
  roomRoleFindById,
  gamestate,
  altarRoomGetNextUpgrade,
  recruitmentGetRecruitable,
  recruitmentGetShortfall,
  recruitmentIsRosterFull,
  recruitmentMaxInhabitantCount,
  notifyError,
  notifySuccess,
  recruitmentRecruit,
  gridSelectedTile,
  recruitmentUnlockedTier,
} from '@helpers';
import type {
  InhabitantDefinition,
  IsContentItem,
  ResourceType,
  RoomUpgradePath,
} from '@interfaces';
import { TippyDirective } from '@ngneat/helipopper';

type RecruitableEntry = {
  def: InhabitantDefinition & IsContentItem;
  affordable: boolean;
  locked: boolean;
  shortfall: { type: ResourceType; needed: number }[];
  costEntries: { type: string; amount: number }[];
};

@Component({
  selector: 'app-panel-altar',
  imports: [TippyDirective],
  templateUrl: './panel-altar.component.html',
  styleUrl: './panel-altar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAltarComponent {
  public altarRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== roomRoleFindById('altar')) return undefined;

    return room;
  });

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

    return defs.map((def) => {
      const locked = def.tier > tier;
      const affordable = !locked && resourceCanAfford(def.cost);
      const shortfall =
        !locked && !affordable
          ? recruitmentGetShortfall(def.cost, state.world.resources)
          : [];
      const costEntries = Object.entries(def.cost)
        .filter(([, amount]) => amount && amount > 0)
        .map(([type, amount]) => ({ type, amount: amount as number }));

      return { def, affordable, locked, shortfall, costEntries };
    });
  });

  public getCostEntries(
    upgrade: RoomUpgradePath,
  ): { type: string; amount: number }[] {
    return Object.entries(upgrade.cost)
      .filter(([, amount]) => amount && amount > 0)
      .map(([type, amount]) => ({ type, amount: amount as number }));
  }

  public capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  public isResourceShort(entry: RecruitableEntry, costType: string): boolean {
    return entry.shortfall.some((s) => s.type === costType);
  }

  public getDisabledReason(entry: RecruitableEntry): string {
    if (this.rosterFull()) return 'Roster full';
    if (entry.locked) return `Requires Tier ${entry.def.tier}`;
    if (!entry.affordable) {
      const parts = entry.shortfall.map(
        (s) => `${s.needed} more ${this.capitalizeFirst(s.type)}`,
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

  public async onRecruit(def: InhabitantDefinition): Promise<void> {
    const result = await recruitmentRecruit(def);
    if (result.success) {
      notifySuccess(`Recruited ${def.name}!`);
    } else if (result.error) {
      notifyError(result.error);
    }
  }
}
