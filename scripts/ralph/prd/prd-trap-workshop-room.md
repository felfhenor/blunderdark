# PRD: Trap Workshop Room

## Introduction
The Trap Workshop is a Tier 2 crafting room that creates traps for placement in hallways and rooms. It uses a 2x2 square footprint, supports 2 inhabitants (upgradeable to 4), and has a medium base fear level. Traps are a core defensive mechanic, and the Workshop's adjacency bonuses with Forge, Alchemy Lab, and Summoning Circle encourage placement near other crafting and magical rooms.

## Goals
- Implement a fully functional Trap Workshop room with 2x2 square layout
- Enable trap creation for hallways and rooms
- Support 2 inhabitants with upgradeable capacity to 4
- Implement medium fear level
- Define trap types and crafting mechanics
- Define and implement adjacency bonuses for Workshop+Forge, Workshop+Alchemy Lab, Workshop+Summoning Circle

## User Stories

### US-001: Trap Workshop Room Definition
**Description:** As a developer, I want the Trap Workshop defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A `trap-workshop.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (2x2), maxInhabitants, baseFearLevel, trapRecipes, upgradePaths, adjacencyBonuses
- [ ] The shape is a 2x2 square (4 tile offsets)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: 2x2 Square Room Placement
**Description:** As a dungeon builder, I want to place the Trap Workshop as a 2x2 square room on the grid.

**Acceptance Criteria:**
- [ ] The Trap Workshop occupies a 2x2 square of tiles (4 tiles total)
- [ ] Placement validates that all 4 tiles are unoccupied
- [ ] The room renders correctly on the grid with the Workshop sprite
- [ ] No rotation needed for a symmetric 2x2 shape
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Basic Trap Creation
**Description:** As a dungeon builder, I want to craft basic traps so that I can defend my dungeon hallways and rooms.

**Acceptance Criteria:**
- [ ] At least 3 basic trap types are available (e.g., Spike Trap, Pit Trap, Alarm Trap)
- [ ] Each trap has a defined resource cost (Crystals, Gold, etc.)
- [ ] Crafting requires at least 1 inhabitant assigned to the Workshop
- [ ] Crafted traps are added to a trap inventory for later placement
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Trap Placement in Hallways
**Description:** As a dungeon builder, I want to place crafted traps in hallways to damage or slow invaders.

**Acceptance Criteria:**
- [ ] Traps can be placed on hallway tiles via the placement UI
- [ ] Each hallway tile can hold at most 1 trap
- [ ] Placed traps are visible on the grid with a trap icon
- [ ] Traps trigger when an invader enters the tile
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Trap Placement in Rooms
**Description:** As a dungeon builder, I want to place crafted traps in room tiles to surprise invaders who breach rooms.

**Acceptance Criteria:**
- [ ] Traps can be placed on room tiles (limited slots per room)
- [ ] Room traps do not harm assigned inhabitants
- [ ] Placed traps are visible on the grid within the room
- [ ] Room size determines maximum trap slots (e.g., 1 per 4 tiles)
- [ ] Typecheck/lint passes

### US-006: Trap Crafting Queue
**Description:** As a dungeon builder, I want to queue multiple trap crafting jobs and see progress.

**Acceptance Criteria:**
- [ ] Multiple trap crafting jobs can be queued
- [ ] Each job shows a progress bar or percentage
- [ ] Completed traps are automatically added to the trap inventory
- [ ] More inhabitants reduce crafting time per trap
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Trap Workshop to hold up to 2 inhabitants (4 when upgraded).

**Acceptance Criteria:**
- [ ] Base capacity is 2 inhabitants
- [ ] Attempting to assign a 3rd inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 4
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes

### US-008: Medium Fear Level
**Description:** As a developer, I want the Trap Workshop to have a medium base fear level reflecting the dangerous devices within.

**Acceptance Criteria:**
- [ ] The Workshop's base fear level is set to Medium (2)
- [ ] Fear level is included in the room's gamedata definition
- [ ] Fear level integrates with the fear tracking system when available
- [ ] Typecheck/lint passes

### US-009: Upgrade Path - Master Trapper
**Description:** As a dungeon builder, I want an upgrade that increases capacity and unlocks advanced trap types.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 2 to 4
- [ ] Upgrade unlocks 2+ advanced trap types (e.g., Poison Gas Trap, Teleport Trap)
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-010: Upgrade Path - Efficient Assembly
**Description:** As a dungeon builder, I want an efficiency upgrade that reduces trap crafting costs and time.

**Acceptance Criteria:**
- [ ] Upgrade reduces all trap crafting costs by 25%
- [ ] Upgrade reduces crafting time by 30%
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-011: Upgrade Path - Enchanted Traps
**Description:** As a dungeon builder, I want a magical upgrade that adds elemental effects to crafted traps.

**Acceptance Criteria:**
- [ ] Upgrade adds bonus elemental damage to all crafted traps (fire, ice, or shadow)
- [ ] Elemental type may be selectable per trap or fixed per recipe
- [ ] Enchanted traps have additional visual effects when triggered
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-012: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Trap Workshop to receive adjacency bonuses from specific room types.

**Acceptance Criteria:**
- [ ] Workshop + Forge adjacency: +20% trap durability (traps last more uses)
- [ ] Workshop + Alchemy Lab adjacency: traps gain poison effect
- [ ] Workshop + Summoning Circle adjacency: unlocks magical trap variants
- [ ] Bonuses are defined in gamedata and activate via the adjacency bonus system
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Trap Workshop must be defined in YAML gamedata with all required fields.
- FR-2: The room must use a 2x2 square tile layout.
- FR-3: Trap crafting must consume resources and produce placeable trap items.
- FR-4: Traps must be placeable on both hallway and room tiles.
- FR-5: Inhabitant capacity must be 2 (base) upgradeable to 4.
- FR-6: Three mutually exclusive upgrade paths must be implemented.
- FR-7: Adjacency bonuses for Workshop+Forge, Workshop+Alchemy Lab, Workshop+Summoning Circle must be defined.

## Non-Goals (Out of Scope)
- Invader AI and trap trigger mechanics (handled by invasion system)
- Trap damage calculations (handled by combat system)
- Room placement UI generics (handled by earlier issues)
- Trap visual art assets (handled separately)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and resource system (Issue #7).
- Trap definitions should be separate YAML entries (or a traps.yaml file) referenced by the Workshop.
- Placed traps need their own data structure in game state (tile position, trap type, remaining uses).
- Trap inventory should be a global inventory, not per-room.
- Trap placement validation must check tile occupancy and room/hallway type.

## Success Metrics
- Trap Workshop can craft all defined trap types with correct costs
- Traps can be placed in hallways and rooms via the UI
- Placed traps are visible and persist across save/load
- All 3 upgrade paths function correctly and are mutually exclusive
- Adjacency bonuses activate correctly

## Open Questions
- How many uses does each trap type have before it is consumed?
- Can traps be picked up and relocated after placement?
- What are the exact damage/effect values for each trap type?
- Should traps have a detection chance or always trigger on invader entry?
