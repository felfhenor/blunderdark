# PRD: Spawning Pool Room

## Introduction
The Spawning Pool is a Tier 1 utility room that automatically spawns basic inhabitants over time. It uses a 2x2 square footprint, spawns 1 basic inhabitant every 5 minutes, supports 2 inhabitants (upgradeable to 4), and has a low base fear level that can be upgraded to High. Two upgrade paths specialize the pool's spawning capabilities.

## Goals
- Implement a 2x2 Spawning Pool room with auto-spawn functionality
- Spawn 1 basic inhabitant every 5 minutes
- Support 2 inhabitants with upgradeable capacity to 4
- Implement 2 distinct upgrade paths
- Integrate with the inhabitant management system

## User Stories

### US-001: Spawning Pool Room Definition
**Description:** As a developer, I want the Spawning Pool defined in YAML gamedata.

**Acceptance Criteria:**
- [ ] A `spawning-pool.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (2x2), spawnRate, spawnType, maxInhabitants, baseFearLevel, upgradePaths
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: 2x2 Room Placement
**Description:** As a dungeon builder, I want to place the Spawning Pool as a 2x2 square on the grid.

**Acceptance Criteria:**
- [ ] The Spawning Pool occupies a 2x2 square of tiles
- [ ] Placement validates all 4 tiles are unoccupied
- [ ] Renders correctly on the grid
- [ ] No rotation needed (square is symmetric)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Auto-Spawn Timer
**Description:** As a dungeon builder, I want the Spawning Pool to automatically produce a new inhabitant every 5 minutes so that my workforce grows passively.

**Acceptance Criteria:**
- [ ] A timer counts down from 5 minutes (300 seconds / equivalent ticks)
- [ ] When the timer hits zero, a basic inhabitant is created
- [ ] The timer resets and begins counting again
- [ ] The timer is visible on the room UI (countdown display)
- [ ] Spawning pauses when the game is paused
- [ ] Typecheck/lint passes

### US-004: Spawned Inhabitant Creation
**Description:** As the system, I want spawned inhabitants to be fully created entities that can be assigned to rooms.

**Acceptance Criteria:**
- [ ] Spawned inhabitants are basic type (e.g., Imp, Goblin, or default worker)
- [ ] They appear in the unassigned inhabitant pool
- [ ] They have all required fields (id, type, stats, hunger state, etc.)
- [ ] A notification appears when a new inhabitant spawns
- [ ] Typecheck/lint passes

### US-005: Spawn Capacity Limit
**Description:** As the system, I want spawning to stop if a global or pool-specific limit is reached so that the game remains balanced.

**Acceptance Criteria:**
- [ ] Spawning stops if the total unassigned inhabitant count exceeds a threshold (e.g., 10)
- [ ] The timer still runs but does not produce an inhabitant at zero
- [ ] A message indicates "Pool is full" or "No room for new inhabitants"
- [ ] Spawning resumes when inhabitants are assigned and space is available
- [ ] Typecheck/lint passes

### US-006: Upgrade Path 1 - Rapid Spawning
**Description:** As a dungeon builder, I want an upgrade that increases spawn rate.

**Acceptance Criteria:**
- [ ] Upgrade reduces spawn timer (e.g., from 5 min to 3 min)
- [ ] May also increase inhabitant capacity from 2 to 4
- [ ] Upgrade has a defined resource cost
- [ ] Mutually exclusive with other path at this tier
- [ ] Typecheck/lint passes

### US-007: Upgrade Path 2 - Dark Spawning
**Description:** As a dungeon builder, I want an upgrade that spawns stronger inhabitants at the cost of higher fear.

**Acceptance Criteria:**
- [ ] Upgrade changes spawned inhabitant type to a stronger variant
- [ ] Room fear level increases to High (3)
- [ ] Upgrade has a defined resource cost
- [ ] Mutually exclusive with other path at this tier
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Spawning Pool must be defined in YAML gamedata.
- FR-2: The room must use a 2x2 square layout.
- FR-3: Auto-spawn must create 1 basic inhabitant every 5 minutes of game time.
- FR-4: Spawning must integrate with the game loop tick system.
- FR-5: Two mutually exclusive upgrade paths must be implemented.
- FR-6: Spawning must respect inhabitant limits.

## Non-Goals (Out of Scope)
- Inhabitant assignment UI (handled by Issue #13)
- Inhabitant stat systems (handled by Issue #8/11)
- Room placement UI generics
- Advanced spawning (specific creature types beyond upgrades)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), inhabitant types (Issue #8), and inhabitant management (Issue #11).
- The spawn timer should integrate with the game loop (`src/app/helpers/gameloop.ts`) tick system.
- Use a signal to track the countdown and trigger spawning.
- Spawned inhabitants need unique IDs generated via the existing ID system.
- Consider edge cases: what happens if the game is saved mid-countdown? The remaining time should persist.

## Success Metrics
- Spawning Pool spawns inhabitants at the correct rate
- Timer persists across save/load
- Upgrades modify spawn behavior correctly
- No inhabitants spawn beyond capacity limits

## Open Questions
- What is the exact basic inhabitant type spawned (Imp, Goblin, generic Worker)?
- Should there be a global cap on total inhabitants in addition to the pool-specific limit?
- Can multiple Spawning Pools operate simultaneously?
