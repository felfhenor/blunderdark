# PRD: Dark Forge Room

## Introduction
The Dark Forge is a Tier 2 crafting room that converts raw resources into equipment and upgrades. It uses a 2x2 square footprint, supports up to 2 inhabitants (upgradeable to 4), and has a medium base fear level. The Forge is central to the dungeon's equipment pipeline, with adjacency bonuses from Mines, Training Grounds, and Trap Workshops encouraging strategic placement near resource producers and combat facilities.

## Goals
- Implement a fully functional Dark Forge room with 2x2 square layout
- Enable resource-to-equipment/upgrade conversion via crafting options
- Support 2 inhabitants with upgradeable capacity to 4
- Implement medium fear level
- Define crafting recipes and options
- Define and implement adjacency bonuses for Forge+Mine, Forge+Training Grounds, Forge+Trap Workshop

## User Stories

### US-001: Dark Forge Room Definition
**Description:** As a developer, I want the Dark Forge defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A `dark-forge.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (2x2), maxInhabitants, baseFearLevel, upgradePaths, craftingRecipes, adjacencyBonuses
- [ ] The shape is a 2x2 square (defined as a list of 4 tile offsets)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: 2x2 Square Room Placement
**Description:** As a dungeon builder, I want to place the Dark Forge as a 2x2 square room on the grid so that it occupies the correct tiles.

**Acceptance Criteria:**
- [ ] The Dark Forge occupies a 2x2 square of tiles (4 tiles total)
- [ ] Placement validates that all 4 tiles are unoccupied
- [ ] The room renders correctly on the grid with the Forge sprite
- [ ] No rotation needed for a symmetric 2x2 shape (or rotation is a no-op)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Dark Forge to hold up to 2 inhabitants (4 when upgraded) so that I can staff it for crafting.

**Acceptance Criteria:**
- [ ] Base capacity is 2 inhabitants
- [ ] Attempting to assign a 3rd inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 4
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Medium Fear Level
**Description:** As a developer, I want the Dark Forge to have a medium base fear level so that it reflects the dangerous nature of forging.

**Acceptance Criteria:**
- [ ] The Dark Forge's base fear level is set to Medium (2)
- [ ] Fear level is included in the room's gamedata definition
- [ ] Fear level integrates with the fear tracking system when available
- [ ] Typecheck/lint passes

### US-005: Crafting - Equipment Creation
**Description:** As a dungeon builder, I want to use the Dark Forge to convert resources into equipment so that my inhabitants can be better armed.

**Acceptance Criteria:**
- [ ] At least 3 equipment recipes are defined (e.g., Iron Sword, Dark Shield, Shadow Armor)
- [ ] Each recipe specifies input resources (e.g., Crystals, Gold) and output equipment
- [ ] Crafting requires at least 1 inhabitant assigned to the Forge
- [ ] Crafting takes a defined amount of time to complete
- [ ] Crafted equipment is added to the player's inventory
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Crafting - Upgrade Creation
**Description:** As a dungeon builder, I want to use the Dark Forge to create room upgrades so that I can enhance my dungeon.

**Acceptance Criteria:**
- [ ] At least 2 upgrade recipes are defined (e.g., Reinforced Walls, Enhanced Production Module)
- [ ] Each recipe specifies input resources and the resulting upgrade item
- [ ] Upgrade items can be applied to compatible rooms
- [ ] Crafting time scales with recipe complexity
- [ ] Typecheck/lint passes

### US-007: Crafting Queue and Progress
**Description:** As a dungeon builder, I want to queue multiple crafting jobs and see progress so that I can plan my production.

**Acceptance Criteria:**
- [ ] Multiple crafting jobs can be queued (up to a defined max)
- [ ] Each job shows a progress bar or percentage
- [ ] Completed items are automatically added to inventory
- [ ] More inhabitants reduce crafting time per item
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: Upgrade Path - Master Forge
**Description:** As a dungeon builder, I want to upgrade the Forge to Master level for increased capacity and reduced crafting time.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 2 to 4
- [ ] Upgrade reduces crafting time by 25%
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-009: Upgrade Path - Infernal Forge
**Description:** As a dungeon builder, I want an Infernal upgrade that unlocks advanced recipes and adds bonus stats to crafted items.

**Acceptance Criteria:**
- [ ] Upgrade unlocks 2+ advanced crafting recipes
- [ ] Crafted equipment gains bonus stats (e.g., +fire damage)
- [ ] Upgrade has a defined resource cost (higher than Master Forge)
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-010: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Dark Forge to receive adjacency bonuses from specific room types so that placement strategy matters.

**Acceptance Criteria:**
- [ ] Forge + Mine adjacency: +30% crafting speed
- [ ] Forge + Training Grounds adjacency: crafted equipment gains +1 bonus stat
- [ ] Forge + Trap Workshop adjacency: trap recipes gain +20% effectiveness
- [ ] Bonuses are defined in gamedata and activate via the adjacency bonus system
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Dark Forge must be defined in YAML gamedata with all required fields.
- FR-2: The room must use a 2x2 square tile layout.
- FR-3: Resource-to-equipment and resource-to-upgrade crafting must be supported with defined recipes.
- FR-4: Inhabitant capacity must be 2 (base) upgradeable to 4.
- FR-5: Two mutually exclusive upgrade paths must be implemented.
- FR-6: Adjacency bonuses for Forge+Mine, Forge+Training Grounds, Forge+Trap Workshop must be defined.
- FR-7: Crafting requires at least one assigned inhabitant and consumes defined resources.

## Non-Goals (Out of Scope)
- Equipment stat system details (separate feature)
- Inhabitant equipment UI (separate feature)
- Room placement UI generics (handled by earlier issues)
- Production system internals (handled by Issue #9)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and resource system (Issue #7).
- Crafting recipes should be defined in the YAML content pipeline alongside the room definition or in a separate recipes file.
- The crafting queue state should be stored on the room instance in game state (IndexedDB).
- Adjacency bonuses should reference the bonus system from the adjacency detection system.
- Equipment items will need a type definition in `src/app/interfaces/`.

## Success Metrics
- Dark Forge can be placed, staffed, and produces equipment/upgrades from resources
- Crafting recipes consume correct resources and produce correct outputs
- Both upgrade paths function correctly and are mutually exclusive
- Adjacency bonuses activate correctly with qualifying adjacent rooms
- Room persists correctly across save/load

## Open Questions
- What are the exact crafting recipes and their resource costs?
- How does crafting time scale with the number of assigned inhabitants?
- Should crafted equipment be auto-equipped or require manual assignment?
- What advanced recipes does the Infernal Forge unlock?
