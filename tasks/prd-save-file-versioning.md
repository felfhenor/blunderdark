# PRD: Save File Versioning

## Introduction
Save File Versioning ensures that save files remain usable across game updates. Each save includes a version number, and migration logic transforms old save formats to the current version. This prevents players from losing progress when the game is updated and handles edge cases like saves from newer versions gracefully.

## Goals
- Include a version number in every save file
- Implement migration functions that upgrade saves from older versions to current
- Warn players if a save is from a newer game version
- Fail gracefully if a save is incompatible and cannot be migrated
- Maintain a clear migration chain from version 1 to current

## User Stories

### US-001: Save Version Stamping
**Description:** As a developer, I want every save file to include the current game save version so that the version is always known on load.

**Acceptance Criteria:**
- [ ] A `SAVE_VERSION` constant is defined and incremented with each save format change
- [ ] The serialization function includes `saveVersion: SAVE_VERSION` in the save data
- [ ] The save version is separate from the game application version
- [ ] Unit tests verify that serialized saves include the correct version
- [ ] Typecheck/lint passes

### US-002: Version Detection on Load
**Description:** As a developer, I want the load process to detect the save file version so that appropriate migration or warnings can be applied.

**Acceptance Criteria:**
- [ ] On load, the save version is read before full deserialization
- [ ] If the save version matches current, proceed normally
- [ ] If the save version is older, trigger migration pipeline
- [ ] If the save version is newer, show a warning to the player
- [ ] If the save has no version field, treat as version 1 (legacy)
- [ ] Unit tests verify version detection for all cases
- [ ] Typecheck/lint passes

### US-003: Migration Pipeline
**Description:** As a developer, I want a migration pipeline that sequentially upgrades save data from any older version to the current version.

**Acceptance Criteria:**
- [ ] A `migrations` array/map contains migration functions keyed by source version
- [ ] Each migration function transforms save data from version N to version N+1
- [ ] Migrations chain sequentially (v1 -> v2 -> v3 -> ... -> current)
- [ ] Each migration function is pure (input save data, output transformed save data)
- [ ] Migration functions are individually unit tested
- [ ] Typecheck/lint passes

### US-004: Adding New Fields Migration
**Description:** As a developer, I want migrations to handle new fields added in newer versions so that old saves gain default values.

**Acceptance Criteria:**
- [ ] When a new field is added to the save schema, a migration is created
- [ ] The migration sets a sensible default value for the new field
- [ ] Existing data in the save is preserved unchanged
- [ ] Unit tests verify the migration adds the field with the correct default
- [ ] Typecheck/lint passes

### US-005: Removing/Renaming Fields Migration
**Description:** As a developer, I want migrations to handle removed or renamed fields so that old saves are cleaned up correctly.

**Acceptance Criteria:**
- [ ] When a field is removed, the migration deletes it from save data
- [ ] When a field is renamed, the migration copies the value to the new key and deletes the old
- [ ] Data integrity is maintained through the transformation
- [ ] Unit tests verify field removal and rename migrations
- [ ] Typecheck/lint passes

### US-006: Newer Version Warning
**Description:** As a player, I want a warning when loading a save from a newer game version so that I understand potential issues.

**Acceptance Criteria:**
- [ ] If save version > current version, a dialog warns: "This save was created with a newer version of the game"
- [ ] The dialog offers "Try to Load Anyway" and "Cancel"
- [ ] If the player proceeds, the system attempts to load without migration
- [ ] If loading fails, a clear error message is shown
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Incompatible Save Handling
**Description:** As a player, I want graceful handling when a save file is completely incompatible so that the game does not crash.

**Acceptance Criteria:**
- [ ] If migration throws an error, the error is caught and logged
- [ ] The player sees a message: "This save file could not be loaded. It may be corrupted or from an incompatible version."
- [ ] The game returns to the main menu / save slot selection
- [ ] The incompatible save is not deleted (player may update the game)
- [ ] Unit tests verify error handling in migration pipeline
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Every save must include a version number
- FR-2: The system must detect save version on load and apply migrations as needed
- FR-3: Migrations must chain sequentially from any older version to current
- FR-4: Saves from newer versions must trigger a warning
- FR-5: Incompatible saves must fail gracefully without crashing

## Non-Goals (Out of Scope)
- Downgrade migrations (current version to older)
- Save file format changes (JSON to binary)
- Automatic game update prompts
- Save file repair tools

## Technical Considerations
- Depends on Issue #103 (Comprehensive Save System) for save/load infrastructure
- Migration functions should be kept in a dedicated file (e.g., `src/app/helpers/save-migrations.ts`)
- Each migration should be a small, focused function for testability
- The migration pipeline should log each step for debugging
- Consider using a version changelog comment in the migrations file for documentation
- Save version should be incremented in a single constant, not scattered across files

## Success Metrics
- Saves from all previous versions load correctly after migration
- Migration pipeline runs in under 50ms for typical saves
- Newer version warnings display correctly
- Incompatible saves never crash the application

## Open Questions
- How often do we expect save format changes (every release? major releases only)?
- Should we keep migration tests for very old versions indefinitely?
- Should migration be run lazily (on load) or eagerly (batch update all saves on game update)?
