import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { HungerIndicatorComponent } from '@components/hunger-indicator/hunger-indicator.component';
import { IconComponent } from '@components/icon/icon.component';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import { efficiencyDoesTraitApply } from '@helpers/efficiency';
import { inhabitantGetAssignmentLabel } from '@helpers/inhabitants';
import { productionGetRoomDefinition } from '@helpers/production';
import { gamestate } from '@helpers/state-game';
import { synergyGetDefinitions } from '@helpers/synergy';
import type { InhabitantInstance, PlacedRoomId, RoomId } from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-inhabitant-card',
  imports: [DecimalPipe, NgClass, HungerIndicatorComponent, IconComponent, StatNameComponent, TippyDirective],
  templateUrl: './inhabitant-card.component.html',
  styleUrl: './inhabitant-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InhabitantCardComponent {
  public instance = input.required<InhabitantInstance>();
  public definition = input.required<InhabitantContent>();
  public showStats = input(true);
  public showTraits = input(true);
  public showAssignment = input(true);
  public showState = input(true);
  public showType = input(false);
  public showWorkerEfficiency = input(true);
  public showInstanceName = input(true);
  public showDefinitionName = input(true);
  public showHybridBadge = input(false);
  public showHunger = input(true);
  public synergyRoomId = input<PlacedRoomId | undefined>(undefined);
  public compact = input(false);

  public assignmentLabel = computed(() =>
    inhabitantGetAssignmentLabel(this.instance().assignedRoomId),
  );

  public stateClass = computed(() => {
    const state = this.instance().state;
    if (state === 'scared') return 'badge-error';
    if (state === 'hungry') return 'badge-warning';
    if (state === 'starving') return 'badge-error';
    return 'badge-success';
  });

  public synergyInfo = computed(() => {
    const roomId = this.synergyRoomId();
    if (!roomId) return undefined;

    const def = this.definition();

    // Resolve placed room to get its roomTypeId
    const floors = gamestate().world.floors;
    let roomTypeId: RoomId | undefined;
    for (const floor of floors) {
      const placedRoom = floor.rooms.find((r) => r.id === roomId);
      if (placedRoom) {
        roomTypeId = placedRoom.roomTypeId;
        break;
      }
    }
    if (!roomTypeId) return undefined;

    const roomDef = productionGetRoomDefinition(roomTypeId);
    if (!roomDef) return undefined;

    const reasons: string[] = [];

    // Check trait-room match
    for (const trait of def.traits) {
      if (trait.effectType !== 'production_bonus') continue;

      // Check targetRoomId match
      if (trait.targetRoomId && trait.targetRoomId === roomDef.id) {
        const pct = Math.round(trait.effectValue * 100);
        reasons.push(`Production bonus: +${pct}% (${trait.name})`);
        continue;
      }

      // Check targetResourceType match via production
      if (efficiencyDoesTraitApply(trait, roomDef.production)) {
        const pct = Math.round(trait.effectValue * 100);
        const resource = trait.targetResourceType ?? 'all';
        reasons.push(`Production bonus: +${pct}% ${resource} (${trait.name})`);
      }
    }

    // Check synergy condition match
    const synergies = synergyGetDefinitions();
    for (const synergy of synergies) {
      const hasRoomTypeCondition = synergy.conditions.some(
        (c) => c.type === 'roomType' && c.roomTypeId === roomDef.id,
      );
      if (!hasRoomTypeCondition) continue;

      const hasInhabitantTypeCondition = synergy.conditions.some(
        (c) => c.type === 'inhabitantType' && c.inhabitantType === def.type,
      );
      if (hasInhabitantTypeCondition) {
        reasons.push(`Activates synergy: ${synergy.name}`);
      }
    }

    return reasons.length > 0 ? reasons : undefined;
  });
}
