# PRD: Connection Cost System

## Introduction
The connection cost system manages the resource cost of building hallways between rooms. Direct adjacency connections are free, while hallway connections cost 5 Crystals per tile. The system validates resource availability before construction, deducts costs on confirmation, and provides cost previews to the player.

## Goals
- Enforce a cost of 5 Crystals per hallway tile
- Deduct resources from the ResourceManager on build confirmation
- Prevent hallway construction when resources are insufficient
- Display cost previews before the player commits to building
- Ensure direct adjacency connections remain free

## User Stories

### US-001: Calculate Hallway Cost
**Description:** As a developer, I want a function that calculates the Crystal cost of a hallway path so that the UI can display costs and the build system can validate affordability.

**Acceptance Criteria:**
- [ ] A function `calculateHallwayCost(path: Tile[]): number` returns `path.length * 5`
- [ ] Returns 0 for an empty path
- [ ] Unit tests verify cost calculation for various path lengths
- [ ] Typecheck/lint passes

### US-002: Cost Preview Display
**Description:** As a dungeon builder, I want to see the hallway cost before I confirm building so that I can make informed resource decisions.

**Acceptance Criteria:**
- [ ] The hallway placement preview shows "Cost: X Crystals" where X = tiles * 5
- [ ] The cost updates dynamically if the path changes
- [ ] The player's current Crystal balance is shown alongside the cost
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Resource Validation on Build
**Description:** As the system, I want to validate that the player has enough Crystals before allowing hallway construction so that resources cannot go negative.

**Acceptance Criteria:**
- [ ] Before building, the system checks `currentCrystals >= hallwayCost`
- [ ] If insufficient, the build is rejected and an error notification is shown
- [ ] The Confirm button is disabled when resources are insufficient
- [ ] Typecheck/lint passes

### US-004: Resource Deduction on Confirm
**Description:** As the system, I want to deduct the hallway cost from the player's Crystal balance when they confirm the build so that resources are consumed correctly.

**Acceptance Criteria:**
- [ ] On confirmation, `currentCrystals -= hallwayCost` is applied via ResourceManager
- [ ] The deduction happens atomically with hallway creation (both succeed or both fail)
- [ ] The resource display updates immediately after deduction
- [ ] Typecheck/lint passes

### US-005: Direct Adjacency Free Connection
**Description:** As a dungeon builder, I want direct adjacency connections to be free so that I am not penalized for good room placement.

**Acceptance Criteria:**
- [ ] Creating a direct adjacency connection (Issue #17) does not deduct any resources
- [ ] The UI does not show a cost for adjacency connections
- [ ] No resource validation is performed for adjacency connections
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Hallway construction must cost exactly 5 Crystals per tile in the path.
- FR-2: The system must validate resource availability before allowing hallway construction.
- FR-3: Resources must be deducted from the ResourceManager on successful hallway build.
- FR-4: Cost previews must be shown to the player during the hallway placement workflow.
- FR-5: Direct adjacency connections must have zero cost.

## Non-Goals (Out of Scope)
- Variable cost per tile (terrain-based pricing)
- Hallway maintenance costs (ongoing resource drain)
- Refunds when demolishing hallways
- Discount mechanics or cost reduction upgrades

## Technical Considerations
- Depends on resource management (Issue #7) for Crystal balance tracking and deduction.
- Depends on the hallway placement tool (Issue #19) for integration with the build workflow.
- Cost calculation should be a pure helper function for easy testing.
- Resource deduction should use the existing ResourceManager service/signal pattern.
- Consider wrapping hallway creation + resource deduction in a transaction-like pattern to ensure atomicity.

## Success Metrics
- Cost preview always matches actual deduction
- Players cannot build hallways they cannot afford
- Direct adjacency connections never trigger cost logic
- Resource balance is always non-negative after any operation

## Open Questions
- Should there be a cost breakdown (e.g., "12 tiles x 5 = 60 Crystals") in the preview?
- Should hallway demolition refund any portion of the cost?
- Could future upgrades reduce the per-tile cost?
