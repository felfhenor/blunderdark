# PRD: Reputation Tracking

## Introduction
The Reputation Tracking system introduces five reputation dimensions (Terror, Wealth, Knowledge, Harmony, Chaos) that reflect the player's dungeon-building style and choices. Actions throughout the game generate reputation points in these categories, which accumulate through defined levels. This foundational system enables downstream features like reputation-gated unlocks and gameplay effects.

## Goals
- Define five reputation categories with clear point thresholds for each level
- Track reputation points earned from player actions in real time
- Persist reputation state across sessions via IndexedDB
- Display current reputation levels and progress in the game UI
- Provide a clean API for other systems to query and modify reputation

## User Stories

### US-001: Define Reputation Data Types
**Description:** As a developer, I want well-typed reputation data structures so that reputation state is consistent across the application.

**Acceptance Criteria:**
- [ ] A `ReputationType` union type is defined: `'terror' | 'wealth' | 'knowledge' | 'harmony' | 'chaos'`
- [ ] A `ReputationLevel` union type is defined: `'none' | 'low' | 'medium' | 'high' | 'legendary'`
- [ ] A `ReputationState` type maps each `ReputationType` to a numeric point value
- [ ] A `ReputationThresholds` constant defines point thresholds: None (0), Low (50), Medium (150), High (350), Legendary (700)
- [ ] Types are defined in `src/app/interfaces/` using `type` keyword
- [ ] Typecheck/lint passes

### US-002: Implement Reputation State Management
**Description:** As a developer, I want reputation state managed via Angular Signals so that reputation changes propagate reactively to the UI and other systems.

**Acceptance Criteria:**
- [ ] A reputation helper file exists at `src/app/helpers/reputation.ts`
- [ ] Reputation state is initialized with all categories at 0 points
- [ ] Functions exist: `addReputation(type, points)`, `getReputation(type)`, `getReputationLevel(type)`, `resetReputation()`
- [ ] `getReputationLevel` returns the correct `ReputationLevel` based on current points and thresholds
- [ ] Reputation state integrates with `GameState` for persistence via `indexedDbSignal`
- [ ] Unit tests in `src/app/helpers/reputation.spec.ts` cover all functions and level boundary conditions
- [ ] Typecheck/lint passes

### US-003: Map Game Actions to Reputation Points
**Description:** As a developer, I want a configuration that maps game actions to reputation point rewards so that player behavior affects reputation.

**Acceptance Criteria:**
- [ ] A YAML file in `gamedata/` defines action-to-reputation mappings (e.g., `build_torture_chamber: { terror: 10, chaos: 5 }`)
- [ ] The build pipeline compiles this YAML to JSON alongside other gamedata
- [ ] A TypeScript schema is generated for the reputation action mappings
- [ ] `ContentService` loads the compiled reputation data at app init
- [ ] At least 15 distinct game actions are mapped across all five reputation types
- [ ] Typecheck/lint passes

### US-004: Reputation Award Integration
**Description:** As a developer, I want a centralized function that awards reputation when game actions occur so that all systems use a consistent mechanism.

**Acceptance Criteria:**
- [ ] A `awardReputationForAction(actionId: string)` function looks up the action in gamedata and applies reputation points
- [ ] The function emits a signal or event so the UI can show feedback
- [ ] If the action crosses a level threshold, a level-up event is emitted
- [ ] The function is idempotent-safe (can be called multiple times without duplicate awards if needed)
- [ ] Unit tests verify correct point awards and level-up detection
- [ ] Typecheck/lint passes

### US-005: Reputation Display Panel
**Description:** As a player, I want to see my current reputation levels in the game UI so that I understand how the world perceives my dungeon.

**Acceptance Criteria:**
- [ ] A `ReputationPanelComponent` (standalone, OnPush) displays all five reputation categories
- [ ] Each category shows: icon/label, current level name, progress bar toward next level
- [ ] Progress bar fills proportionally between current and next threshold
- [ ] Legendary level shows a full/maxed bar with distinct styling
- [ ] The panel is accessible from the game-play page (e.g., sidebar or dedicated tab)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Reputation Level-Up Notification
**Description:** As a player, I want to receive a notification when my reputation reaches a new level so that I'm aware of progression milestones.

**Acceptance Criteria:**
- [ ] When reputation crosses a level threshold, a toast/notification appears
- [ ] The notification shows the category name, new level, and a brief flavor text
- [ ] Notifications auto-dismiss after 5 seconds or can be clicked to dismiss
- [ ] Multiple simultaneous level-ups show stacked notifications
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Reputation Persistence
**Description:** As a player, I want my reputation to be saved and restored so that progress is not lost between sessions.

**Acceptance Criteria:**
- [ ] `ReputationState` is included in `GameState` and persisted to IndexedDB
- [ ] On game load, reputation is restored from saved state
- [ ] A new game initializes all reputation to 0
- [ ] Unit tests verify serialization round-trip for reputation state
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must track five reputation categories independently with numeric point values
- FR-2: The system must classify reputation into five levels based on configurable thresholds
- FR-3: When a game action occurs, the system must award the corresponding reputation points
- FR-4: The system must persist reputation state as part of the game save
- FR-5: The UI must display current reputation levels with progress indication
- FR-6: The system must notify the player when a reputation level changes

## Non-Goals (Out of Scope)
- Reputation decay over time (may be added later)
- Reputation effects on gameplay (handled by Issue #96)
- NPC dialogue changes based on reputation
- Multiplayer reputation comparison

## Technical Considerations
- Reputation state should be a plain object `Record<ReputationType, number>` for easy serialization
- Use Angular Signals for reactive state; `computed()` signals for derived level values
- Action-to-reputation mappings in YAML allow designers to tune without code changes
- Level thresholds should be defined as constants, not hardcoded in level-check logic
- The reputation panel component should use `@for` to iterate categories and `@switch` for level-specific styling

## Success Metrics
- All five reputation categories track and display correctly
- Level transitions trigger at exact threshold values (verified by unit tests)
- Reputation survives save/load round-trip without data loss
- UI panel renders without layout issues at all reputation levels

## Open Questions
- Should reputation points ever be negative (e.g., building peaceful rooms reduces Terror)?
- Should there be a cap beyond Legendary, or is 700+ points just "Legendary forever"?
- Should reputation history (points earned per day) be tracked for analytics/graphs?
