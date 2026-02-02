# PRD: Production Calculation System

## Introduction
The production calculation system determines how much of each resource is generated per tick by each room, factoring in base production rates, inhabitant bonuses, adjacency effects, and conditional modifiers. It feeds into the resource manager to actually credit resources.

## Goals
- Calculate per-room resource production based on room type, inhabitants, and modifiers
- Apply the formula: `Final Production = Base * (1 + Bonuses) * Modifiers`
- Update production totals every game tick
- Provide a production summary for UI display (per-room and aggregate)

## User Stories

### US-001: Base Production per Room Type
**Description:** As a developer, I want each room type to define a base production rate so that rooms generate resources.

**Acceptance Criteria:**
- [ ] Room type definitions in `gamedata/room/` YAML include a `production` field specifying resource type and base amount per tick
- [ ] A function `getBaseProduction(roomTypeId)` returns the base production for a room type
- [ ] Rooms with no production defined return zero
- [ ] Base production values are loaded via `ContentService` at init
- [ ] Typecheck/lint passes

### US-002: Inhabitant Efficiency Bonuses
**Description:** As a developer, I want inhabitant efficiency traits to modify room production so that assigning the right inhabitants matters.

**Acceptance Criteria:**
- [ ] A function `calculateInhabitantBonus(room)` sums the efficiency bonuses from all assigned inhabitants
- [ ] Bonus is additive: two inhabitants with +20% each = +40% total
- [ ] Unassigned rooms have 0% bonus (but still get base production if room produces passively, or 0 production if room requires workers)
- [ ] Unit tests cover: no inhabitants, one inhabitant, multiple inhabitants with different bonuses
- [ ] Typecheck/lint passes

### US-003: Adjacency Bonuses
**Description:** As a developer, I want rooms to receive bonuses based on adjacent rooms so that dungeon layout matters strategically.

**Acceptance Criteria:**
- [ ] A function `calculateAdjacencyBonus(room, grid, allRooms)` checks neighboring tiles for compatible room types
- [ ] Adjacency rules are defined in gamedata (e.g., "Mine gets +10% when adjacent to Forge")
- [ ] Adjacency is determined by shared tile edges between rooms (not diagonal)
- [ ] Multiple adjacency bonuses stack additively
- [ ] Unit tests cover: no adjacent rooms, one match, multiple matches, non-matching neighbors
- [ ] Typecheck/lint passes

### US-004: Conditional Modifiers
**Description:** As a developer, I want conditional modifiers (fear, hunger, time of day) to affect production so that the game has dynamic resource management.

**Acceptance Criteria:**
- [ ] A function `calculateConditionalModifiers(room)` returns a multiplier based on active conditions
- [ ] Scared inhabitants produce at 50% efficiency (multiplier 0.5)
- [ ] Hungry inhabitants produce at 75% efficiency (multiplier 0.75)
- [ ] Modifiers are multiplicative with each other (scared + hungry = 0.5 * 0.75 = 0.375)
- [ ] Normal state has multiplier of 1.0 (no effect)
- [ ] Unit tests cover each condition and combinations
- [ ] Typecheck/lint passes

### US-005: Per-Tick Production Update
**Description:** As a developer, I want production calculated and applied every game tick so that resources accumulate over time.

**Acceptance Criteria:**
- [ ] A function `processProduction(gameState)` iterates all placed rooms and calculates total production
- [ ] Production is applied: `Final = Base * (1 + Bonuses) * Modifiers` per room, summed across all rooms
- [ ] Results are passed to the resource manager's `addResource()` for each resource type
- [ ] This function is called from the game loop (`gameloop.ts`) each tick
- [ ] Production calculation completes within 2ms for up to 50 rooms
- [ ] Typecheck/lint passes

### US-006: Production Summary Signal
**Description:** As a developer, I want a signal exposing the current production rates so that the UI can display per-minute production.

**Acceptance Criteria:**
- [ ] A computed signal `productionRates()` returns the aggregate production per tick for each resource type
- [ ] A helper `productionPerMinute(type)` converts per-tick rate to per-minute for display
- [ ] Per-room production breakdown is available via `roomProduction(roomId)` signal
- [ ] Signals update when rooms, inhabitants, or modifiers change
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must calculate production using: `Final = Base * (1 + InhabitantBonus + AdjacencyBonus) * ConditionalModifiers`
- FR-2: Production must be recalculated every game tick and applied to resource totals
- FR-3: Adjacency bonuses must consider the physical grid layout of rooms
- FR-4: Conditional modifiers must apply based on inhabitant states
- FR-5: Production rates must be exposed as reactive signals for UI consumption

## Non-Goals (Out of Scope)
- Resource consumption (rooms that cost resources per tick)
- Production upgrades via research
- Production events (random bonuses or disasters)
- Production visualization/animations on rooms
- Overflow handling when storage is full (handled by resource manager)

## Technical Considerations
- Production calculation runs every tick, so it must be performant. Cache intermediate results where possible.
- The existing game loop in `gameloop.ts` has a `// TODO: game logic (lol)` comment where production should be integrated.
- Production helpers should be in `src/app/helpers/production.ts`.
- Depends on resource manager (Issue #7) for `addResource()`, time system (Issue #8) for tick timing, grid system (Issue #1) for adjacency checks, and inhabitant system (Issue #11) for efficiency traits.
- Adjacency data could be precomputed when rooms are placed/removed rather than recalculated each tick.

## Success Metrics
- Production calculation for 50 rooms completes in under 2ms per tick
- Formula produces correct results verified by unit tests for all modifier combinations
- Production rates displayed in UI match actual resource accumulation

## Open Questions
- Should production be fractional (accumulate partial resources) or integer-only?
- What happens to production when a room has zero inhabitants but the room type requires workers?
- Should adjacency bonuses be defined per room type pair, or as generic categories?
