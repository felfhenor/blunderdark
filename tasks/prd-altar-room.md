# PRD: Altar Room (Default)

## Introduction
The Altar Room is the starting room of every dungeon, auto-placed when a new game begins. It is a 3x3 square room that cannot be removed. The Altar serves as the central hub, enabling room placement and inhabitant recruitment. It has a built-in upgrade system (Levels 1-3) and reduces fear in adjacent rooms.

## Goals
- Auto-place the Altar Room at game start as a 3x3 square
- Prevent removal of the Altar (permanent fixture)
- Enable core game mechanics: room placement and recruitment
- Implement a 3-level upgrade system
- Reduce fear in adjacent rooms

## User Stories

### US-001: Auto-Placement on Game Start
**Description:** As a new player, I want the Altar Room to be automatically placed when I start a new game so that I have a starting point.

**Acceptance Criteria:**
- [ ] When a new game is created, the Altar Room is placed at a predefined central position
- [ ] The Altar occupies a 3x3 square of tiles
- [ ] The grid state includes the Altar as an occupied region
- [ ] The Altar has a unique visual distinguishing it from other rooms
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Cannot Be Removed
**Description:** As a dungeon builder, I should not be able to remove the Altar Room so that the game's anchor point is preserved.

**Acceptance Criteria:**
- [ ] The Altar Room has a `removable: false` flag
- [ ] The remove/demolish action is not available for the Altar
- [ ] If removal is attempted programmatically, it is rejected
- [ ] The UI does not show a delete button for the Altar
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Enables Room Placement
**Description:** As a dungeon builder, I want the Altar to enable me to build new rooms so that I can expand my dungeon.

**Acceptance Criteria:**
- [ ] The "Build Room" action is available only when the Altar exists (always true since it cannot be removed)
- [ ] Room placement range may be limited to within a radius of the Altar (or unlimited)
- [ ] The Altar's presence is checked as a prerequisite for building
- [ ] Typecheck/lint passes

### US-004: Enables Recruitment
**Description:** As a dungeon builder, I want the Altar to enable inhabitant recruitment so that I can staff my rooms.

**Acceptance Criteria:**
- [ ] Recruitment UI is accessible via the Altar
- [ ] The Altar may provide a recruitment menu or simply enable the global recruitment action
- [ ] Without the Altar at Level 1, basic recruitment is available
- [ ] Typecheck/lint passes

### US-005: Altar Level 2 Upgrade
**Description:** As a dungeon builder, I want to upgrade the Altar to Level 2 for enhanced capabilities.

**Acceptance Criteria:**
- [ ] Level 2 upgrade has a defined resource cost
- [ ] Level 2 unlocks additional features (e.g., expanded build range, faster recruitment, new room types)
- [ ] The Altar's visual changes to reflect Level 2
- [ ] Upgrade is applied immediately
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Altar Level 3 Upgrade
**Description:** As a dungeon builder, I want to upgrade the Altar to Level 3 for maximum capabilities.

**Acceptance Criteria:**
- [ ] Level 3 upgrade requires Level 2 and has a higher resource cost
- [ ] Level 3 unlocks end-game features (e.g., advanced rooms, special abilities)
- [ ] The Altar's visual changes to reflect Level 3
- [ ] Upgrade is applied immediately
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: Fear Reduction Aura
**Description:** As the system, I want the Altar to reduce fear in adjacent rooms so that it acts as a stabilizing influence.

**Acceptance Criteria:**
- [ ] Adjacent rooms receive a fear reduction modifier (e.g., -1 fear level)
- [ ] The reduction is applied via the fear propagation system
- [ ] Fear reduction may increase with Altar level
- [ ] Removing an adjacent room's connection to the Altar removes the reduction
- [ ] Typecheck/lint passes

### US-008: Altar Room Definition
**Description:** As a developer, I want the Altar defined in YAML gamedata.

**Acceptance Criteria:**
- [ ] An `altar.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (3x3), removable (false), upgradeLevels, fearReduction
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Altar Room must be auto-placed at game start at a central grid position.
- FR-2: The Altar must not be removable by any player action.
- FR-3: The Altar must enable room placement and recruitment mechanics.
- FR-4: Three upgrade levels (1, 2, 3) must be supported with increasing costs and benefits.
- FR-5: The Altar must reduce fear in adjacent rooms.

## Non-Goals (Out of Scope)
- Altar combat abilities or defensive features
- Multiple Altars in a single dungeon
- Altar relocation mechanics
- Detailed recruitment system (separate feature)

## Technical Considerations
- Depends on room shape system (Issue #3) and room data structure (Issue #5).
- The Altar's auto-placement should happen in the world generation step (`src/app/helpers/worldgen.ts` or similar).
- The `removable: false` flag should be checked in any room removal flow.
- Fear reduction should integrate with the fear propagation system (Issue #34) as a negative modifier.
- Altar upgrade levels could be stored as a field on the room instance in game state.

## Success Metrics
- Altar is present in every new game at the correct position
- Altar cannot be removed under any circumstances
- All 3 upgrade levels function with correct costs and effects
- Fear reduction is correctly applied to adjacent rooms

## Open Questions
- What is the exact grid position for auto-placement (center of map)?
- What specific features does each Altar level unlock?
- Should the fear reduction radius increase with Altar level?
