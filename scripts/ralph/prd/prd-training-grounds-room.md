# PRD: Training Grounds Room

## Introduction
The Training Grounds is a Tier 2 combat preparation room that trains inhabitants for combat, granting +1 defense level to trained units. It uses a T-shaped footprint, supports up to 4 inhabitants (upgradeable to 6), and has a low base fear level. Adjacency bonuses with Barracks, Forge, and Altar rooms create a combat-focused cluster strategy.

## Goals
- Implement a fully functional Training Grounds room with T-shaped layout
- Enable combat training that grants +1 defense level to trained inhabitants
- Support 4 inhabitants with upgradeable capacity to 6
- Implement low fear level
- Define and implement adjacency bonuses for Training Grounds+Barracks, Training Grounds+Forge, Training Grounds+Altar

## User Stories

### US-001: Training Grounds Room Definition
**Description:** As a developer, I want the Training Grounds defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A `training-grounds.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (T-shaped), trainingEffect, maxInhabitants, baseFearLevel, upgradePaths, adjacencyBonuses
- [ ] The shape is T-shaped (defined as a list of tile offsets)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: T-Shaped Room Placement
**Description:** As a dungeon builder, I want to place the Training Grounds as a T-shaped room on the grid.

**Acceptance Criteria:**
- [ ] The Training Grounds occupies a T-shaped set of tiles
- [ ] The room can be rotated (4 orientations) during placement
- [ ] Placement validates that all T-shaped tiles are unoccupied
- [ ] The room renders correctly on the grid in all orientations
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Combat Training Effect
**Description:** As a dungeon builder, I want inhabitants assigned to the Training Grounds to gain +1 defense level so that they are better prepared for combat.

**Acceptance Criteria:**
- [ ] Inhabitants assigned to the Training Grounds gain +1 defense level after a training period
- [ ] The training period has a defined duration (e.g., 5 minutes)
- [ ] Training progress is visible per inhabitant (progress bar or percentage)
- [ ] The defense bonus persists when the inhabitant is reassigned to another room
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Training Completion
**Description:** As a dungeon builder, I want to be notified when an inhabitant completes training so that I can reassign them.

**Acceptance Criteria:**
- [ ] A notification or visual indicator appears when training completes
- [ ] Trained inhabitants show a "trained" badge or status marker
- [ ] The inhabitant can be immediately reassigned after training
- [ ] Training is a one-time effect per inhabitant (cannot stack the same training)
- [ ] Typecheck/lint passes

### US-005: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Training Grounds to hold up to 4 inhabitants (6 when upgraded).

**Acceptance Criteria:**
- [ ] Base capacity is 4 inhabitants
- [ ] Attempting to assign a 5th inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 6
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Low Fear Level
**Description:** As a developer, I want the Training Grounds to have a low base fear level reflecting routine military drills.

**Acceptance Criteria:**
- [ ] The Training Grounds' base fear level is set to Low (1)
- [ ] Fear level is included in the room's gamedata definition
- [ ] Fear level integrates with the fear tracking system when available
- [ ] Typecheck/lint passes

### US-007: Upgrade Path - Elite Training
**Description:** As a dungeon builder, I want an elite training upgrade that grants additional combat bonuses.

**Acceptance Criteria:**
- [ ] Upgrade grants +1 attack level in addition to +1 defense level
- [ ] Training time may increase slightly for the enhanced training
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-008: Upgrade Path - Mass Training
**Description:** As a dungeon builder, I want a mass training upgrade that increases capacity and reduces training time.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 4 to 6
- [ ] Upgrade reduces training time by 30%
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-009: Upgrade Path - Specialized Drills
**Description:** As a dungeon builder, I want a specialization upgrade that grants trait-specific bonuses during training.

**Acceptance Criteria:**
- [ ] Upgrade grants a random bonus trait to trained inhabitants (e.g., "Quick Reflexes", "Ironhide")
- [ ] Bonus trait is selected from a defined pool
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-010: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Training Grounds to receive adjacency bonuses from specific room types.

**Acceptance Criteria:**
- [ ] Training Grounds + Barracks adjacency: -20% training time
- [ ] Training Grounds + Forge adjacency: trained inhabitants gain +1 equipment slot
- [ ] Training Grounds + Altar adjacency: +1 bonus to all trained stats
- [ ] Bonuses are defined in gamedata and activate via the adjacency bonus system
- [ ] Typecheck/lint passes

### US-011: Training Queue Management
**Description:** As a dungeon builder, I want to see which inhabitants are currently training and their progress.

**Acceptance Criteria:**
- [ ] The room UI shows a list of assigned inhabitants with training progress
- [ ] Already-trained inhabitants are marked differently from those in training
- [ ] Inhabitants can be removed mid-training (progress is lost)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The Training Grounds must be defined in YAML gamedata with all required fields.
- FR-2: The room must use a T-shaped tile layout with rotation support.
- FR-3: Assigned inhabitants must gain +1 defense level after completing training.
- FR-4: Inhabitant capacity must be 4 (base) upgradeable to 6.
- FR-5: Three mutually exclusive upgrade paths must be implemented.
- FR-6: Adjacency bonuses for Training Grounds+Barracks, Training Grounds+Forge, Training Grounds+Altar must be defined.
- FR-7: Training progress must be tracked per inhabitant and persist across save/load.

## Non-Goals (Out of Scope)
- Combat resolution system (handled by separate issues)
- Inhabitant stat UI details (handled by inhabitant system)
- Room placement UI generics (handled by earlier issues)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and inhabitant data model (Issue #11).
- Training state (per-inhabitant progress timers) should be stored on the room instance in game state.
- The +1 defense bonus should modify the inhabitant's stats via a persistent modifier, not a temporary buff.
- Training completion should fire an event that other systems can listen to.
- T-shaped tile offsets require 4 rotation variants.

## Success Metrics
- Inhabitants gain +1 defense after completing training
- Training progress is visible and accurate
- All 3 upgrade paths function correctly and are mutually exclusive
- Adjacency bonuses activate correctly with qualifying adjacent rooms
- Training state persists across save/load

## Open Questions
- What is the exact training duration?
- Can an inhabitant be trained multiple times (e.g., once per Training Grounds)?
- Does training require resource consumption (Food for the trainees)?
- How does the "Specialized Drills" trait pool get defined?
