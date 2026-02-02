# PRD: Morale System

## Introduction
Implement a morale system for invading parties that creates a path to non-lethal victory. Invaders start with 100 morale and gain or lose morale based on battlefield events. When morale hits 0, the invading party retreats. This gives players an alternative defensive strategy focused on fear, traps, and attrition rather than raw combat power.

## Goals
- Track morale as a shared party-level resource (0-100)
- Define morale modifiers for key battlefield events
- Implement retreat behavior when morale reaches 0
- Display morale as a visible bar during invasions
- Integrate with fear, trap, and combat systems

## User Stories

### US-001: Morale State Tracking
**Description:** As a developer, I want morale tracked as a party-level signal so that it reacts to events in real time.

**Acceptance Criteria:**
- [ ] Create a `partyMorale` signal (WritableSignal<number>) initialized to 100 at invasion start
- [ ] Morale is clamped between 0 and 100
- [ ] Morale value is accessible to combat, trap, and fear systems
- [ ] Morale resets to 100 at the start of each new invasion
- [ ] Typecheck/lint passes

### US-002: Morale Loss on Ally Death
**Description:** As a developer, I want invader morale to drop when an ally is killed so that attrition erodes their resolve.

**Acceptance Criteria:**
- [ ] When an invader is killed in combat, party morale decreases by 10
- [ ] If the killed invader was a Cleric or Paladin (morale anchor), penalty increases to 15
- [ ] Morale loss is applied immediately after the death event
- [ ] Unit test verifies -10 morale on standard ally death
- [ ] Unit test verifies -15 morale on Cleric/Paladin death
- [ ] Typecheck/lint passes

### US-003: Morale Loss on Trap Trigger
**Description:** As a developer, I want traps to reduce invader morale so that trap-heavy dungeons can break invader will.

**Acceptance Criteria:**
- [ ] When a trap is triggered, party morale decreases by 5
- [ ] Fear Glyph traps apply an additional -5 morale penalty (total -10)
- [ ] Morale loss occurs regardless of whether the trap dealt damage
- [ ] Unit test verifies -5 morale on standard trap trigger
- [ ] Unit test verifies -10 morale on Fear Glyph trigger
- [ ] Typecheck/lint passes

### US-004: Morale Loss in High Fear Rooms
**Description:** As a developer, I want high-fear rooms to drain invader morale so that dungeon atmosphere matters.

**Acceptance Criteria:**
- [ ] When an invader party enters a room with fear level >= 3, morale decreases by 15
- [ ] Fear-based morale loss occurs once per room entry (not per turn spent in room)
- [ ] Paladin's Aura of Courage negates fear-based morale loss for the party
- [ ] Unit test verifies -15 morale on high-fear room entry
- [ ] Unit test verifies Paladin aura negation
- [ ] Typecheck/lint passes

### US-005: Morale Gain on Room Capture
**Description:** As a developer, I want invaders to gain morale when they capture a room so that successful progress bolsters them.

**Acceptance Criteria:**
- [ ] When invaders clear all defenders from a room, party morale increases by 10
- [ ] Morale cannot exceed 100
- [ ] Capturing a room with high value (Vault, Library) grants +15 instead
- [ ] Unit test verifies +10 morale on standard room capture
- [ ] Unit test verifies morale cap at 100
- [ ] Typecheck/lint passes

### US-006: Retreat Behavior at Zero Morale
**Description:** As a developer, I want invaders to retreat when morale reaches 0 so that fear-based defense is viable.

**Acceptance Criteria:**
- [ ] When party morale signal reaches 0, all invaders enter "retreating" state
- [ ] Retreating invaders move back toward the dungeon entrance
- [ ] Retreating invaders do not attack defenders (they flee)
- [ ] Retreating invaders can still be attacked by defenders
- [ ] The invasion ends when all retreating invaders exit or are killed
- [ ] Retreat counts as a successful defense for reward purposes
- [ ] Typecheck/lint passes

### US-007: Morale Bar UI Component
**Description:** As a player, I want to see the invader party's morale as a bar during invasions so that I can gauge their resolve.

**Acceptance Criteria:**
- [ ] A morale bar component is displayed during invasion mode
- [ ] Bar shows current morale as a proportion of 100
- [ ] Color coding: green (>60), yellow (30-60), red (<30)
- [ ] Bar animates smoothly when morale changes
- [ ] Morale change events show floating text (e.g., "-10 Ally Fallen")
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-008: Morale Event Log
**Description:** As a player, I want to see what caused morale changes so that I understand the system.

**Acceptance Criteria:**
- [ ] Each morale change is logged with a reason and value
- [ ] Log entries include: timestamp (turn number), event type, morale delta, new morale value
- [ ] Log is accessible via a tooltip or expandable panel on the morale bar
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-009: Morale System Unit Tests
**Description:** As a developer, I want comprehensive tests for the morale system.

**Acceptance Criteria:**
- [ ] Test: Morale initializes to 100
- [ ] Test: Morale clamps to 0 (cannot go negative)
- [ ] Test: Morale clamps to 100 (cannot exceed max)
- [ ] Test: Ally death reduces morale by 10
- [ ] Test: Trap trigger reduces morale by 5
- [ ] Test: High fear room reduces morale by 15
- [ ] Test: Room capture increases morale by 10
- [ ] Test: Zero morale triggers retreat state
- [ ] Tests placed in `src/app/helpers/morale.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Morale must be tracked as a party-level value from 0 to 100.
- FR-2: Morale must decrease on ally death (-10), trap trigger (-5), and high-fear room entry (-15).
- FR-3: Morale must increase on room capture (+10).
- FR-4: When morale reaches 0, all invaders must enter retreat state.
- FR-5: A morale bar must be displayed during invasion mode.

## Non-Goals (Out of Scope)
- Individual invader morale (morale is party-wide)
- Morale effects on invader combat stats (morale only triggers retreat)
- Defender/inhabitant morale system
- Morale carry-over between invasions

## Technical Considerations
- Depends on Turn-Based Invasion Mode (Issue #41) for the invasion event system
- Depends on Fear System (Issue #33) for room fear levels
- Morale helper in `src/app/helpers/morale.ts`
- Morale types in `src/app/interfaces/morale.ts`
- Use Angular Signals for reactive morale tracking
- Morale bar component in `src/app/components/morale-bar/`
- Retreat pathfinding reuses existing invader pathfinding in reverse

## Success Metrics
- Morale changes are correctly applied for all event types
- Retreat triggers reliably at 0 morale
- Players can win invasions through morale attrition without killing all invaders
- Morale bar is intuitive and responsive

## Open Questions
- Should boss/elite invaders have morale resistance (slower morale loss)?
- Should there be a "rallying" mechanic where a Cleric can restore party morale?
- Does retreat speed differ from normal movement speed?
- Should partial retreats be possible (some invaders flee while others fight on)?
