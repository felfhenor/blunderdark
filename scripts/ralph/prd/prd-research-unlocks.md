# PRD: Research Unlocks

## Introduction
Research Unlocks define what happens when a research node is completed. Each node unlocks specific game content: new rooms, inhabitants, abilities, upgrades, or passive bonuses. This system applies unlock effects, tracks which content is unlocked, and surfaces newly available content to the player through the UI.

## Goals
- Define unlock effect types for each research node
- Apply unlock effects when research completes
- Track which content has been unlocked via research
- Notify the player of newly unlocked content
- Ensure unlocked content persists through save/load

## User Stories

### US-001: Define Unlock Effect Types
**Description:** As a developer, I want well-typed unlock effects so that each research node has a clear, implementable effect.

**Acceptance Criteria:**
- [ ] An `UnlockEffect` union type is defined with variants: `RoomUnlock`, `InhabitantUnlock`, `AbilityUnlock`, `UpgradeUnlock`, `PassiveBonusUnlock`
- [ ] Each variant includes the necessary ID or descriptor to apply the unlock
- [ ] Examples: `{ type: 'room', roomId: 'soul-well' }`, `{ type: 'passive', stat: 'researchSpeed', bonus: 0.1 }`
- [ ] Types use `type` keyword per project conventions
- [ ] Typecheck/lint passes

### US-002: Map Research Nodes to Unlock Effects
**Description:** As a developer, I want each research node in the YAML data to specify its unlock effects.

**Acceptance Criteria:**
- [ ] Every research node has an `unlocks` array in its YAML definition
- [ ] Unlock effects reference valid game content IDs (room IDs, inhabitant IDs, etc.)
- [ ] Build-time validation checks that all referenced IDs exist in the gamedata
- [ ] Examples: "Dark Arts I" unlocks Soul Well room; "Advanced Manufacturing" unlocks Dark Forge
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-003: Apply Unlock Effects on Completion
**Description:** As a developer, I want unlock effects applied automatically when research completes so that new content becomes available.

**Acceptance Criteria:**
- [ ] When research completes, each unlock effect in the node's `unlocks` array is processed
- [ ] Room unlocks add the room to the player's available rooms list
- [ ] Inhabitant unlocks add the creature to the recruitment pool
- [ ] Passive bonuses are added to the global modifier system
- [ ] The unlock processor is called from the research completion handler
- [ ] Unit tests verify each unlock effect type is applied correctly
- [ ] Typecheck/lint passes

### US-004: Track Unlocked Content
**Description:** As a developer, I want to track all unlocked content so that systems can query whether content is available.

**Acceptance Criteria:**
- [ ] An `UnlockedContent` type tracks unlocked rooms, inhabitants, abilities, and upgrades as arrays of IDs
- [ ] The unlocked content state is part of `GameStateWorld` for persistence
- [ ] A helper function `isUnlocked(type, id): boolean` checks if specific content is unlocked
- [ ] Systems that display buildable rooms or recruitable inhabitants filter by unlocked status
- [ ] Unit tests verify unlock tracking
- [ ] Typecheck/lint passes

### US-005: Unlock Notification UI
**Description:** As a player, I want to be notified when new content is unlocked so that I know what became available.

**Acceptance Criteria:**
- [ ] When research completes, a notification/toast appears listing the unlocked content
- [ ] Each unlocked item shows its name, icon, and a brief description
- [ ] The notification can be dismissed by clicking or after a timeout
- [ ] A "New" badge appears on unlocked content in room/creature menus until viewed
- [ ] The notification component is standalone with OnPush change detection
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-006: Content Gating by Research
**Description:** As a player, I want content to be gated behind research so that I must progress the tech tree to access advanced features.

**Acceptance Criteria:**
- [ ] Room placement UI only shows rooms that are unlocked (or always-available base rooms)
- [ ] Inhabitant recruitment only shows creatures that are unlocked
- [ ] Locked content is either hidden or shown as greyed-out with "Requires: [Research Name]"
- [ ] The gating check uses the `isUnlocked()` helper
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must define typed unlock effects for rooms, inhabitants, abilities, upgrades, and passive bonuses
- FR-2: Unlock effects must be applied automatically when research completes
- FR-3: All unlocked content must be tracked in the game state
- FR-4: The UI must filter available content based on unlock status
- FR-5: Players must be notified of newly unlocked content

## Non-Goals (Out of Scope)
- Research tree visualization (Issue #74)
- Research progress mechanics (Issue #75)
- Reverting unlocks (once unlocked, always unlocked)
- Conditional unlocks based on non-research criteria

## Technical Considerations
- Depends on the research progress system (Issue #75) for completion events
- Unlock effects should be processed by a dedicated service (e.g., `ResearchUnlockService`)
- The `isUnlocked()` helper should use a `computed()` signal that derives from the unlocked content state
- Build-time validation of unlock references prevents runtime errors from bad data
- "New" badge state should use `localStorageSignal` since it's a UI preference

## Success Metrics
- All research nodes have valid unlock effects
- Unlock effects apply correctly on research completion
- Content gating prevents access to locked content
- Notification appears within one tick of research completion

## Open Questions
- Should locked content be hidden entirely or shown as greyed-out?
- Can passive bonuses be stacked (e.g., multiple +10% research speed nodes)?
- Should there be an "unlock log" showing all historical unlocks?
- How should unlocks interact with save files from before the research system existed?
