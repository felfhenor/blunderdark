# PRD: Invasion Win/Loss Conditions

## Introduction
Define clear victory and defeat conditions for invasion encounters. Defenders win by eliminating or routing all invaders. Invaders win by destroying the Altar or completing two secondary objectives. A 30-turn limit prevents indefinite stalemates. A results screen summarizes the outcome after each invasion.

## Goals
- Define defender win condition: all invaders killed or retreated
- Define invader win condition: Altar destroyed or 2 secondary objectives completed
- Implement 30-turn limit (defenders win by default)
- Display an invasion results screen with statistics
- Track invasion history for progression

## User Stories

### US-001: Defender Victory Condition
**Description:** As a player, I want to win an invasion by defeating all invaders so that I have a clear objective.

**Acceptance Criteria:**
- [ ] Check after each turn: if all invaders are dead or have retreated, defenders win
- [ ] Retreated invaders are those who have fled off the map
- [ ] Victory triggers invasion end and transitions to results screen
- [ ] Typecheck/lint passes

### US-002: Invader Victory - Altar Destruction
**Description:** As a developer, I want invaders to win by destroying the Altar so that the player has a critical asset to protect.

**Acceptance Criteria:**
- [ ] Altar has HP (e.g., 100 HP)
- [ ] Invaders adjacent to the Altar can attack it instead of defenders
- [ ] When Altar HP reaches 0, invaders win immediately
- [ ] Altar destruction triggers invasion end and transitions to results screen
- [ ] Typecheck/lint passes

### US-003: Invader Victory - Secondary Objectives
**Description:** As a developer, I want invaders to win by completing secondary objectives so that multiple rooms need defending.

**Acceptance Criteria:**
- [ ] Secondary objectives: Vault (steal gold), Throne (defile)
- [ ] An objective is "completed" when an invader occupies it for 2 consecutive turns
- [ ] If 2 secondary objectives are completed, invaders win
- [ ] Track objective completion status during invasion
- [ ] Typecheck/lint passes

### US-004: Turn Limit
**Description:** As a player, I want a turn limit on invasions so that combat doesn't drag on indefinitely.

**Acceptance Criteria:**
- [ ] Maximum 30 turns per invasion
- [ ] Display current turn number and remaining turns in the UI
- [ ] When turn limit is reached, defenders win by default
- [ ] Turn counter increments after all units in a round have acted
- [ ] Typecheck/lint passes

### US-005: Invasion Results Screen
**Description:** As a player, I want to see a summary after each invasion so that I can understand what happened.

**Acceptance Criteria:**
- [ ] Display results screen at invasion end showing: Win/Loss, turns taken, invaders killed, defenders lost
- [ ] Show resources looted by invaders (if any secondary objectives completed)
- [ ] Show rewards earned by defenders (experience, resources from defeated invaders)
- [ ] "Continue" button to return to normal gameplay
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Invasion History Tracking
**Description:** As a developer, I want to track invasion history so that the game can reference past invasions for difficulty scaling.

**Acceptance Criteria:**
- [ ] Store each invasion result: day, outcome, invaders count, defenders count, turns taken
- [ ] Persist invasion history to IndexedDB
- [ ] Expose `invasionHistory` signal for other systems to consume
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Defenders win when all invaders are eliminated or have retreated.
- FR-2: Invaders win when the Altar is destroyed (0 HP) or 2 secondary objectives are completed.
- FR-3: A 30-turn limit results in a defender victory.
- FR-4: An invasion results screen must display after every invasion.
- FR-5: Invasion history must persist across game sessions.

## Non-Goals (Out of Scope)
- Consequences of invasion loss (dungeon damage, resource theft) beyond the results screen
- Invasion difficulty scaling based on history
- Retreat mechanics for defenders
- Partial victory conditions

## Technical Considerations
- Depends on Turn-Based Invasion Mode (#41) and Basic Combat Resolution (#43)
- Win/loss check should run after every action, not just at end of turn
- Results screen is a new component, likely a modal overlay
- Invasion history types in `src/app/interfaces/`
- Consider an `InvasionState` type that tracks all in-progress invasion data

## Success Metrics
- All win/loss conditions trigger correctly
- Turn limit prevents infinite invasions
- Results screen displays accurate statistics
- Invasion history persists and is accessible

## Open Questions
- What happens to the dungeon if the player loses an invasion?
- Should there be a "retreat" option for the player?
- Can secondary objectives be re-completed in the same invasion?
