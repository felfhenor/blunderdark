import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  signal,
} from '@angular/core';
import { ButtonCloseComponent } from '@components/button-close/button-close.component';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import { IconComponent } from '@components/icon/icon.component';
import { ModalComponent } from '@components/modal/modal.component';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { signalLocalStorage } from '@helpers/signal';
import { formatDurationSeconds } from '@helpers/game-time';
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
import { optionsGet } from '@helpers/state-options';
import type {
  CombatAbilityContent,
  FeatureContent,
  InhabitantContent,
  ResearchBranch,
  ResearchContent,
  RoomContent,
  RoomUpgradeContent,
  UnlockEffect,
} from '@interfaces';
import { BIOME_DATA } from '@interfaces/biome';
import { TippyDirective } from '@ngneat/helipopper';
import { SFXDirective } from '@directives/sfx.directive';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { sortBy } from 'es-toolkit/compat';

import { ResearchStateBadgeComponent } from '@components/research-state-badge/research-state-badge.component';
import type { ResearchNodeState } from '@interfaces';

type NodeState = ResearchNodeState;

@Component({
  selector: 'app-game-research',
  imports: [
    ButtonCloseComponent,
    DecimalPipe,
    CurrencyCostListComponent,
    ModalComponent,
    TippyDirective,
    IconComponent,
    SFXDirective,
    SweetAlert2Module,
    ResearchStateBadgeComponent,
  ],
  templateUrl: './game-research.component.html',
  styleUrl: './game-research.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameResearchComponent {
  public visible = model<boolean>(false);

  public searchQuery = signal('');

  public selectedBranch = signalLocalStorage<ResearchBranch>(
    'researchSelectedBranch',
    'arcane',
  );
  public selectedNodeId = signal<string | undefined>(undefined);

  public allNodes = computed(() => {
    return contentGetEntriesByType<ResearchContent>('research');
  });

  public availableBranches = computed<ResearchBranch[]>(() => {
    const nodes = this.allNodes();
    const branches = new Set<ResearchBranch>();
    for (const node of nodes) {
      branches.add(node.branch);
    }
    return [...branches];
  });

  private upgradeToRoomName = computed(() => {
    const rooms = contentGetEntriesByType<RoomContent>('room');
    const map = new Map<string, string>();
    for (const room of rooms) {
      for (const upgradeId of room.roomUpgradeIds) {
        map.set(upgradeId, room.name);
      }
    }
    return map;
  });

  public matchingNodeIds = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return undefined;
    const nodes = this.allNodes();
    const upgradeRoomNames = this.upgradeToRoomName();
    const ids = new Set<string>();
    for (const node of nodes) {
      if (this.nodeMatchesSearch(node, query, upgradeRoomNames)) {
        ids.add(node.id);
      }
    }
    return ids;
  });

  public branchMatchCounts = computed(() => {
    const matching = this.matchingNodeIds();
    if (!matching) return new Map<ResearchBranch, number>();
    const nodes = this.allNodes();
    const counts = new Map<ResearchBranch, number>();
    for (const node of nodes) {
      if (matching.has(node.id)) {
        counts.set(node.branch, (counts.get(node.branch) ?? 0) + 1);
      }
    }
    return counts;
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
    const gameSpeed = optionsGet('gameSpeed');
    const realSeconds =
      remaining / (RESEARCH_BASE_PROGRESS_PER_TICK * speed * gameSpeed);

    return formatDurationSeconds(realSeconds);
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

    const tierGroups = [...tiers.entries()].map(([tier, tierNodes]) => ({
      tier,
      nodes: tierNodes,
    }));
    return sortBy(tierGroups, [(g) => g.tier]);
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

  public selectedNodeResearchTime = computed(() => {
    const node = this.selectedNode();
    if (!node) return '';
    const speed = researchSpeedModifier();
    const gameSpeed = optionsGet('gameSpeed');
    const totalSeconds =
      node.requiredTicks /
      (RESEARCH_BASE_PROGRESS_PER_TICK * speed * gameSpeed);
    return formatDurationSeconds(totalSeconds);
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
    analyticsSendDesignEvent('Research:Node:Select');
    this.selectedNodeId.set(
      this.selectedNodeId() === nodeId ? undefined : nodeId,
    );
  }

  public async startResearch(): Promise<void> {
    analyticsSendDesignEvent('Research:Start');
    const node = this.selectedNode();
    if (!node) return;
    await researchStart(node.id);
  }

  public async onConfirmCancel(): Promise<void> {
    analyticsSendDesignEvent('Research:Cancel');
    await researchCancel();
  }

  public close(): void {
    this.visible.set(false);
  }

  private formatUnlock(unlock: UnlockEffect): {
    type: string;
    name: string;
    description: string;
  } {
    switch (unlock.type) {
      case 'room': {
        const entry = contentGetEntry<RoomContent>(unlock.targetRoomId);
        return {
          type: 'Room',
          name: entry?.name ?? 'Unknown',
          description: entry?.description ?? '',
        };
      }
      case 'inhabitant': {
        const entry = contentGetEntry<InhabitantContent>(
          unlock.targetInhabitantId,
        );
        return {
          type: 'Inhabitant',
          name: entry?.name ?? 'Unknown',
          description: entry?.description ?? '',
        };
      }
      case 'ability': {
        const entry = contentGetEntry<CombatAbilityContent>(
          unlock.targetCombatabilityId,
        );
        return {
          type: 'Ability',
          name: entry?.name ?? 'Unknown',
          description: entry?.description ?? '',
        };
      }
      case 'roomupgrade': {
        const entry = contentGetEntry<RoomUpgradeContent>(
          unlock.targetRoomupgradeId,
        );
        return {
          type: 'Upgrade',
          name: entry?.name ?? 'Unknown',
          description: entry?.description ?? '',
        };
      }
      case 'passive_bonus':
        return { type: 'Bonus', name: unlock.description, description: '' };
      case 'feature_flag':
        return { type: 'Feature', name: unlock.description, description: '' };
      case 'biome': {
        const biome = BIOME_DATA[unlock.targetBiome];
        return {
          type: 'Biome',
          name: biome?.name ?? 'Unknown',
          description: biome?.description ?? '',
        };
      }
      case 'roomfeature': {
        const entry = contentGetEntry<FeatureContent>(unlock.targetFeatureId);
        return {
          type: 'Feature',
          name: entry?.name ?? 'Unknown',
          description: entry?.description ?? '',
        };
      }
    }
  }

  public getBranchMatchCount(branch: ResearchBranch): number {
    return this.branchMatchCounts().get(branch) ?? 0;
  }

  public isNodeHighlighted(nodeId: string): boolean {
    const matching = this.matchingNodeIds();
    if (!matching) return false;
    return matching.has(nodeId);
  }

  public isNodeDimmed(nodeId: string): boolean {
    const matching = this.matchingNodeIds();
    if (!matching) return false;
    return !matching.has(nodeId);
  }

  private nodeMatchesSearch(
    node: ResearchContent,
    query: string,
    upgradeRoomNames: Map<string, string>,
  ): boolean {
    if (node.name.toLowerCase().includes(query)) return true;
    if (node.description.toLowerCase().includes(query)) return true;
    for (const unlock of node.unlocks) {
      const formatted = this.formatUnlock(unlock);
      if (formatted.name.toLowerCase().includes(query)) return true;
      if (unlock.type === 'roomupgrade') {
        const roomName = upgradeRoomNames.get(unlock.targetRoomupgradeId);
        if (roomName && roomName.toLowerCase().includes(query)) return true;
      }
    }
    return false;
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
