import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  altarFearReductionAura,
  altarLevel,
  applyAltarUpgrade,
  canAfford,
  canRecruit,
  currentFloor,
  gamestate,
  getNextAltarUpgrade,
  notifyError,
  notifySuccess,
  selectedTile,
  ALTAR_ROOM_TYPE_ID,
} from '@helpers';
import type { RoomUpgradePath } from '@interfaces';

@Component({
  selector: 'app-panel-altar',
  templateUrl: './panel-altar.component.html',
  styleUrl: './panel-altar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAltarComponent {
  public altarRoom = computed(() => {
    const tile = selectedTile();
    const floor = currentFloor();
    if (!tile || !floor) return null;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return null;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== ALTAR_ROOM_TYPE_ID) return null;

    return room;
  });

  public fearReduction = altarFearReductionAura;
  public recruitmentAvailable = canRecruit;
  public level = altarLevel;

  public nextUpgrade = computed<RoomUpgradePath | null>(() => {
    return getNextAltarUpgrade(gamestate().world.floors);
  });

  public canAffordUpgrade = computed(() => {
    const upgrade = this.nextUpgrade();
    if (!upgrade) return false;
    return canAfford(upgrade.cost);
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

  public async onUpgrade(): Promise<void> {
    const upgrade = this.nextUpgrade();
    if (!upgrade) return;

    const result = await applyAltarUpgrade(upgrade.id);
    if (result.success) {
      notifySuccess(`Altar upgraded to ${upgrade.name}`);
    } else if (result.error) {
      notifyError(result.error);
    }
  }
}
