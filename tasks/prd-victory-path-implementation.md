# PRD: Victory Path Implementation

## Introduction
Victory Path Implementation defines five distinct victory conditions for Blunderdark, each reflecting a different playstyle. Players win by completing all conditions within a chosen path: Terror Lord, Dragon's Hoard, Mad Scientist, Harmonious Kingdom, or Eternal Empire. A victory screen triggers when all conditions for any path are met simultaneously.

## Goals
- Define five victory paths with specific, measurable conditions
- Track progress toward all victory conditions in real time
- Trigger a victory screen when any path's conditions are fully met
- Persist victory progress as part of the game save
- Ensure victory conditions reference existing game systems

## User Stories

### US-001: Define Victory Path Data Types
**Description:** As a developer, I want victory path data types so that conditions, progress, and completion are well-typed.

**Acceptance Criteria:**
- [ ] A `VictoryPath` type is defined with: `id`, `name`, `description`, `conditions: VictoryCondition[]`
- [ ] A `VictoryCondition` type is defined with: `id`, `description`, `checkType` (resource threshold, flag, duration, count), `target`, `currentValue`
- [ ] A `VictoryProgress` type maps each path ID to its condition progress
- [ ] Types use `type` keyword per project conventions
- [ ] Types are defined in `src/app/interfaces/`
- [ ] Typecheck/lint passes

### US-002: Terror Lord Victory Path
**Description:** As a player pursuing the Terror Lord path, I want to win by amassing Corruption, defending invasions, reaching deep floors, and summoning a Demon Lord.

**Acceptance Criteria:**
- [ ] Conditions: 500+ Corruption, 10+ successful invasion defenses, Floor 10+ reached, Demon Lord inhabitant present
- [ ] Each condition is independently tracked and updates in real time
- [ ] Condition check functions correctly evaluate game state
- [ ] Unit tests verify each condition check at boundary values
- [ ] Typecheck/lint passes

### US-003: Dragon's Hoard Victory Path
**Description:** As a player pursuing the Dragon's Hoard path, I want to win by hoarding Gold, building key rooms, recruiting a Dragon, and maintaining peace.

**Acceptance Criteria:**
- [ ] Conditions: 10,000+ Gold, Throne Room + Dragon Lair built, Dragon inhabitant present, 30+ consecutive peaceful days
- [ ] "Consecutive peaceful days" resets to 0 on any invasion
- [ ] Peaceful day counter increments at each day transition
- [ ] Unit tests verify Gold threshold, room checks, Dragon check, and peaceful day tracking
- [ ] Typecheck/lint passes

### US-004: Mad Scientist Victory Path
**Description:** As a player pursuing the Mad Scientist path, I want to win by completing all research, creating hybrids, building Breeding Pits, and creating a Perfect Creature.

**Acceptance Criteria:**
- [ ] Conditions: All research completed, 5+ hybrid creatures, 3+ Breeding Pit rooms, Perfect Creature created
- [ ] Research completion checks against the total research tree
- [ ] Hybrid creature count tracks unique hybrids created
- [ ] "Perfect Creature" is a special hybrid requiring specific ingredients (defined in gamedata)
- [ ] Unit tests verify each condition check
- [ ] Typecheck/lint passes

### US-005: Harmonious Kingdom Victory Path
**Description:** As a player pursuing the Harmonious Kingdom path, I want to win by maintaining zero Corruption, growing population, expanding floors, and maximizing Harmony.

**Acceptance Criteria:**
- [ ] Conditions: 0 Corruption for 30+ consecutive days, 50+ inhabitants, 7+ floors, Legendary Harmony reputation
- [ ] "Zero Corruption days" resets if Corruption rises above 0
- [ ] Inhabitant count includes all living inhabitants across all floors
- [ ] Floor count tracks distinct constructed floors
- [ ] Unit tests verify each condition check and Corruption day tracking
- [ ] Typecheck/lint passes

### US-006: Eternal Empire Victory Path
**Description:** As a player pursuing the Eternal Empire path, I want to win by surviving 365 days with positive resources, unique inhabitants, and a large dungeon.

**Acceptance Criteria:**
- [ ] Conditions: Day 365+ reached, all resource types positive, 3+ Unique inhabitants, 100+ rooms
- [ ] "All resources positive" checks every resource type is above 0 at evaluation time
- [ ] Unique inhabitants are those with the `unique` tag
- [ ] Room count includes all rooms across all floors
- [ ] Unit tests verify each condition check
- [ ] Typecheck/lint passes

### US-007: Victory Condition Evaluation Engine
**Description:** As a developer, I want a centralized engine that evaluates all victory conditions each tick so that victory is detected promptly.

**Acceptance Criteria:**
- [ ] A `VictoryService` evaluates all paths' conditions at a regular interval (e.g., every 60 ticks)
- [ ] The service exposes `isPathComplete(pathId)` and `getProgress(pathId)` methods
- [ ] When any path is complete, a `victoryAchieved` signal is set with the winning path
- [ ] Evaluation is efficient (no redundant state scans)
- [ ] Unit tests verify detection of victory when all conditions are met
- [ ] Typecheck/lint passes

### US-008: Victory Screen
**Description:** As a player, I want to see a victory screen when I complete a victory path so that the achievement is celebrated.

**Acceptance Criteria:**
- [ ] When `victoryAchieved` signal fires, the game pauses and navigates to a victory screen
- [ ] The victory screen shows: path name, path description, all conditions with checkmarks
- [ ] The screen shows total play time and key statistics
- [ ] Options: "Continue Playing" (return to game) or "Return to Menu"
- [ ] The victory is recorded in game state (can view past victories)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-009: Victory Gamedata Definitions
**Description:** As a developer, I want victory paths defined in YAML so that conditions can be tuned without code changes.

**Acceptance Criteria:**
- [ ] A `victory/` directory in `gamedata/` contains YAML definitions for all 5 paths
- [ ] Each path defines: id, name, description, conditions with check types and target values
- [ ] The build pipeline compiles and validates victory YAML
- [ ] TypeScript schemas are generated for victory data
- [ ] `ContentService` loads victory path data at app init
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must define five distinct victory paths with multiple conditions each
- FR-2: The system must track progress toward all conditions in real time
- FR-3: When all conditions for any path are simultaneously met, victory must trigger
- FR-4: The victory screen must display the winning path and all condition statuses
- FR-5: Victory progress must persist as part of the game save
- FR-6: Victory paths must be defined in YAML gamedata

## Non-Goals (Out of Scope)
- Victory progress tracking UI (handled by Issue #102)
- Achievements or badges for partial progress
- Difficulty modifiers for victory conditions
- Multiplayer victory comparisons

## Technical Considerations
- Depends on Issue #54 (Invasions), Issue #7 (Room Types), Issue #46 (Research), Issue #95 (Reputation)
- Duration-based conditions (30 peaceful days, 365 days) require persistent counters that survive save/load
- "Consecutive" conditions (0 Corruption for 30 days) need special reset logic
- Victory evaluation should not run every tick (performance); every 60 ticks or on relevant state changes
- The victory screen should be a routed page (`/victory`) with a route guard preventing access unless victory is achieved

## Success Metrics
- All five victory paths can be achieved in testing scenarios
- Victory detection triggers within 1-2 seconds of final condition being met
- Victory progress survives save/load without data loss
- Victory screen displays correctly for all five paths

## Open Questions
- Can the player achieve multiple victories in one playthrough?
- Should there be a "Continue +" mode after victory with increased difficulty?
- Are the numeric thresholds (500 Corruption, 10,000 Gold, etc.) final or placeholder?
