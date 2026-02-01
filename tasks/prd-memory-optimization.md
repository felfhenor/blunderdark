# PRD: Memory Optimization

## Introduction
Memory Optimization reduces the game's memory footprint by unloading unused floor data, pooling frequently created objects, compressing save files, and limiting event history storage. These techniques prevent memory growth in long play sessions and large dungeons.

## Goals
- Unload floor data for floors the player is not viewing
- Implement object pooling for frequently allocated/deallocated objects
- Compress save data to reduce storage usage
- Limit event history to prevent unbounded memory growth
- Achieve stable memory usage over long play sessions

## User Stories

### US-001: Floor Data Unloading
**Description:** As a developer, I want unused floor data unloaded from memory so that only the active floor and adjacent floors are fully loaded.

**Acceptance Criteria:**
- [ ] When the player switches floors, the previous floor's detailed data (tile states, inhabitant positions) is serialized to a compact format
- [ ] Only the active floor and one floor above/below are fully loaded
- [ ] Switching back to an unloaded floor re-hydrates its data
- [ ] Floor summary data (room count, inhabitant count) remains in memory for UI panels
- [ ] Re-hydration completes in under 100ms per floor
- [ ] Unit tests verify unload/reload data integrity
- [ ] Typecheck/lint passes

### US-002: Object Pooling System
**Description:** As a developer, I want an object pool for frequently created objects so that garbage collection pressure is reduced.

**Acceptance Criteria:**
- [ ] A generic `ObjectPool<T>` class is implemented in `src/app/helpers/object-pool.ts`
- [ ] The pool supports `acquire()` and `release(obj)` operations
- [ ] Acquired objects are reset to default state before being returned
- [ ] The pool has a configurable maximum size
- [ ] Pools are created for: pathfinding nodes, event objects, particle data (if applicable)
- [ ] Unit tests verify pool acquire, release, reset, and max size behavior
- [ ] Typecheck/lint passes

### US-003: Save Data Compression
**Description:** As a developer, I want save data compressed before writing to IndexedDB so that storage usage is minimized.

**Acceptance Criteria:**
- [ ] Save data is compressed using a lightweight algorithm (e.g., LZ-string or pako)
- [ ] Compression and decompression are transparent to the save/load API
- [ ] Compressed saves are at least 50% smaller than uncompressed JSON
- [ ] Compression adds less than 100ms to save time for large dungeons
- [ ] Decompression adds less than 50ms to load time
- [ ] Unit tests verify compression round-trip data integrity
- [ ] Typecheck/lint passes

### US-004: Event History Pruning
**Description:** As a developer, I want event history limited to a maximum number of entries so that memory does not grow unboundedly.

**Acceptance Criteria:**
- [ ] Event history is capped at a configurable maximum (e.g., 1000 entries)
- [ ] When the cap is reached, the oldest events are removed (FIFO)
- [ ] Important events (invasions, victories, level-ups) are flagged and retained longer
- [ ] The event log UI handles the pruned history gracefully (no errors for missing events)
- [ ] Unit tests verify pruning behavior and important event retention
- [ ] Typecheck/lint passes

### US-005: Memory Usage Monitoring
**Description:** As a developer, I want runtime memory monitoring so that I can verify optimization effectiveness.

**Acceptance Criteria:**
- [ ] A memory monitor utility samples `performance.memory` periodically
- [ ] Memory usage is logged or displayable via debug tools
- [ ] Memory growth rate is computed (MB per minute of gameplay)
- [ ] An alert triggers if memory exceeds a configurable threshold (e.g., 500MB)
- [ ] Integrates with the performance profiling system (Issue #107)
- [ ] Typecheck/lint passes

### US-006: Signal Cleanup on State Transitions
**Description:** As a developer, I want Angular signals and computed values properly cleaned up on route transitions so that stale subscriptions do not leak memory.

**Acceptance Criteria:**
- [ ] Components that create effects (`effect()`) use `DestroyRef` for automatic cleanup
- [ ] Services that create intervals or timeouts clean up on destroy
- [ ] Route transitions do not leave orphaned signal subscriptions
- [ ] Memory profiling before and after multiple route transitions shows no growth
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Unused floor data must be unloaded to reduce active memory usage
- FR-2: Frequently created objects must use object pooling to reduce GC pressure
- FR-3: Save data must be compressed before storage
- FR-4: Event history must be bounded with configurable limits
- FR-5: Memory usage must be monitorable for verification

## Non-Goals (Out of Scope)
- WebWorker-based computation offloading
- Sprite atlas memory optimization (handled by the content pipeline)
- Network-related memory optimization
- GPU memory management

## Technical Considerations
- Depends on all core systems being implemented
- Floor unloading requires a serialization format lighter than full JSON (consider structured clone)
- LZ-string is a good compression choice for JavaScript (pure JS, fast, good ratios)
- Object pools work best for objects with simple, resettable state
- `performance.memory` is Chrome-only; detect availability before using
- Angular's `DestroyRef` and `takeUntilDestroyed` are the preferred cleanup patterns

## Success Metrics
- Memory usage stays under 300MB for a 100+ room dungeon after 30 minutes of play
- Floor unloading reduces per-floor memory by at least 60%
- Save compression achieves 50%+ size reduction
- No memory leaks detected over a 1-hour play session

## Open Questions
- Should we use SharedArrayBuffer for floor data if WebWorkers are added later?
- What is the target maximum memory budget for the application?
- Should compressed saves be the default, or an opt-in setting?
