# PRD: Load Time Optimization

## Introduction
Load Time Optimization ensures that loading saved games is fast and provides clear progress feedback. This includes async loading for large saves, a progress bar during load, lazy loading for game assets, and a target of under 10 seconds for the largest dungeons.

## Goals
- Load saved games asynchronously without blocking the UI
- Display a progress bar during load operations
- Lazy load game assets that are not needed immediately
- Achieve load time under 10 seconds for large dungeons (100+ rooms)
- Provide clear feedback if loading takes longer than expected

## User Stories

### US-001: Async Save Loading
**Description:** As a developer, I want save loading to be asynchronous so that the UI remains responsive during load.

**Acceptance Criteria:**
- [ ] Save deserialization runs in async chunks using `requestIdleCallback` or `setTimeout` batching
- [ ] The main thread is not blocked for more than 50ms at a time during load
- [ ] Load progress is reportable as a percentage
- [ ] The load can be canceled if the player navigates away
- [ ] Unit tests verify async load completes with correct state
- [ ] Typecheck/lint passes

### US-002: Load Progress Bar
**Description:** As a player, I want to see a progress bar while my game loads so that I know the load is working and how long to wait.

**Acceptance Criteria:**
- [ ] A loading screen appears when a save load begins
- [ ] A progress bar fills from 0% to 100% based on load stages
- [ ] Load stages include: reading from IndexedDB, decompression, deserialization, state hydration, asset loading
- [ ] The loading screen shows the current stage name
- [ ] The progress bar animates smoothly (no jumps from 0% to 80%)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Asset Lazy Loading
**Description:** As a developer, I want game assets (spritesheets, audio) lazy loaded so that initial load time is minimized.

**Acceptance Criteria:**
- [ ] Spritesheet atlases are loaded on demand when a floor is first viewed
- [ ] Audio files are loaded when first needed (not at app init)
- [ ] A preload hint system loads assets for the next likely floor in the background
- [ ] Missing assets show a placeholder while loading (no blank spaces)
- [ ] Asset loading does not block the game loop
- [ ] Typecheck/lint passes

### US-004: Phased State Hydration
**Description:** As a developer, I want state hydration to happen in phases so that the player can see partial results quickly.

**Acceptance Criteria:**
- [ ] Phase 1: Load meta and clock state (instant, shows basic UI)
- [ ] Phase 2: Load current floor grid and rooms (player sees dungeon quickly)
- [ ] Phase 3: Load inhabitants and assignments for current floor
- [ ] Phase 4: Load remaining floors in background
- [ ] Phase 5: Load event history, victory progress, and non-critical data
- [ ] The game becomes playable after Phase 3 completes
- [ ] Typecheck/lint passes

### US-005: Load Time Budgeting
**Description:** As a developer, I want load time measured and budgeted per phase so that I can identify slow phases.

**Acceptance Criteria:**
- [ ] Each load phase is timed using performance marks
- [ ] Phase times are logged in debug mode
- [ ] If any phase exceeds its budget (e.g., deserialization > 3 seconds), a warning is logged
- [ ] Total load time is recorded and accessible via performance utilities
- [ ] Load time for a 100+ room dungeon is under 10 seconds
- [ ] Typecheck/lint passes

### US-006: Load Failure Recovery
**Description:** As a player, I want graceful handling when load takes too long or fails so that I am not stuck on a loading screen.

**Acceptance Criteria:**
- [ ] If load exceeds 30 seconds, a "Taking longer than expected" message appears
- [ ] A "Cancel" button is available on the loading screen
- [ ] If load fails entirely, an error message is shown with "Return to Menu" option
- [ ] Partial load state is cleaned up on failure (no corrupted game state)
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: Save loading must be asynchronous and non-blocking
- FR-2: A progress bar must show load progress through defined stages
- FR-3: Assets must be lazy loaded to minimize initial load time
- FR-4: State hydration must be phased so the game becomes playable before all data is loaded
- FR-5: Load time must be under 10 seconds for dungeons with 100+ rooms

## Non-Goals (Out of Scope)
- Streaming/incremental saves
- Background loading while playing a different save
- Network-based asset loading (CDN)
- Save file format optimization (handled by compression in #109)

## Technical Considerations
- Depends on Issue #103 (Comprehensive Save System) for save format
- `requestIdleCallback` is not available in all browsers; use a polyfill or `setTimeout` fallback
- Phased hydration requires the save format to support partial reading
- Lazy loading integrates with Angular's lazy loading for route-based code splitting
- Electron may have different IndexedDB performance characteristics than browsers
- Progress reporting requires save format to be divisible into measurable chunks

## Success Metrics
- Load time under 10 seconds for 100+ room dungeons
- Progress bar updates at least 10 times during a typical load (smooth progression)
- Game is playable (Phase 3 complete) within 5 seconds for typical saves
- No load failures due to timeout for valid save files

## Open Questions
- Should we support background preloading of saves (load next likely save slot)?
- What is the maximum save size we should optimize for?
- Should load performance metrics be reported to analytics?
