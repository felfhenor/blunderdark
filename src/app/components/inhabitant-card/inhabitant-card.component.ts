import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { HungerIndicatorComponent } from '@components/hunger-indicator/hunger-indicator.component';
import { IconComponent } from '@components/icon/icon.component';
import { StatRowComponent } from '@components/stat-row/stat-row.component';
import { contentGetEntry } from '@helpers/content';
import { effectiveStatsCalculate } from '@helpers/effective-stats';
import { efficiencyDoesTraitApply } from '@helpers/efficiency';
import { fearLevelRoomMap } from '@helpers/fear-level';
import {
  formatMultiplierAsPercentage,
  formatTierBadgeClass,
} from '@helpers/format';
import { inhabitantGetAssignmentLabel } from '@helpers/inhabitants';
import { productionGetRoomDefinition } from '@helpers/production';
import { gamestate } from '@helpers/state-game';
import { workAffinityGetLabel, WORK_CATEGORY_LABELS } from '@helpers/work-affinity';
import {
  stateModifierGet,
  stateModifierGetFearTolerance,
} from '@helpers/state-modifiers';
import { synergyGetDefinitions } from '@helpers/synergy';
import type {
  ForgeRecipeContent,
  InhabitantInstance,
  InhabitantTraitContent,
  MutationTraitContent,
  PlacedRoomId,
  RoomId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-inhabitant-card',
  imports: [
    DecimalPipe,
    NgClass,
    HungerIndicatorComponent,
    IconComponent,
    StatRowComponent,
    TippyDirective,
  ],
  templateUrl: './inhabitant-card.component.html',
  styleUrl: './inhabitant-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InhabitantCardComponent {
  public instance = input.required<InhabitantInstance>();
  public definition = input.required<InhabitantContent>();
  public showStats = input(true);
  public showTraits = input(false);
  public showAssignment = input(true);
  public showState = input(true);
  public showType = input(false);
  public showWorkerEfficiency = input(true);
  public showInstanceName = input(true);
  public showDefinitionName = input(true);
  public showHunger = input(false);
  public showTier = input(true);
  public synergyRoomId = input<PlacedRoomId | undefined>(undefined);
  public compact = input(false);

  public tierClass = computed(() => formatTierBadgeClass(this.definition().tier));

  public effectiveStats = computed(() =>
    effectiveStatsCalculate(this.definition(), this.instance()),
  );

  public mutationTraits = computed(() => {
    const ids = this.instance().mutationTraitIds;
    if (!ids || ids.length === 0) return [];
    const traits: MutationTraitContent[] = [];
    for (const id of ids) {
      const trait = contentGetEntry<MutationTraitContent>(id);
      if (trait) traits.push(trait);
    }
    return traits;
  });

  public instanceTraits = computed(() => {
    const ids = this.instance().instanceTraitIds;
    if (!ids || ids.length === 0) return [];
    const traits: InhabitantTraitContent[] = [];
    for (const id of ids) {
      const trait = contentGetEntry<InhabitantTraitContent>(id);
      if (trait) traits.push(trait);
    }
    return traits;
  });

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

  public stateTooltip = computed(() => {
    const inst = this.instance();
    const state = inst.state;
    const modifier = stateModifierGet(inst.definitionId, state);

    const lines: { label: string; value: string }[] = [];

    if (state === 'normal') {
      return {
        title: 'Normal',
        description: 'No status effects.',
        lines: [],
      };
    }

    // Build effect lines
    if (modifier.productionMultiplier !== 1.0) {
      lines.push({
        label: 'Production',
        value: formatMultiplierAsPercentage(modifier.productionMultiplier),
      });
    }
    if (modifier.attackMultiplier !== undefined && modifier.attackMultiplier !== 1.0) {
      lines.push({
        label: 'Attack',
        value: formatMultiplierAsPercentage(modifier.attackMultiplier),
      });
    }
    if (modifier.defenseMultiplier !== undefined && modifier.defenseMultiplier !== 1.0) {
      lines.push({
        label: 'Defense',
        value: formatMultiplierAsPercentage(modifier.defenseMultiplier),
      });
    }
    if (modifier.foodConsumptionMultiplier !== 1.0) {
      lines.push({
        label: 'Food consumption',
        value: formatMultiplierAsPercentage(modifier.foodConsumptionMultiplier),
      });
    }

    if (state === 'scared') {
      const tolerance = stateModifierGetFearTolerance(inst.definitionId);
      const roomFear = inst.assignedRoomId
        ? (fearLevelRoomMap().get(inst.assignedRoomId) ?? 0)
        : 0;
      return {
        title: 'Scared',
        description: `Room fear (${roomFear}) exceeds tolerance (${tolerance}).`,
        lines,
      };
    }

    if (state === 'hungry') {
      return {
        title: 'Hungry',
        description: 'Not enough food. Feed your inhabitants!',
        lines,
      };
    }

    // starving
    return {
      title: 'Starving',
      description: 'Critically low on food!',
      lines,
    };
  });

  private resolvedRoomDef = computed(() => {
    const roomId = this.synergyRoomId();
    if (!roomId) return undefined;

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
    return productionGetRoomDefinition(roomTypeId);
  });

  public synergyInfo = computed(() => {
    const roomDef = this.resolvedRoomDef();
    if (!roomDef) return undefined;

    const def = this.definition();
    const reasons: string[] = [];

    // Check trait-room match
    for (const trait of def.traits) {
      for (const effect of trait.effects) {
        if (effect.effectType !== 'production_multiplier') continue;

        // Check targetRoomId match
        if (effect.targetRoomId && effect.targetRoomId === roomDef.id) {
          const pct = Math.round(effect.effectValue * 100);
          reasons.push(`Production bonus: +${pct}% (${trait.name})`);
          continue;
        }

        // Check targetResourceType match via production
        if (efficiencyDoesTraitApply(effect, roomDef.production)) {
          const pct = Math.round(effect.effectValue * 100);
          const resource = effect.targetResourceType ?? 'all';
          reasons.push(`Production bonus: +${pct}% ${resource} (${trait.name})`);
        }
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

    // Check work category affinity
    const affinity = workAffinityGetLabel(def.type, roomDef.workCategory);
    if (affinity === 'preferred') {
      const label = roomDef.workCategory ? WORK_CATEGORY_LABELS[roomDef.workCategory] : '';
      reasons.push(`Preferred work: ${label} (+15%)`);
    }

    return reasons.length > 0 ? reasons : undefined;
  });

  public affinityWarning = computed(() => {
    const roomDef = this.resolvedRoomDef();
    if (!roomDef) return undefined;

    const def = this.definition();
    const affinity = workAffinityGetLabel(def.type, roomDef.workCategory);
    if (affinity !== 'disliked') return undefined;

    const label = roomDef.workCategory ? WORK_CATEGORY_LABELS[roomDef.workCategory] : '';
    return `Disliked work: ${label} (-25%)`;
  });

  public equippedTraits = computed(() => {
    const ids = this.instance().equippedTraitIds;
    if (!ids || ids.length === 0) return [];
    const traits: InhabitantTraitContent[] = [];
    for (const id of ids) {
      const trait = contentGetEntry<InhabitantTraitContent>(id);
      if (trait) traits.push(trait);
    }
    return traits;
  });

  public equippedItemName = computed(() => {
    const recipeId = this.instance().equippedForgeItemRecipeId;
    if (!recipeId) return undefined;
    const recipe = contentGetEntry<ForgeRecipeContent>(recipeId);
    return recipe?.name;
  });
}
