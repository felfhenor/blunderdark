import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { contentGetEntry } from '@helpers/content';
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
      class="invasion-warning-badge px-1.5 rounded whitespace-nowrap text-warning text-xs font-semibold"
      [tp]="tooltipTpl"
      tpPlacement="bottom"
    >
      Invasion incoming!
    </span>

    <ng-template #tooltipTpl>
      <div class="text-xs">
        @if (invaderGroups().length > 0) {
          <div class="font-semibold mb-1">Invaders:</div>
          @for (group of invaderGroups(); track group.className) {
            <div>{{ group.count }}x {{ group.className }}</div>
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
      background: color-mix(in oklch, var(--color-warning) 15%, transparent);
      border: 1px solid
        color-mix(in oklch, var(--color-warning) 40%, transparent);
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

  public invaderGroups = computed((): InvaderGroup[] => {
    const warning = invasionTriggerPendingWarning();
    if (!warning) return [];

    const groupMap = new Map<string, number>();
    for (const invader of warning.invaders) {
      const def = invaderGetDefinitionById(invader.definitionId);
      const className = def?.invaderClass ?? 'Unknown';
      groupMap.set(className, (groupMap.get(className) ?? 0) + 1);
    }

    const groups: InvaderGroup[] = [];
    for (const [className, count] of groupMap) {
      groups.push({ className, count });
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
