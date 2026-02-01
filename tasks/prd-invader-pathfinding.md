# PRD: Invader Pathfinding

## Introduction
Invaders need to navigate the dungeon intelligently during invasions. Using A* pathfinding on the room/hallway connection graph, invaders find paths from their spawn point to the Altar (primary objective) while considering morale-based detours around high-fear rooms and optional secondary objectives like the Vault or Throne.

## Goals
- Implement A* pathfinding on the dungeon's room and hallway connection graph
- Path from spawn point to Altar (primary objective)
- Apply morale checks to avoid high-fear rooms when possible
- Support detours for secondary objectives (Vault, Throne)
- Recalculate paths dynamically when routes are blocked

## User Stories

### US-001: Connection Graph Representation
**Description:** As a developer, I want a graph representation of dungeon rooms and hallways so that pathfinding algorithms can operate on it.

**Acceptance Criteria:**
- [ ] Create a graph structure where rooms and hallway segments are nodes
- [ ] Edges represent direct connections between rooms/hallways
- [ ] Each edge has a traversal cost (default 1, modified by room properties)
- [ ] Graph updates when rooms or hallways are added/removed
- [ ] Typecheck/lint passes

### US-002: A* Pathfinding Algorithm
**Description:** As a developer, I want an A* pathfinding implementation so that invaders can find optimal paths through the dungeon.

**Acceptance Criteria:**
- [ ] Implement A* algorithm that operates on the connection graph
- [ ] Use Manhattan distance heuristic (suitable for grid-based layouts)
- [ ] Return an ordered list of nodes (rooms/hallways) from start to goal
- [ ] Return empty path if no valid path exists
- [ ] Algorithm handles graphs up to 400 nodes (20x20 grid) efficiently
- [ ] Typecheck/lint passes

### US-003: Fear-Based Path Cost Modification
**Description:** As a player, I want invaders to be deterred by high-fear rooms so that building fearsome rooms has tactical value.

**Acceptance Criteria:**
- [ ] High-fear rooms increase traversal cost for invaders
- [ ] Invaders perform a morale check when considering a high-fear room (compare morale vs. fear level)
- [ ] If morale check fails, the room's cost is multiplied (e.g., 3x), making alternate routes preferred
- [ ] If no alternate route exists, invaders traverse the high-fear room regardless
- [ ] Typecheck/lint passes

### US-004: Secondary Objective Detours
**Description:** As a developer, I want invaders to optionally detour to secondary objectives so that invasions feel dynamic and target-rich.

**Acceptance Criteria:**
- [ ] Invaders check if secondary objectives (Vault, Throne) are reachable within a detour threshold
- [ ] Detour threshold: path to secondary + path from secondary to Altar must be less than 2x the direct path length
- [ ] Some invader types prioritize secondary objectives (e.g., thieves target Vault)
- [ ] Detour decision is made at invasion start and updated if path is blocked
- [ ] Typecheck/lint passes

### US-005: Dynamic Path Recalculation
**Description:** As a developer, I want invaders to recalculate their path when blocked so that invasions adapt to player actions during combat.

**Acceptance Criteria:**
- [ ] If an invader's next node is blocked (destroyed, occupied by impassable unit), recalculate path
- [ ] Recalculation uses the same A* algorithm with updated graph state
- [ ] If no valid path exists after recalculation, invader enters "confused" state (skips turn)
- [ ] Path recalculation completes within one frame (no visible lag)
- [ ] Typecheck/lint passes

### US-006: Pathfinding Unit Tests
**Description:** As a developer, I want comprehensive tests for the pathfinding algorithm so that I can trust its correctness.

**Acceptance Criteria:**
- [ ] Test: Direct path from spawn to altar on a simple linear dungeon
- [ ] Test: Path around an obstacle (blocked room)
- [ ] Test: No valid path returns empty array
- [ ] Test: Fear-based cost modification produces longer but safer paths
- [ ] Test: Path recalculation after blocking a node
- [ ] Tests placed in `src/app/helpers/pathfinding.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must represent the dungeon as a traversable graph of rooms and hallways.
- FR-2: A* pathfinding must find the shortest path from spawn to the Altar.
- FR-3: High-fear rooms must increase traversal cost based on invader morale.
- FR-4: Invaders must detour to secondary objectives when cost-effective.
- FR-5: Paths must be recalculated dynamically when the graph changes during an invasion.

## Non-Goals (Out of Scope)
- Real-time pathfinding (only used during turn-based invasions)
- Multi-floor pathfinding (invasions target one floor at a time initially)
- Visual path preview for the player
- Invader group coordination (each invader pathfinds independently)

## Technical Considerations
- Depends on Hallway System (#18), Room Connection System (#17), and Room Fear Levels (#33)
- Pathfinding helper should live in `src/app/helpers/pathfinding.ts`
- The connection graph should be a lightweight data structure (adjacency list)
- Consider caching paths and only recalculating when the graph changes
- Use `sortBy` from `es-toolkit/compat` for priority queue operations if needed

## Success Metrics
- Invaders reach the Altar via valid paths in all dungeon configurations
- Pathfinding completes in under 5ms for a 20x20 grid
- Fear-based detours produce observably different behavior
- All unit tests pass

## Open Questions
- Should invaders share pathfinding results or calculate independently?
- How does group movement work (do invaders move as a squad or individually)?
- Should the player be able to see the invader's planned path?
