import type { InvasionId } from '@interfaces/content-invasion';
import type { CombatResult } from '@interfaces/combat';
import type { Branded } from '@interfaces/identifiable';
import type { InhabitantInstanceId } from '@interfaces/inhabitant';
import type { InvaderInstance, InvaderClassType, InvaderStats } from '@interfaces/invader';
import type { PlacedRoomId } from '@interfaces/room-shape';
import type { InvasionObjective } from '@interfaces/invasion-objective';
import type { ResourceType } from '@interfaces/resource';

export type PrisonerId = Branded<string, 'PrisonerId'>;
export type CombatantId = Branded<string, 'CombatantId'>;

export type SpecialInvasionType = 'crusade' | 'raid' | 'bounty_hunter';

export type PendingInvasionWarning = {
  seed: string;
  invasionType: 'scheduled' | SpecialInvasionType;
  invaders: InvaderInstance[];
  objectives: InvasionObjective[];
  entryRoomId: PlacedRoomId;
  profile: DungeonProfile;
};

export type InvasionHistoryEntry = {
  day: number;
  type: 'scheduled' | SpecialInvasionType;
};

export type PendingSpecialInvasion = {
  type: SpecialInvasionType;
  triggerDay: number;
};

export type InvasionSchedule = {
  nextInvasionDay: number | undefined;
  nextInvasionVariance: number;
  gracePeriodEnd: number;
  invasionHistory: InvasionHistoryEntry[];
  pendingSpecialInvasions: PendingSpecialInvasion[];
  warningActive: boolean;
  warningDismissed: boolean;
  pendingWarning?: PendingInvasionWarning;
};

// --- Composition types ---

export type InvaderClassWeights = Record<InvaderClassType, number>;

export type CompositionWeightConfig = {
  id: InvasionId;
  name: string;
  balanced: InvaderClassWeights;
  highCorruption: InvaderClassWeights;
  highWealth: InvaderClassWeights;
  highKnowledge: InvaderClassWeights;
};

export type DungeonProfile = {
  corruption: number;
  wealth: number;
  knowledge: number;
  size: number;
  threatLevel: number;
};

// --- Win/Loss types ---

export type InvasionEndReason =
  | 'all_invaders_eliminated'
  | 'turn_limit_reached'
  | 'altar_destroyed'
  | 'objectives_completed'
  | 'morale_broken';

export type InvasionState = {
  invasionId: InvasionId;
  currentTurn: number;
  maxTurns: number;
  altarHp: number;
  altarMaxHp: number;
  invaders: InvaderInstance[];
  objectives: InvasionObjective[];
  defenderCount: number;
  defendersLost: number;
  invadersKilled: number;
  isActive: boolean;
};

export type DetailedInvasionResult = {
  invasionId: InvasionId;
  day: number;
  outcome: 'victory' | 'defeat';
  endReason: InvasionEndReason;
  turnsTaken: number;
  invaderCount: number;
  invadersKilled: number;
  defenderCount: number;
  defendersLost: number;
  objectivesCompleted: number;
  objectivesTotal: number;
  rewardMultiplier: number;
};

// --- Rewards types ---

export type DefenseRewards = {
  reputationGain: number;
  experienceGain: number;
  goldGain: number;
  resourceGains: Partial<Record<ResourceType, number>>;
  capturedPrisoners: CapturedPrisoner[];
};

export type DefensePenalties = {
  reputationLoss: number;
  goldLost: number;
  resourceLosses: Partial<Record<ResourceType, number>>;
  killedInhabitantIds: InhabitantInstanceId[];
};

export type CapturedPrisoner = {
  id: PrisonerId;
  invaderClass: InvaderClassType;
  name: string;
  stats: InvaderStats;
  captureDay: number;
};

export type PrisonerAction =
  | 'execute'
  | 'ransom'
  | 'convert'
  | 'sacrifice'
  | 'experiment';

export type PrisonerHandlingResult = {
  action: PrisonerAction;
  success: boolean;
  resourceChanges: Partial<Record<ResourceType, number>>;
  reputationChange: number;
  corruptionChange: number;
  fearChange: number;
};

// --- Turn-based combat types ---

export type CombatantSide = 'defender' | 'invader';

export type TilePosition = {
  x: number;
  y: number;
};

export type Combatant = {
  id: CombatantId;
  side: CombatantSide;
  name: string;
  speed: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  hasActed: boolean;
  position: TilePosition | undefined;
};

export type TurnAction = 'move' | 'attack' | 'ability' | 'wait';

export type ActionResult = {
  action: TurnAction;
  actorId: CombatantId;
  targetId: CombatantId | undefined;
  targetPosition: TilePosition | undefined;
  combatResult: CombatResult | undefined;
};

export type TurnQueue = {
  combatants: Combatant[];
  currentIndex: number;
  round: number;
};

// --- Battle log types ---

export type BattleLogEntryType =
  | 'room_enter'
  | 'trap_trigger'
  | 'trap_disarm'
  | 'trap_miss'
  | 'combat_attack'
  | 'combat_miss'
  | 'combat_kill'
  | 'defender_killed'
  | 'morale_change'
  | 'objective_progress'
  | 'objective_complete'
  | 'room_cleared'
  | 'altar_damage'
  | 'invasion_end'
  | 'retreat';

export type BattleLogEntry = {
  turn: number;
  type: BattleLogEntryType;
  roomId?: string;
  message: string;
  details?: Record<string, unknown>;
};

// --- Orchestrator result ---

export type InvasionOrchestratorResult = {
  detailedResult: DetailedInvasionResult;
  rewards?: DefenseRewards;
  penalties?: DefensePenalties;
  battleLog: BattleLogEntry[];
  capturedPrisoners: CapturedPrisoner[];
  killedDefenderIds: InhabitantInstanceId[];
  survivingInvaders: InvaderInstance[];
};

// --- Active invasion (tick-based) ---

export type ActiveInvasion = {
  seed: string;
  invasionType: 'scheduled' | SpecialInvasionType;
  day: number;

  // Path state
  path: PlacedRoomId[];
  entryRoomId: PlacedRoomId;
  currentRoomIndex: number;
  currentRoomTicksElapsed: number;
  currentRoomTicksTotal: number;

  // Multi-floor tracking
  roomFloorMap: Record<string, number>;

  // Altar looping (when invaders reach end of path and keep attacking altar)
  isAltarLooping: boolean;

  // Invader state (Record not Map for serialization)
  invaderHpMap: Record<string, number>;
  killedDefenderIds: InhabitantInstanceId[];
  killedInvaderClasses: InvaderClassType[];

  // Win/loss tracking
  invasionState: InvasionState;

  // Combat state for current room
  currentRoomTurnQueue?: TurnQueue;
  currentRoomDefenderIds: InhabitantInstanceId[];

  // Battle log (grows each tick)
  battleLog: BattleLogEntry[];
  currentTurn: number;

  // Fear levels per room (captured at start for determinism)
  roomFearLevels: Record<string, number>;

  // Completion
  completed: boolean;
  result?: InvasionOrchestratorResult;
};
