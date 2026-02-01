# PRD: Alchemy Lab Room

## Introduction
The Alchemy Lab is a Tier 2 conversion room that transforms base resources into Flux, a valuable advanced resource. Its base conversion rate is 5 Crystals + 5 Food = 1 Flux. It uses an L-shaped footprint, supports 1 inhabitant (upgradeable to 3), and has a medium base fear level. Upgrade paths allow specialization toward efficiency, new recipes, or increased capacity.

## Goals
- Implement a fully functional Alchemy Lab room with L-shaped layout
- Enable base conversion: 5 Crystals + 5 Food = 1 Flux
- Support 1 inhabitant with upgradeable capacity to 3
- Implement medium fear level
- Define and implement upgrade paths for specialization
- Integrate with the resource system for input/output tracking

## User Stories

### US-001: Alchemy Lab Room Definition
**Description:** As a developer, I want the Alchemy Lab defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] An `alchemy-lab.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (L-shaped), conversionRecipes, maxInhabitants, baseFearLevel, upgradePaths
- [ ] The shape is L-shaped (defined as a list of tile offsets)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: L-Shaped Room Placement
**Description:** As a dungeon builder, I want to place the Alchemy Lab as an L-shaped room on the grid.

**Acceptance Criteria:**
- [ ] The Alchemy Lab occupies an L-shaped set of tiles
- [ ] The room can be rotated (4 orientations) during placement
- [ ] Placement validates that all L-shaped tiles are unoccupied
- [ ] The room renders correctly on the grid in all orientations
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Base Flux Conversion
**Description:** As a dungeon builder, I want the Alchemy Lab to convert 5 Crystals + 5 Food into 1 Flux so that I can produce advanced resources.

**Acceptance Criteria:**
- [ ] The Lab converts 5 Crystals + 5 Food into 1 Flux per conversion cycle
- [ ] Conversion requires at least 1 inhabitant assigned
- [ ] Conversion only proceeds if sufficient Crystals and Food are available
- [ ] Resources are deducted and Flux is added atomically (no partial conversion)
- [ ] Conversion rate is visible in the room's UI panel
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Conversion Cycle Timing
**Description:** As a dungeon builder, I want conversion to happen on a defined time cycle so that production is predictable.

**Acceptance Criteria:**
- [ ] Each conversion cycle has a defined duration (e.g., 1 minute)
- [ ] A progress indicator shows the current cycle's completion percentage
- [ ] Conversion automatically repeats if resources are available
- [ ] Cycle pauses if the inhabitant is removed or resources are depleted
- [ ] Typecheck/lint passes

### US-005: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Alchemy Lab to hold 1 inhabitant (3 when upgraded) so that I can staff it.

**Acceptance Criteria:**
- [ ] Base capacity is 1 inhabitant
- [ ] Attempting to assign a 2nd inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 3
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Medium Fear Level
**Description:** As a developer, I want the Alchemy Lab to have a medium base fear level reflecting volatile experiments.

**Acceptance Criteria:**
- [ ] The Alchemy Lab's base fear level is set to Medium (2)
- [ ] Fear level is included in the room's gamedata definition
- [ ] Fear level integrates with the fear tracking system when available
- [ ] Typecheck/lint passes

### US-007: Upgrade Path - Efficient Distillation
**Description:** As a dungeon builder, I want an efficiency upgrade that reduces input costs for Flux production.

**Acceptance Criteria:**
- [ ] Upgrade reduces conversion cost (e.g., 3 Crystals + 3 Food = 1 Flux)
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Effect applies immediately to all future conversions
- [ ] Typecheck/lint passes

### US-008: Upgrade Path - Advanced Alchemy
**Description:** As a dungeon builder, I want an advanced upgrade that unlocks additional conversion recipes.

**Acceptance Criteria:**
- [ ] Upgrade unlocks new recipes (e.g., Gold + Crystals = Essence, Food + Corruption = Dark Flux)
- [ ] New recipes appear in the Lab's conversion menu
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: Upgrade Path - Expanded Capacity
**Description:** As a dungeon builder, I want a capacity upgrade to increase the Lab's inhabitant slots to 3.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 1 to 3
- [ ] Additional inhabitants increase conversion speed (e.g., parallel conversions or reduced cycle time)
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-010: Multiple Inhabitant Scaling
**Description:** As a dungeon builder, I want additional inhabitants to speed up conversion so that staffing the Lab is worthwhile.

**Acceptance Criteria:**
- [ ] Each additional inhabitant reduces cycle time by a percentage (e.g., -25% per extra inhabitant)
- [ ] Maximum benefit is capped (no zero-time conversion)
- [ ] Scaling formula is defined in gamedata
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Alchemy Lab must be defined in YAML gamedata with all required fields.
- FR-2: The room must use an L-shaped tile layout with rotation support.
- FR-3: Base conversion must be 5 Crystals + 5 Food = 1 Flux per cycle.
- FR-4: Inhabitant capacity must be 1 (base) upgradeable to 3.
- FR-5: Three mutually exclusive upgrade paths must be implemented.
- FR-6: Conversion must consume inputs and produce outputs atomically.

## Non-Goals (Out of Scope)
- Flux usage mechanics (handled by downstream features)
- Room placement UI generics (handled by earlier issues)
- Resource system internals (handled by Issue #7)
- Detailed alchemy recipe balancing (iterative)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and resource system (Issue #7).
- Conversion recipes should be defined in YAML as part of the room definition or a linked recipes file.
- The conversion state (current cycle progress, active recipe) should be stored on the room instance in game state.
- Atomic resource transactions must be enforced: check inputs, deduct, then add output in a single state update.
- L-shaped tile offsets need rotation variants (4 orientations).

## Success Metrics
- Alchemy Lab converts resources at the correct rate when staffed
- Conversion only proceeds when resources are available
- All 3 upgrade paths function correctly and are mutually exclusive
- Room persists correctly across save/load including conversion progress

## Open Questions
- What is the exact conversion cycle duration?
- How does inhabitant worker efficiency affect conversion speed?
- What additional recipes does the Advanced Alchemy upgrade unlock?
- Should the Lab display a visual effect during active conversion?
