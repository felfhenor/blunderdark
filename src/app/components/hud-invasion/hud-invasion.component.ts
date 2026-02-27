import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { invaderGetDefinitionById } from '@helpers/invaders';
import { invasionIsActive } from '@helpers/invasion-process';
import { roomGetDisplayName } from '@helpers/room-upgrades';
import { gamestate } from '@helpers/state-game';

type InvaderHpInfo = {
  name: string;
  hp: number;
  maxHp: number;
  hpPercent: number;
  isLeader: boolean;
};

type ObjectiveStatus = {
  name: string;
  isCompleted: boolean;
  progress: number;
};

@Component({
  selector: 'app-hud-invasion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  host: {
    class: 'block pointer-events-auto',
  },
  template: `
    @if (invasionIsActive()) {
      <div
        class="bg-base-200/80 w-96 px-3 py-2 backdrop-blur-sm rounded-lg opacity-70 hover:opacity-100 transition-opacity duration-200"
      >
        <!-- Path progress -->
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold text-warning">Invasion</span>
          <span class="text-xs opacity-70">
            @if (pathProgress().floorLabel) {
              {{ pathProgress().floorLabel }} —
            }
            Room {{ pathProgress().current }} / {{ pathProgress().total }}
            @if (pathProgress().roomName) {
              — {{ pathProgress().roomName }}
            }
          </span>
        </div>

        <!-- Altar HP -->
        <div class="mb-1">
          <div class="flex items-center justify-between text-xs mb-0.5">
            <span>Altar</span>
            <span>
              {{ altarInfo().hp }}/{{ altarInfo().maxHp }}
              @if (altarInfo().isWeakened) {
                <span class="text-warning opacity-70">(weakened from {{ altarInfo().originalMaxHp }})</span>
              }
            </span>
          </div>
          <progress
            class="progress progress-error w-full h-2"
            [value]="altarInfo().hp"
            [max]="altarInfo().maxHp"
          ></progress>
        </div>

        <!-- Invader HP bars -->
        @if (livingInvaders().length > 0) {
          <div class="mb-1">
            <div class="text-xs font-semibold mb-0.5">
              Invaders ({{ livingInvaders().length }})
            </div>
            <div class="flex flex-col gap-0.5 max-h-24 overflow-y-auto">
              @for (inv of livingInvaders(); track inv.name + $index) {
                <div class="flex items-center gap-2">
                  <span class="text-xs truncate w-20">@if (inv.isLeader) {<span class="text-warning">&#9733;</span> }{{ inv.name }}</span>
                  <progress
                    class="progress flex-1 h-1.5"
                    [class.progress-success]="inv.hpPercent > 60"
                    [class.progress-warning]="
                      inv.hpPercent > 25 && inv.hpPercent <= 60
                    "
                    [class.progress-error]="inv.hpPercent <= 25"
                    [value]="inv.hp"
                    [max]="inv.maxHp"
                  ></progress>
                  <span class="text-xs opacity-50 w-8 text-right">
                    {{ inv.hp }}
                  </span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Objectives -->
        @if (objectives().length > 0) {
          <div>
            <div class="text-xs font-semibold mb-0.5">Objectives</div>
            @for (obj of objectives(); track obj.name) {
              <div class="flex items-center gap-2 text-xs">
                @if (obj.isCompleted) {
                  <span class="text-success">&#10003;</span>
                } @else {
                  <span class="opacity-40">&#9675;</span>
                }
                <span
                  [class.line-through]="obj.isCompleted"
                  [class.opacity-50]="obj.isCompleted"
                >
                  {{ obj.name }}
                </span>
                @if (!obj.isCompleted && obj.progress > 0) {
                  <span class="opacity-40">
                    ({{ obj.progress | number: '1.0-0' }}%)
                  </span>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class HudInvasionComponent {
  public readonly invasionIsActive = invasionIsActive;

  public pathProgress = computed(() => {
    const state = gamestate();
    const inv = state.world.activeInvasion;
    if (!inv || inv.completed) return { current: 0, total: 0, roomName: '', floorLabel: '' };

    const roomId = inv.path[inv.currentRoomIndex];
    const floorIndex = inv.roomFloorMap[roomId] ?? 0;
    const floor = state.world.floors[floorIndex];
    const room = floor?.rooms.find((r) => r.id === roomId);

    return {
      current: inv.currentRoomIndex + 1,
      total: inv.path.length,
      roomName: room ? roomGetDisplayName(room) : '',
      floorLabel: `F${floorIndex + 1}`,
    };
  });

  public altarInfo = computed(() => {
    const state = gamestate();
    const inv = state.world.activeInvasion;
    if (!inv) return { hp: 0, maxHp: 0, originalMaxHp: 0, isWeakened: false };

    const isWeakened = inv.altarMaxHpMultiplier < 1.0;
    return {
      hp: inv.invasionState.altarHp,
      maxHp: inv.invasionState.altarMaxHp,
      originalMaxHp: 100,
      isWeakened,
    };
  });

  public livingInvaders = computed((): InvaderHpInfo[] => {
    const state = gamestate();
    const inv = state.world.activeInvasion;
    if (!inv || inv.completed) return [];

    const result: InvaderHpInfo[] = [];
    for (const invader of inv.invasionState.invaders) {
      const hp = inv.invaderHpMap[invader.id] ?? invader.currentHp;
      if (hp <= 0) continue;

      const def = invaderGetDefinitionById(invader.definitionId);
      result.push({
        name: def?.name ?? 'Invader',
        hp,
        maxHp: invader.maxHp,
        hpPercent: (hp / invader.maxHp) * 100,
        isLeader: invader.isLeader,
      });
    }
    return result;
  });

  public objectives = computed((): ObjectiveStatus[] => {
    const state = gamestate();
    const inv = state.world.activeInvasion;
    if (!inv) return [];

    return inv.invasionState.objectives.map((obj) => ({
      name: obj.name,
      isCompleted: obj.isCompleted,
      progress: obj.progress * 100,
    }));
  });
}
