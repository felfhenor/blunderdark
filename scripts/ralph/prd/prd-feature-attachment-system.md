# PRD: Feature Attachment System

## Introduction
The Feature Attachment System allows players to enhance rooms by purchasing and attaching features to designated slots. Each room has 2-3 feature slots depending on its size, and features provide various bonuses. Features can be removed but are destroyed in the process. This system adds a layer of strategic customization to dungeon room management.

## Goals
- Define feature slot mechanics tied to room size (2 slots for small, 3 for large)
- Implement purchase and attachment workflow for room features
- Support feature removal with destruction penalty
- Display features visually within rooms
- Persist feature state as part of room data in the game save

## User Stories

### US-001: Define Feature Data Types
**Description:** As a developer, I want feature-related data types so that feature slots, features, and attachments are well-typed throughout the codebase.

**Acceptance Criteria:**
- [ ] A `RoomFeature` type is defined with: `id`, `name`, `description`, `cost` (resource costs), `bonuses` (array of bonus effects), `category`
- [ ] A `FeatureSlot` type is defined with: `slotIndex`, `attachedFeatureId: string | null`
- [ ] A `RoomFeatureState` type tracks feature slots for a room: `slots: FeatureSlot[]`
- [ ] Types use `type` keyword per project conventions
- [ ] Types are defined in `src/app/interfaces/`
- [ ] Typecheck/lint passes

### US-002: Feature Slot Allocation by Room Size
**Description:** As a developer, I want rooms to have feature slots based on their size so that larger rooms offer more customization.

**Acceptance Criteria:**
- [ ] Small rooms (1-2 tiles) receive 2 feature slots
- [ ] Large rooms (3+ tiles) receive 3 feature slots
- [ ] Feature slot count is determined at room creation and stored in room state
- [ ] A helper function `getFeatureSlotCount(roomSize)` returns the correct count
- [ ] Unit tests verify slot counts for various room sizes
- [ ] Typecheck/lint passes

### US-003: Feature Purchase and Attachment
**Description:** As a player, I want to purchase a feature and attach it to a room slot so that I can customize my rooms.

**Acceptance Criteria:**
- [ ] Clicking an empty feature slot opens a feature selection panel
- [ ] Available features are listed with name, description, cost, and bonuses
- [ ] Features that the player cannot afford are shown but disabled with cost highlighting
- [ ] Selecting a feature and confirming deducts resources and attaches the feature to the slot
- [ ] The slot visually updates to show the attached feature
- [ ] A feature cannot be attached to a slot that already has a feature
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Feature Removal
**Description:** As a player, I want to remove a feature from a room slot so that I can free the slot, understanding the feature is destroyed.

**Acceptance Criteria:**
- [ ] Right-clicking or using a remove button on an occupied slot shows a confirmation dialog
- [ ] The confirmation dialog warns that the feature will be destroyed (no refund)
- [ ] Confirming removal clears the slot and removes all associated bonuses
- [ ] The slot becomes available for a new feature
- [ ] Canceling the dialog leaves the feature intact
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Feature Bonus Application
**Description:** As a developer, I want attached features to apply their bonuses to the room so that features have a tangible gameplay effect.

**Acceptance Criteria:**
- [ ] When a feature is attached, its bonuses are applied to the room's production/stats
- [ ] When a feature is removed, its bonuses are reverted
- [ ] Bonuses support types: flat production increase, percentage modifier, stat modifier
- [ ] Multiple features on the same room stack their bonuses
- [ ] A helper function computes total bonuses for a room from all attached features
- [ ] Unit tests verify bonus application, removal, and stacking
- [ ] Typecheck/lint passes

### US-006: Feature Visual Representation
**Description:** As a player, I want to see visual indicators of attached features on rooms so that I can quickly identify enhanced rooms.

**Acceptance Criteria:**
- [ ] Rooms with features display small icons or markers for each occupied slot
- [ ] Feature icons are distinct per feature category
- [ ] Hovering a feature icon shows a tooltip with feature name and bonuses
- [ ] Empty slots show a subtle "+" indicator when the room is selected
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Feature Gamedata Definition
**Description:** As a developer, I want features defined in YAML gamedata so that designers can add and tune features without code changes.

**Acceptance Criteria:**
- [ ] A `feature/` directory exists in `gamedata/` with YAML files for feature definitions
- [ ] Each feature YAML includes: id, name, description, cost, bonuses, category, slot requirements
- [ ] The build pipeline compiles feature YAML to JSON
- [ ] TypeScript schemas are generated for feature data
- [ ] `ContentService` loads compiled feature data at app init
- [ ] Typecheck/lint passes

### US-008: Feature State Persistence
**Description:** As a player, I want my room features to be saved and restored so that customizations persist across sessions.

**Acceptance Criteria:**
- [ ] Room feature state is included in the room data within `GameState`
- [ ] On save, all feature slots and attachments are serialized
- [ ] On load, features are restored and bonuses reapplied
- [ ] Unit tests verify feature state serialization round-trip
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Each room must have 2-3 feature slots based on room size
- FR-2: Players must be able to purchase and attach features to empty slots
- FR-3: Attached features must apply their defined bonuses to the room
- FR-4: Players must be able to remove features, destroying them in the process
- FR-5: Features must be visually represented on rooms in the game UI
- FR-6: Feature state must persist as part of the game save

## Non-Goals (Out of Scope)
- Specific feature definitions (handled by Issues #98, #99, #100)
- Feature crafting or combining
- Feature trading between rooms (move without destroying)
- Feature leveling or upgrading

## Technical Considerations
- Depends on Issue #5 (Room Placement) for room data structures
- Depends on Issue #7 (Room Types/Sizes) for size-based slot allocation
- Feature bonuses should use a generic bonus system that other systems can also use
- Feature data in YAML allows the content pipeline to validate feature definitions
- Use `computed()` signals for derived room stats that include feature bonuses

## Success Metrics
- Players can attach and remove features without errors
- Feature bonuses correctly modify room production/stats
- Feature state survives save/load without data loss
- Feature UI renders without layout issues for rooms with 0, 1, 2, or 3 features

## Open Questions
- Should features have prerequisites (e.g., room type restrictions)?
- Can the same feature type be attached to multiple slots in one room?
- Should there be a partial refund option for removing features?
