import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { contentGetEntry } from '@helpers/content';
import { gameEventTimeToMinutes } from '@helpers/game-events';
import { invaderGetDefinitionById } from '@helpers/invaders';
import {
  invasionTriggerPendingWarning,
  invasionTriggerWarningActive,
} from '@helpers/invasion-triggers';
import { gamestate } from '@helpers/state-game';
import type { PlacedRoomId } from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';
import { TippyDirective } from '@ngneat/helipopper';

type InvaderGroup = {
  className: string;
  count: number;
  hasLeader: boolean;
};

type ObjectiveInfo = {
  name: string;
  targetRoomName: string | undefined;
};

@Component({
  selector: 'app-badge-invasion-warning',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TippyDirective],
  host: {
    '[class.hidden]': '!invasionTriggerWarningActive()',
  },
  template: `
    <span
      class="badge badge-warning badge-soft badge-outline invasion-warning-badge whitespace-nowrap text-xs font-semibold"
      [tp]="tooltipTpl"
      tpPlacement="bottom"
    >
      Invasion incoming! ({{ remainingTime() }})
    </span>

    <ng-template #tooltipTpl>
      <div class="text-xs">
        <div class="font-semibold mb-1">Arrives:</div>

        <div class="mb-1">
          Day {{ arrivalDay() }} 00:00 ({{ remainingTime() }})
        </div>

        @if (invaderGroups().length > 0) {
          <div class="font-semibold mb-1">Invaders:</div>
          @for (group of invaderGroups(); track group.className) {
            <div>{{ group.count }}x {{ group.className }}@if (group.hasLeader) { <span class="text-warning">(Leader)</span>}</div>
          }
        }

        @if (objectiveInfos().length > 0) {
          <div class="font-semibold mt-2 mb-1">Objectives:</div>
          @for (obj of objectiveInfos(); track obj.name) {
            <div>
              {{ obj.name }}
              @if (obj.targetRoomName) {
                <span class="opacity-60">— {{ obj.targetRoomName }}</span>
              }
            </div>
          }
        }
      </div>
    </ng-template>
  `,
  styles: `
    .invasion-warning-badge {
      animation: invasion-warning-pulse 1.5s ease-in-out infinite;
    }

    @keyframes invasion-warning-pulse {
      50% {
        opacity: 0.4;
      }
    }
  `,
})
export class BadgeInvasionWarningComponent {
  public readonly invasionTriggerWarningActive = invasionTriggerWarningActive;

  public arrivalDay = computed(() => {
    return gamestate().world.invasionSchedule.nextInvasionDay ?? 0;
  });

  public remainingTime = computed(() => {
    const state = gamestate();
    const nextDay = state.world.invasionSchedule.nextInvasionDay;
    if (nextDay === undefined) return '';

    const invasionMinutes = gameEventTimeToMinutes({
      day: nextDay,
      hour: 0,
      minute: 0,
    });
    const currentMinutes = gameEventTimeToMinutes({
      day: state.clock.day,
      hour: state.clock.hour,
      minute: state.clock.minute,
    });
    const remaining = Math.max(0, invasionMinutes - currentMinutes);

    const days = Math.floor(remaining / (24 * 60));
    const hours = Math.floor((remaining % (24 * 60)) / 60);
    const minutes = remaining % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  });

  public invaderGroups = computed((): InvaderGroup[] => {
    const warning = invasionTriggerPendingWarning();
    if (!warning) return [];

    const groupMap = new Map<string, { count: number; hasLeader: boolean }>();
    for (const invader of warning.invaders) {
      const def = invaderGetDefinitionById(invader.definitionId);
      const className = def?.invaderClass ?? 'Unknown';
      const existing = groupMap.get(className) ?? { count: 0, hasLeader: false };
      existing.count++;
      if (invader.isLeader) existing.hasLeader = true;
      groupMap.set(className, existing);
    }

    const groups: InvaderGroup[] = [];
    for (const [className, { count, hasLeader }] of groupMap) {
      groups.push({ className, count, hasLeader });
    }
    return groups;
  });

  public objectiveInfos = computed((): ObjectiveInfo[] => {
    const warning = invasionTriggerPendingWarning();
    if (!warning) return [];

    return warning.objectives
      .filter((obj) => !obj.isPrimary)
      .map((obj) => ({
        name: obj.name,
        targetRoomName: this.resolveTargetRoomName(obj.targetId),
      }));
  });

  private resolveTargetRoomName(
    targetId: string | undefined,
  ): string | undefined {
    if (!targetId) return undefined;

    const state = gamestate();
    for (const floor of state.world.floors) {
      const room = floor.rooms.find((r) => r.id === (targetId as PlacedRoomId));
      if (room) {
        const def = contentGetEntry<RoomContent>(room.roomTypeId);
        const baseName = def?.name ?? 'Unknown Room';
        return room.suffix ? `${baseName} ${room.suffix}` : baseName;
      }
    }
    return undefined;
  }
}
