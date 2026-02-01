# PRD: Ley Line Nexus Room

## Introduction
The Ley Line Nexus is a T-shaped (3x4) magical room that generates Flux and amplifies magic in nearby rooms. It can only be placed on dungeon floors that have ley line convergence points, adding a strategic placement constraint. The Nexus serves as a core infrastructure room for magic-heavy dungeon builds.

## Goals
- Define the Ley Line Nexus as a T-shaped 3x4 room
- Generate 10 Flux per minute as a baseline production
- Amplify magic in nearby rooms (+30% to magic rooms within 3 spaces)
- Support 2 inhabitants (upgradeable to 3)
- Enforce ley line convergence placement restriction
- Apply medium fear level

## User Stories

### US-001: Ley Line Nexus YAML Definition
**Description:** As a developer, I want the Ley Line Nexus defined in YAML gamedata so that it loads through the content pipeline.

**Acceptance Criteria:**
- [ ] A `ley-line-nexus.yaml` file exists in the appropriate `gamedata/rooms/` directory
- [ ] Fields include: id, name, description, shape (T-shaped 3x4), fearLevel (medium), maxInhabitants (2), upgradeMaxInhabitants (3), sprite reference
- [ ] Production field defines: 10 Flux per minute
- [ ] Placement restriction: requiresLeyLine: true
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-002: T-Shaped Room Placement
**Description:** As a player, I want the Ley Line Nexus to occupy a T-shaped footprint so that it has a unique layout.

**Acceptance Criteria:**
- [ ] Room shape is T-shaped occupying 3x4 tiles (e.g., 3-wide top row, 1-wide stem extending 3 tiles down, totaling ~9 tiles)
- [ ] Room shape integrates with the existing tetromino/shape system
- [ ] Placement validation ensures no overlap with existing rooms
- [ ] Room shape is visually distinct on the dungeon grid
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Ley Line Convergence Check
**Description:** As a developer, I want placement restricted to ley line convergence points so that the Nexus cannot be placed arbitrarily.

**Acceptance Criteria:**
- [ ] Each dungeon floor has pre-generated ley line convergence points
- [ ] Ley line points are determined during world generation
- [ ] The Nexus can only be placed when its footprint overlaps a convergence point
- [ ] The placement UI highlights valid ley line positions
- [ ] Attempting to place on a non-ley-line tile is rejected with a message
- [ ] Unit test verifies placement rejection on invalid tiles
- [ ] Typecheck/lint passes

### US-004: Flux Production
**Description:** As a developer, I want the Ley Line Nexus to produce 10 Flux per minute so that it supports magic-based strategies.

**Acceptance Criteria:**
- [ ] The room produces 10 Flux per game-minute at base rate
- [ ] Production integrates with the existing resource manager
- [ ] Inhabitants increase production rate (e.g., +2 Flux per inhabitant)
- [ ] Production is paused if the room is damaged or has no inhabitants
- [ ] Unit test verifies base production rate
- [ ] Typecheck/lint passes

### US-005: Magic Amplification Aura
**Description:** As a developer, I want the Ley Line Nexus to boost nearby magic rooms so that strategic placement is rewarded.

**Acceptance Criteria:**
- [ ] All rooms within 3 grid spaces that have magic-type production receive +30% output
- [ ] Magic rooms include: Shadow Library, Soul Well, and other magic-tagged rooms
- [ ] The aura is recalculated when rooms are added, removed, or moved
- [ ] Aura effect is implemented as a `computed()` signal
- [ ] Multiple Nexus auras do not stack on the same room (max +30%)
- [ ] Unit test verifies +30% bonus on eligible rooms
- [ ] Unit test verifies non-stacking
- [ ] Typecheck/lint passes

### US-006: Inhabitant Capacity and Upgrade
**Description:** As a player, I want to upgrade the Nexus to hold 3 inhabitants so that it can be more productive.

**Acceptance Criteria:**
- [ ] Base max inhabitants: 2
- [ ] Level 2 upgrade increases max inhabitants to 3
- [ ] Upgrade has a defined resource cost
- [ ] Room upgrade integrates with the existing room upgrade system
- [ ] Typecheck/lint passes

### US-007: Medium Fear Level
**Description:** As a developer, I want the Ley Line Nexus to have a medium fear level for fear propagation purposes.

**Acceptance Criteria:**
- [ ] Fear level is set to medium (value 2) in the YAML definition
- [ ] Fear integrates with the fear propagation system
- [ ] Fear is applied to adjacent hallways and rooms
- [ ] Typecheck/lint passes

### US-008: Ley Line Nexus Unit Tests
**Description:** As a developer, I want unit tests verifying the Nexus mechanics.

**Acceptance Criteria:**
- [ ] Test: Nexus produces 10 Flux/min base
- [ ] Test: Magic amplification applies +30% to eligible rooms within 3 spaces
- [ ] Test: Amplification does not apply to non-magic rooms
- [ ] Test: Multiple Nexus auras do not stack
- [ ] Test: Placement rejected on non-ley-line tiles
- [ ] Test: Inhabitant capacity respects base and upgraded limits
- [ ] Tests placed in `src/app/helpers/rooms/ley-line-nexus.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Ley Line Nexus must be a T-shaped 3x4 room.
- FR-2: The room must generate 10 Flux per minute at base rate.
- FR-3: Magic rooms within 3 spaces must receive a +30% production bonus.
- FR-4: The room can only be placed on ley line convergence points.
- FR-5: The room supports 2 inhabitants, upgradeable to 3.

## Non-Goals (Out of Scope)
- Ley line visualization on the map (may be a separate feature)
- Ley line disruption mechanics
- Multiple Nexus linking or chaining
- Flux storage capacity in the Nexus itself

## Technical Considerations
- Depends on room shape system (Issue #3) for T-shaped placement
- Depends on room data structure (Issue #5) for room definition
- Depends on corruption system (Issue #54) for potential magic/corruption interactions
- Ley line convergence points must be generated during world generation and stored in floor state
- Aura range calculation should use Manhattan distance for simplicity
- Magic room tag should be a property on room definitions for aura eligibility
- Aura bonus should be applied as a production modifier, not a direct stat change

## Success Metrics
- Nexus loads and places correctly from gamedata
- Flux production is accurate and consistent
- Magic amplification bonus is correctly applied to nearby rooms
- Placement restriction is enforced reliably

## Open Questions
- How many ley line convergence points per floor?
- Are ley line points visible to the player before building the Nexus?
- Does the Nexus have any combat utility during invasions?
- Should the magic amplification range increase with room level?
