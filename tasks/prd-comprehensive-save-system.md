# PRD: Comprehensive Save System

## Introduction
The Comprehensive Save System serializes the entire game state to persistent storage, enabling players to save and resume their dungeon at any point. This includes all floors, rooms, hallways, inhabitants, assignments, resources, research, reputation, time state, invasion history, and victory progress. The save format is JSON stored in IndexedDB.

## Goals
- Serialize the complete game state to a JSON format
- Deserialize and restore game state faithfully on load
- Support manual save and load operations via UI
- Ensure save/load completes within acceptable time limits
- Handle save corruption gracefully

## User Stories

### US-001: Define Complete Save Schema
**Description:** As a developer, I want a comprehensive save schema so that every piece of game state is captured.

**Acceptance Criteria:**
- [ ] A `SaveData` type is defined encompassing all game state subsystems
- [ ] Includes: `meta` (version, timestamp, playtime), `world` (floors, rooms, hallways, grid state), `inhabitants` (all creatures and assignments), `resources` (current values, storage limits), `research` (progress, completed), `reputation` (all categories), `clock` (day/night, season, tick count), `invasions` (history), `victory` (progress for all paths)
- [ ] All nested types are JSON-serializable (no functions, signals, or class instances)
- [ ] Types use `type` keyword per project conventions
- [ ] Typecheck/lint passes

### US-002: Save Serialization
**Description:** As a developer, I want a serialization function that converts live game state signals into a plain JSON save object.

**Acceptance Criteria:**
- [ ] A `serializeGameState()` function reads all relevant signals and produces a `SaveData` object
- [ ] The function handles nested signal values (unwrapping computed signals)
- [ ] The output is valid JSON (verified by `JSON.stringify` / `JSON.parse` round-trip)
- [ ] Serialization completes in under 100ms for a large game state (100+ rooms)
- [ ] Unit tests verify serialization produces expected structure
- [ ] Typecheck/lint passes

### US-003: Save Deserialization
**Description:** As a developer, I want a deserialization function that restores game state from a save object.

**Acceptance Criteria:**
- [ ] A `deserializeGameState(saveData)` function populates all game state signals from the save object
- [ ] All subsystems (rooms, inhabitants, resources, etc.) are correctly restored
- [ ] Derived/computed signals recalculate correctly after deserialization
- [ ] The game loop resumes from the saved tick count
- [ ] Unit tests verify deserialization produces identical state to what was serialized
- [ ] Typecheck/lint passes

### US-004: Manual Save Operation
**Description:** As a player, I want to manually save my game so that I can preserve my progress at will.

**Acceptance Criteria:**
- [ ] A "Save Game" button is accessible from the game UI (menu or pause screen)
- [ ] Clicking "Save" serializes the current state and writes to IndexedDB
- [ ] A success confirmation appears after save completes
- [ ] If save fails, an error message is displayed with guidance
- [ ] The save operation does not freeze the game for more than 200ms
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Manual Load Operation
**Description:** As a player, I want to load a previously saved game so that I can resume from a saved point.

**Acceptance Criteria:**
- [ ] A "Load Game" button is accessible from the main menu and pause menu
- [ ] Clicking "Load" reads from IndexedDB and deserializes the save
- [ ] The game transitions to the game-play page with all state restored
- [ ] A loading indicator is shown during deserialization
- [ ] If the save is corrupted or incompatible, a user-friendly error is shown
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Save Data Validation
**Description:** As a developer, I want save data validated on load so that corrupt or incomplete saves are handled gracefully.

**Acceptance Criteria:**
- [ ] A `validateSaveData(data)` function checks the save structure against the schema
- [ ] Missing fields are detected and reported
- [ ] Invalid data types are detected (e.g., string where number expected)
- [ ] Validation returns a list of errors or a success result
- [ ] If validation fails, the load operation is aborted with an error message
- [ ] Unit tests verify detection of various corruption scenarios
- [ ] Typecheck/lint passes

### US-007: Save Integrity Check
**Description:** As a developer, I want save files to include a checksum so that tampering or corruption is detectable.

**Acceptance Criteria:**
- [ ] A checksum (hash) is computed from the serialized save data
- [ ] The checksum is stored alongside the save data
- [ ] On load, the checksum is recomputed and compared
- [ ] Mismatched checksums trigger a warning but allow the player to proceed
- [ ] Unit tests verify checksum computation and mismatch detection
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must serialize the entire game state to a JSON-compatible format
- FR-2: The system must deserialize and restore game state from a save object
- FR-3: Players must be able to manually save and load via UI controls
- FR-4: Save data must be validated on load to detect corruption
- FR-5: Save/load operations must provide user feedback (success, error, progress)

## Non-Goals (Out of Scope)
- Autosave (handled by Issue #104)
- Multiple save slots (handled by Issue #105)
- Save file versioning and migration (handled by Issue #106)
- Cloud save or sync
- Save file export/import to filesystem

## Technical Considerations
- IndexedDB is the primary storage backend (consistent with existing `indexedDbSignal` pattern)
- JSON format chosen for debuggability and simplicity; binary compression can be added later
- Serialization must unwrap Angular Signals to plain values
- Large saves (100+ rooms) may require chunked writes to avoid blocking the main thread
- Save validation should use a schema validation library or hand-written checks
- Integration with Electron: IndexedDB works in Electron but path/storage limits differ

## Success Metrics
- Save/load round-trip produces identical game state (verified by unit tests)
- Save operation completes in under 200ms for typical game states
- Load operation completes in under 500ms for typical game states
- Corrupt save detection works for at least 5 corruption scenarios

## Open Questions
- Should saves be compressed (e.g., LZ-string) to reduce IndexedDB storage usage?
- Should the save include a screenshot/thumbnail for the save slot display?
- What is the maximum save size we should support before warning the player?
