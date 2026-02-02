# PRD: Vertical Connections (Elevators & Portals)

## Introduction
Elevators and portals provide advanced vertical transport between floors. Elevators connect two or more floors for fast travel at a moderate cost. Portals connect any two floors instantly but at a high flux/essence cost. Both provide strategic options for managing a multi-floor dungeon efficiently.

## Goals
- Implement elevators that connect 2+ adjacent floors with fast travel
- Implement portals that connect any two floors with instant travel
- Define resource costs for each connection type
- Display visual indicators for all vertical connections
- Integrate with inhabitant movement systems

## User Stories

### US-001: Elevator Data Model and Placement
**Description:** As a player, I want to build elevators that connect multiple adjacent floors so that inhabitants can travel quickly between them.

**Acceptance Criteria:**
- [ ] Define `Elevator` type: id, connectedFloors (array of depth values), gridPosition
- [ ] Elevator connects 2 or more adjacent floors (must be contiguous depth range)
- [ ] Building costs 50 Crystals + 20 Flux
- [ ] Elevator occupies the same grid position on all connected floors
- [ ] All connected tiles must be empty
- [ ] Typecheck/lint passes

### US-002: Elevator Extension
**Description:** As a player, I want to extend an existing elevator to reach additional floors so that I don't have to rebuild.

**Acceptance Criteria:**
- [ ] Existing elevator can be extended to an adjacent floor (one above or below)
- [ ] Extension costs 25 Crystals + 10 Flux per additional floor
- [ ] Target tile on the new floor must be empty
- [ ] Target floor must be adjacent to the elevator's current range
- [ ] Typecheck/lint passes

### US-003: Portal Data Model and Placement
**Description:** As a player, I want to build portals that connect any two floors so that I can create shortcuts across my dungeon.

**Acceptance Criteria:**
- [ ] Define `Portal` type: id, floorDepthA, floorDepthB, positionA, positionB
- [ ] Portal connects exactly two floors (any depth, not required to be adjacent)
- [ ] Portal positions can differ on each floor (unlike stairs)
- [ ] Building costs 100 Flux + 30 Essence
- [ ] Both target tiles must be empty
- [ ] Typecheck/lint passes

### US-004: Travel Speed Differentiation
**Description:** As a developer, I want elevators and portals to have different travel speeds so that the higher cost of portals is justified.

**Acceptance Criteria:**
- [ ] Stairs: 1 game minute per floor
- [ ] Elevator: 0.5 game minutes per floor (2x faster than stairs)
- [ ] Portal: Instant (0 travel time)
- [ ] Travel time affects inhabitant assignment responsiveness
- [ ] Typecheck/lint passes

### US-005: Visual Indicators for Elevators and Portals
**Description:** As a player, I want to see elevators and portals on the map so that I can identify all vertical connections.

**Acceptance Criteria:**
- [ ] Elevators have a distinct sprite/icon (different from stairs)
- [ ] Portals have a distinct sprite/icon (glowing/magical appearance)
- [ ] Hovering shows connection details (which floors, travel time)
- [ ] Connected floors are highlighted when a connection is selected
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Connection Removal
**Description:** As a player, I want to demolish elevators and portals so that I can reconfigure my dungeon.

**Acceptance Criteria:**
- [ ] Elevators can be demolished entirely or shrunk by one floor
- [ ] Portals can be demolished (removes both ends)
- [ ] Partial resource refund on demolition (50%)
- [ ] Cannot demolish while inhabitants are in transit
- [ ] Confirmation dialog before demolition
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Elevators must connect 2+ contiguous floors at the same grid position.
- FR-2: Portals must connect any 2 floors at potentially different grid positions.
- FR-3: Elevators cost 50 Crystals + 20 Flux; portals cost 100 Flux + 30 Essence.
- FR-4: Travel time must differ: elevator (0.5 min/floor), portal (instant).
- FR-5: Visual indicators must clearly differentiate stairs, elevators, and portals.

## Non-Goals (Out of Scope)
- Portal combat mechanics (using portals during invasions)
- Elevator capacity limits
- Portal instability or failure chance
- Animated travel sequences

## Technical Considerations
- Depends on Floor Creation System (#46) and Room Placement (#7)
- Extend `VerticalConnectionService` to handle all three connection types
- Portals not requiring matching coordinates adds complexity to the placement validation
- New sprites needed for elevator and portal tiles in `gameassets/`
- Consider a unified `VerticalConnection` base type with discriminated union for stairs/elevator/portal

## Success Metrics
- Elevators and portals can be built, extended, and demolished without errors
- Travel times are correctly applied to inhabitant movement
- Visual indicators clearly distinguish all connection types
- Resource costs are correctly deducted

## Open Questions
- Should portals have a usage cooldown or energy cost per use?
- Can elevators be upgraded for faster speed?
- Should there be a limit on the number of portals per floor?
