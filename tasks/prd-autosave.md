# PRD: Autosave

## Introduction
The Autosave system automatically saves game progress at regular intervals, before critical events, and on quit. It runs unobtrusively in the background without blocking gameplay, providing players with a safety net against data loss.

## Goals
- Automatically save game state every 5 minutes during gameplay
- Trigger autosave before invasions and on application quit
- Display a non-blocking save indicator during autosave
- Use a dedicated autosave slot separate from manual saves
- Ensure autosave does not cause frame drops or gameplay interruption

## User Stories

### US-001: Periodic Autosave
**Description:** As a player, I want the game to automatically save every 5 minutes so that I do not lose significant progress.

**Acceptance Criteria:**
- [ ] The autosave timer starts when the game-play page loads
- [ ] Every 5 minutes of real time (not game time), an autosave triggers
- [ ] The autosave writes to a dedicated autosave slot in IndexedDB
- [ ] The timer resets after each autosave (whether automatic or triggered by events)
- [ ] The 5-minute interval is configurable via a constant
- [ ] Unit tests verify timer logic
- [ ] Typecheck/lint passes

### US-002: Pre-Invasion Autosave
**Description:** As a player, I want the game to autosave before an invasion begins so that I can retry if the invasion goes badly.

**Acceptance Criteria:**
- [ ] When an invasion event is about to start, an autosave triggers first
- [ ] The autosave completes before the invasion sequence begins
- [ ] If autosave fails, the invasion proceeds anyway (non-blocking on failure)
- [ ] The periodic autosave timer resets after a pre-invasion save
- [ ] Typecheck/lint passes

### US-003: Quit Autosave
**Description:** As a player, I want the game to autosave when I close the application so that my latest progress is preserved.

**Acceptance Criteria:**
- [ ] The `beforeunload` browser event triggers an autosave
- [ ] In Electron, the window close event triggers an autosave before quitting
- [ ] The save is synchronous or uses `sendBeacon`/`navigator.storage` to ensure completion
- [ ] If the save cannot complete (browser closes too fast), no crash occurs
- [ ] Typecheck/lint passes

### US-004: Autosave Indicator
**Description:** As a player, I want to see a brief, non-intrusive indicator when autosave occurs so that I know my progress is being saved.

**Acceptance Criteria:**
- [ ] A small save icon (e.g., floppy disk or spinning indicator) appears in a corner of the game UI
- [ ] The indicator appears when autosave starts and disappears when it completes
- [ ] The indicator does not block any gameplay interactions
- [ ] The indicator shows for at least 1 second even if save is instant (so the player notices it)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Autosave Error Handling
**Description:** As a player, I want to be notified if autosave fails so that I can manually save.

**Acceptance Criteria:**
- [ ] If autosave fails (IndexedDB error, storage full, etc.), a warning notification appears
- [ ] The notification suggests the player manually save
- [ ] Failed autosaves do not crash the game or interrupt gameplay
- [ ] The autosave timer retries after the normal interval
- [ ] Typecheck/lint passes

### US-006: Autosave Settings
**Description:** As a player, I want to configure autosave behavior in the options menu so that I can adjust it to my preference.

**Acceptance Criteria:**
- [ ] Options menu includes an autosave toggle (on/off, default: on)
- [ ] Options menu includes autosave interval selection (1, 3, 5, 10 minutes)
- [ ] Settings persist via `localStorageSignal` in the options state
- [ ] Changing interval takes effect immediately (resets the timer)
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The system must automatically save every 5 minutes (default, configurable)
- FR-2: The system must autosave before invasion events
- FR-3: The system must attempt to autosave on application quit
- FR-4: The autosave indicator must appear during save without blocking gameplay
- FR-5: Autosave failures must not crash the game

## Non-Goals (Out of Scope)
- Manual save (handled by Issue #103)
- Multiple save slots for autosave (one dedicated slot only)
- Save file versioning (handled by Issue #106)
- Cloud sync of autosaves

## Technical Considerations
- Depends on Issue #103 (Comprehensive Save System) for serialization/deserialization
- Use `setInterval` or game loop tick counting for the periodic timer
- `beforeunload` event has limited time; consider using synchronous IndexedDB write or `navigator.sendBeacon`
- In Electron, use `app.on('before-quit')` for more reliable quit-save
- Autosave should serialize and write asynchronously to avoid main-thread blocking
- Consider using `requestIdleCallback` to schedule autosave during idle frames

## Success Metrics
- Autosave triggers reliably every 5 minutes without player action
- Autosave completes without visible frame drops (< 16ms main thread block)
- Pre-invasion autosave consistently fires before invasion start
- Quit autosave captures state at least 90% of the time

## Open Questions
- Should autosave be paused when the game is paused?
- Should there be multiple autosave rotation slots (e.g., last 3 autosaves)?
- How should autosave interact with the Electron tray/minimize behavior?
