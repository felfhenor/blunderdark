# PRD: Pathfinding Optimization

## Introduction
Pathfinding Optimization improves the performance of inhabitant movement through the dungeon by caching results, implementing hierarchical pathfinding for large dungeons, limiting per-frame pathfinding calls, and optimizing grid traversal algorithms. This prevents pathfinding from becoming a bottleneck in large dungeons with 100+ rooms.

## Goals
- Cache pathfinding results to avoid redundant calculations
- Implement hierarchical pathfinding for multi-floor dungeons
- Limit pathfinding calls per frame to maintain smooth frame times
- Optimize the core grid traversal algorithm
- Achieve sub-millisecond pathfinding for cached routes

## User Stories

### US-001: Pathfinding Result Cache
**Description:** As a developer, I want pathfinding results cached so that repeated identical queries return instantly.

**Acceptance Criteria:**
- [ ] A pathfinding cache stores results keyed by (start, destination) pairs
- [ ] Cache entries include the computed path and a staleness flag
- [ ] Cache is invalidated when the dungeon layout changes (room added/removed, hallway changed)
- [ ] Cache hit returns the path in O(1) time
- [ ] Cache has a maximum size (e.g., 500 entries) with LRU eviction
- [ ] Unit tests verify cache hit, miss, invalidation, and eviction
- [ ] Typecheck/lint passes

### US-002: Cache Invalidation Strategy
**Description:** As a developer, I want smart cache invalidation so that only affected paths are cleared when the dungeon changes.

**Acceptance Criteria:**
- [ ] When a room is added/removed, only cache entries passing through that area are invalidated
- [ ] When a hallway is added/removed, only entries using that hallway are invalidated
- [ ] Full cache clear is available as a fallback
- [ ] Invalidation runs in under 1ms for typical cache sizes
- [ ] Unit tests verify selective invalidation
- [ ] Typecheck/lint passes

### US-003: Hierarchical Pathfinding
**Description:** As a developer, I want hierarchical pathfinding so that cross-floor routes are computed efficiently.

**Acceptance Criteria:**
- [ ] The dungeon is divided into zones (one per floor or cluster of rooms)
- [ ] High-level pathfinding determines which zones to traverse
- [ ] Low-level pathfinding resolves the detailed path within each zone
- [ ] Cross-floor paths use stairway/connection nodes between zones
- [ ] Hierarchical pathfinding produces correct paths that match non-hierarchical results
- [ ] Unit tests verify cross-floor pathfinding correctness
- [ ] Typecheck/lint passes

### US-004: Per-Frame Pathfinding Budget
**Description:** As a developer, I want pathfinding calls limited per frame so that pathfinding does not consume the entire frame budget.

**Acceptance Criteria:**
- [ ] A pathfinding budget limits the number of new pathfinding calculations per game tick (e.g., max 5)
- [ ] Excess pathfinding requests are queued and processed in subsequent frames
- [ ] High-priority requests (combat, invasion) bypass the budget limit
- [ ] The budget is configurable for performance tuning
- [ ] Unit tests verify budget enforcement and queue processing
- [ ] Typecheck/lint passes

### US-005: A* Algorithm Optimization
**Description:** As a developer, I want the core A* pathfinding algorithm optimized for the game's grid structure.

**Acceptance Criteria:**
- [ ] A* uses a binary heap (priority queue) for the open set instead of array scanning
- [ ] Heuristic function uses Manhattan distance appropriate for the grid
- [ ] Neighbor lookup is O(1) using pre-computed adjacency data
- [ ] The algorithm terminates early if the destination is unreachable (bounded search)
- [ ] Pathfinding for a single floor (20x20 grid) completes in under 0.5ms
- [ ] Unit tests verify path correctness and performance on edge cases
- [ ] Typecheck/lint passes

### US-006: Pathfinding Performance Metrics
**Description:** As a developer, I want pathfinding performance metrics so that I can verify optimization impact.

**Acceptance Criteria:**
- [ ] Pathfinding reports: total calls per frame, cache hit rate, average computation time
- [ ] Metrics are accessible via the performance profiling utilities (Issue #107)
- [ ] A debug overlay can display pathfinding stats in real time
- [ ] Metrics are disabled in production builds
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Pathfinding results must be cached with smart invalidation
- FR-2: Hierarchical pathfinding must support efficient cross-floor routing
- FR-3: Per-frame pathfinding calls must be budgeted to prevent frame drops
- FR-4: The A* algorithm must use efficient data structures (binary heap, pre-computed adjacency)
- FR-5: Performance metrics must be available for profiling

## Non-Goals (Out of Scope)
- Visual pathfinding debugging (drawing paths on the grid)
- Dynamic obstacle avoidance (inhabitants don't block paths)
- Pathfinding for invasions (may have different requirements)
- WebWorker-based pathfinding (future enhancement)

## Technical Considerations
- Depends on Issue #18 (Hallway Pathfinding) for existing pathfinding implementation
- Depends on Issue #42 (Multi-floor) for cross-floor data structures
- Cache key should be a string hash of `${startX},${startY},${startFloor}-${endX},${endY},${endFloor}`
- Binary heap can be implemented in `src/app/helpers/` or use a lightweight library
- Hierarchical pathfinding zones align with floors for simplicity
- Consider pre-computing floor connectivity graph at dungeon modification time

## Success Metrics
- Cache hit rate above 70% during normal gameplay
- Per-frame pathfinding time under 2ms even with 100+ rooms
- No pathfinding-related frame drops (> 16ms frames)
- Hierarchical pathfinding produces correct paths for all tested scenarios

## Open Questions
- Should inhabitants share pathfinding results (e.g., multiple inhabitants going to the same room)?
- Is Manhattan distance the best heuristic, or should we use Chebyshev for diagonal movement?
- Should we consider WebWorker offloading for very large dungeons?
