# PRD: Performance Profiling

## Introduction
Performance Profiling establishes a systematic approach to measuring and documenting the game's performance characteristics. Using browser profiling tools, the goal is to identify bottlenecks, measure frame times, stress-test with large dungeons (100+ rooms), and create a documented baseline for optimization work.

## Goals
- Measure frame time and identify the slowest functions/systems
- Stress-test with maximum dungeon size (100+ rooms, multiple floors)
- Establish performance baselines and targets
- Document all findings for use by optimization issues (#108, #109, #110)
- Create reusable performance testing utilities

## User Stories

### US-001: Performance Testing Harness
**Description:** As a developer, I want a performance testing utility so that I can consistently measure frame time and system performance.

**Acceptance Criteria:**
- [ ] A `src/app/helpers/performance.ts` utility file provides timing functions
- [ ] Functions include: `measureFrameTime()`, `measureFunctionTime(fn)`, `startPerfMark(name)`, `endPerfMark(name)`
- [ ] Utilities use `performance.now()` and `performance.mark()` APIs
- [ ] Results can be logged to console or collected in an array for analysis
- [ ] Typecheck/lint passes

### US-002: Large Dungeon Test Scenario
**Description:** As a developer, I want a script or helper that generates a large dungeon (100+ rooms) so that I can stress-test performance.

**Acceptance Criteria:**
- [ ] A helper function `generateTestDungeon(roomCount, floorCount)` creates a populated game state
- [ ] The generated dungeon has rooms, hallways, inhabitants, and active production
- [ ] The function is callable from a dev-tools console or test file
- [ ] Generated dungeons have 100+ rooms across 5+ floors by default
- [ ] Unit tests verify the generator produces valid game state
- [ ] Typecheck/lint passes

### US-003: Frame Time Measurement
**Description:** As a developer, I want to measure per-frame time during gameplay so that I can identify frames that exceed 16ms.

**Acceptance Criteria:**
- [ ] A debug mode flag enables per-frame timing in the game loop
- [ ] Each frame logs its duration to a rolling buffer (last 300 frames)
- [ ] Average, min, max, and 95th percentile frame times are computed
- [ ] Frames exceeding 16ms are flagged as "slow frames"
- [ ] Results are accessible via a dev-tools console command
- [ ] Typecheck/lint passes

### US-004: System-Level Profiling
**Description:** As a developer, I want to profile individual game systems (production, pathfinding, rendering) so that I know which system is the bottleneck.

**Acceptance Criteria:**
- [ ] Each major system tick (production, inhabitant AI, pathfinding, rendering) is wrapped with performance marks
- [ ] A profiling report breaks down frame time by system
- [ ] The report identifies the top 3 slowest systems
- [ ] Profiling can be enabled/disabled without code changes (feature flag or debug signal)
- [ ] Typecheck/lint passes

### US-005: Memory Usage Measurement
**Description:** As a developer, I want to measure memory usage so that I can identify memory leaks or excessive allocation.

**Acceptance Criteria:**
- [ ] A utility function reads `performance.memory` (Chrome) or equivalent APIs
- [ ] Memory usage is sampled periodically (every 30 seconds) during a profiling session
- [ ] Memory growth over time is logged (detect leaks)
- [ ] Heap snapshot guidance is documented for manual profiling
- [ ] Typecheck/lint passes

### US-006: Performance Baseline Documentation
**Description:** As a developer, I want documented performance baselines so that optimization efforts have measurable targets.

**Acceptance Criteria:**
- [ ] A performance baseline document is created (or section in existing docs) listing: target frame time (< 16ms), target load time (< 5s), target save time (< 200ms)
- [ ] Baseline measurements are recorded for: empty dungeon, medium dungeon (50 rooms), large dungeon (100+ rooms)
- [ ] The document identifies known bottlenecks discovered during profiling
- [ ] The document prioritizes systems by impact (which optimization yields most improvement)
- [ ] Typecheck/lint passes (for any code changes)

## Functional Requirements
- FR-1: The system must provide utilities to measure frame time, function time, and memory usage
- FR-2: A large dungeon generator must create stress-test scenarios
- FR-3: Per-system profiling must identify which game systems consume the most frame time
- FR-4: Performance baselines must be documented with measurable targets
- FR-5: Profiling must be toggle-able without production impact

## Non-Goals (Out of Scope)
- Actual optimization (handled by Issues #108, #109, #110)
- Automated performance regression testing in CI
- GPU profiling or WebGL performance
- Mobile device performance testing

## Technical Considerations
- `performance.memory` is Chrome-only; provide fallback for other browsers
- Profiling overhead should be minimal (< 1ms per frame when enabled)
- The large dungeon generator should produce deterministic output for reproducible tests
- Consider using the `PerformanceObserver` API for long-task detection
- Performance marks integrate with Chrome DevTools Performance tab for visual analysis

## Success Metrics
- Performance utilities produce consistent, repeatable measurements
- Large dungeon test scenario generates valid 100+ room dungeons
- All major game systems have profiling instrumentation
- Performance baselines are documented with clear targets

## Open Questions
- Should we integrate with an external profiling/monitoring tool?
- What is the minimum acceptable frame rate (30fps or 60fps)?
- Should profiling data be exportable for offline analysis?
