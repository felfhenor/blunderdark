import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  signal,
} from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { IconComponent } from '@components/icon/icon.component';
import { ModalComponent } from '@components/modal/modal.component';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import {
  RESEARCH_BASE_PROGRESS_PER_TICK,
  researchArePrerequisitesMet,
  researchCanStart,
  researchCancel,
  researchSpeedModifier,
  researchStart,
} from '@helpers/research-progress';
import { resourceCanAfford } from '@helpers/resources';
import { gamestate } from '@helpers/state-game';
import type {
  ResearchBranch,
  ResearchContent,
  ResourceCost,
  ResourceType,
  RoomContent,
  UnlockEffect,
} from '@interfaces';
import { TippyDirective } from '@ngneat/helipopper';

type NodeState = 'completed' | 'active' | 'available' | 'locked';

@Component({
  selector: 'app-game-research',
  imports: [DecimalPipe, CurrencyNameComponent, ModalComponent, TippyDirective, IconComponent],
  templateUrl: './game-research.component.html',
  styleUrl: './game-research.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameResearchComponent {
  public visible = model<boolean>(false);

  public selectedBranch = signal<ResearchBranch>('dark');
  public selectedNodeId = signal<string | undefined>(undefined);

  public allNodes = computed(() => {
    return contentGetEntriesByType<ResearchContent>('research');
  });

  public branchNodes = computed(() => {
    const branch = this.selectedBranch();
    return this.allNodes().filter((n) => n.branch === branch);
  });

  public researchState = computed(() => gamestate().world.research);

  public activeResearchNode = computed(() => {
    const activeId = this.researchState().activeResearch;
    if (!activeId) return undefined;
    return contentGetEntry<ResearchContent>(activeId);
  });

  public progressPercent = computed(() => {
    const active = this.activeResearchNode();
    if (!active) return 0;
    const progress = this.researchState().activeResearchProgress;
    return Math.min(100, (progress / active.requiredTicks) * 100);
  });

  public estimatedTimeRemaining = computed(() => {
    const active = this.activeResearchNode();
    if (!active) return '';
    const progress = this.researchState().activeResearchProgress;
    const remaining = active.requiredTicks - progress;
    if (remaining <= 0) return 'Complete';
    const speed = researchSpeedModifier();
    const ticksRemaining =
      remaining / (RESEARCH_BASE_PROGRESS_PER_TICK * speed);
    const gameMinutes = ticksRemaining / GAME_TIME_TICKS_PER_MINUTE;
    if (gameMinutes < 1) return '< 1 min';
    if (gameMinutes < 60) return `${Math.ceil(gameMinutes)} min`;
    const hours = Math.floor(gameMinutes / 60);
    const mins = Math.ceil(gameMinutes % 60);
    return `${hours}h ${mins}m`;
  });

  public speedModifier = researchSpeedModifier;

  public tierNodes = computed(() => {
    const nodes = this.branchNodes();
    const state = this.researchState();
    const tiers = new Map<
      number,
      (ResearchContent & { nodeState: NodeState })[]
    >();

    for (const node of nodes) {
      const nodeState = this.getNodeState(node, state);
      const tier = node.tier;
      if (!tiers.has(tier)) tiers.set(tier, []);
      tiers.get(tier)!.push({ ...node, nodeState });
    }

    return [...tiers.entries()]
      .sort(([a], [b]) => a - b)
      .map(([tier, tierNodes]) => ({ tier, nodes: tierNodes }));
  });

  public selectedNode = computed(() => {
    const id = this.selectedNodeId();
    if (!id) return undefined;
    return contentGetEntry<ResearchContent>(id);
  });

  public selectedNodeState = computed((): NodeState | undefined => {
    const node = this.selectedNode();
    if (!node) return undefined;
    return this.getNodeState(node, this.researchState());
  });

  public selectedNodeCanStart = computed(() => {
    const node = this.selectedNode();
    if (!node) return { canStart: false, error: 'No node selected' };
    return researchCanStart(node.id, this.researchState());
  });

  public selectedNodePrereqs = computed(() => {
    const node = this.selectedNode();
    if (!node) return [];
    const completed = this.researchState().completedNodes;
    return node.prerequisiteResearchIds.map((id) => {
      const prereq = contentGetEntry<ResearchContent>(id);
      return { name: prereq?.name ?? 'Unknown', met: completed.includes(id) };
    });
  });

  public selectedNodeUnlocks = computed(() => {
    const node = this.selectedNode();
    if (!node) return [];
    return node.unlocks.map((unlock) => this.formatUnlock(unlock));
  });

  public selectedNodeCanAfford = computed(() => {
    const node = this.selectedNode();
    if (!node) return false;
    return resourceCanAfford(node.cost);
  });

  // Connection lines between nodes
  public connections = computed(() => {
    const nodes = this.branchNodes();
    const result: { fromId: string; toId: string }[] = [];
    for (const node of nodes) {
      for (const prereqId of node.prerequisiteResearchIds) {
        const prereq = nodes.find((n) => n.id === prereqId);
        if (prereq) {
          result.push({ fromId: prereqId, toId: node.id });
        }
      }
    }
    return result;
  });

  private getNodeState(
    node: ResearchContent,
    state: { completedNodes: string[]; activeResearch: string | undefined },
  ): NodeState {
    if (state.completedNodes.includes(node.id)) return 'completed';
    if (state.activeResearch === node.id) return 'active';
    if (researchArePrerequisitesMet(node, state.completedNodes))
      return 'available';
    return 'locked';
  }

  public selectBranch(branch: ResearchBranch): void {
    this.selectedBranch.set(branch);
    this.selectedNodeId.set(undefined);
  }

  public selectNode(nodeId: string): void {
    this.selectedNodeId.set(
      this.selectedNodeId() === nodeId ? undefined : nodeId,
    );
  }

  public async startResearch(): Promise<void> {
    const node = this.selectedNode();
    if (!node) return;
    await researchStart(node.id);
  }

  public async cancelResearch(): Promise<void> {
    await researchCancel();
  }

  public close(): void {
    this.visible.set(false);
  }

  public formatCost(cost: ResourceCost): { type: ResourceType; amount: number }[] {
    return Object.entries(cost)
      .filter(([, amount]) => amount && amount > 0)
      .map(([type, amount]) => ({ type: type as ResourceType, amount: amount! }));
  }

  private formatUnlock(unlock: UnlockEffect): {
    type: string;
    name: string;
  } {
    switch (unlock.type) {
      case 'room': {
        const entry = contentGetEntry(unlock.targetRoomId);
        return { type: 'Room', name: entry?.name ?? 'Unknown' };
      }
      case 'inhabitant': {
        const entry = contentGetEntry(unlock.targetInhabitantId);
        return { type: 'Inhabitant', name: entry?.name ?? 'Unknown' };
      }
      case 'ability': {
        const entry = contentGetEntry(unlock.targetCombatabilityId);
        return { type: 'Ability', name: entry?.name ?? 'Unknown' };
      }
      case 'upgrade': {
        const rooms =
          contentGetEntriesByType<RoomContent>('room');
        for (const room of rooms) {
          const path = room.upgradePaths?.find(
            (p) => p.id === unlock.targetUpgradepathId,
          );
          if (path) return { type: 'Upgrade', name: path.name };
        }
        return { type: 'Upgrade', name: 'Unknown' };
      }
      case 'passive_bonus':
        return { type: 'Bonus', name: unlock.description };
    }
  }

  public getNodeProgressPercent(nodeId: string): number {
    const state = this.researchState();
    if (state.activeResearch !== nodeId) return 0;
    const node = contentGetEntry<ResearchContent>(nodeId);
    if (!node) return 0;
    return Math.min(
      100,
      (state.activeResearchProgress / node.requiredTicks) * 100,
    );
  }
}
