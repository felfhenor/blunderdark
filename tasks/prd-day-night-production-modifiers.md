# PRD: Day/Night Production Modifiers

## Introduction
Apply automatic production modifiers based on the current time of day phase. During the day, food production increases while undead efficiency drops. At night, undead thrive and corruption generation surges. During twilight transitions, flux generation spikes. These modifiers create strategic depth around timing and resource planning.

## Goals
- Automatically apply production multipliers based on the current time phase
- Modify food, undead, corruption, and flux production rates
- Ensure modifiers stack correctly with other modifier sources
- Display active time-based modifiers in the UI

## User Stories

### US-001: Day Phase Modifiers
**Description:** As a player, I want daytime to boost food production and reduce undead efficiency so that the day/night cycle affects my resource strategy.

**Acceptance Criteria:**
- [ ] During day phase (hours 7-17): Food production receives +25% modifier
- [ ] During day phase: Undead inhabitant production receives -10% modifier
- [ ] Modifiers apply to all rooms/sources producing these resources
- [ ] Modifiers are removed when phase changes away from day
- [ ] Typecheck/lint passes

### US-002: Night Phase Modifiers
**Description:** As a player, I want nighttime to boost undead efficiency and corruption generation so that I can plan dark activities around the night cycle.

**Acceptance Criteria:**
- [ ] During night phase (hours 19-5): Undead inhabitant production receives +30% modifier
- [ ] During night phase: Corruption generation receives +50% modifier
- [ ] Modifiers apply automatically when night phase begins
- [ ] Modifiers are removed when phase changes away from night
- [ ] Typecheck/lint passes

### US-003: Twilight Phase Modifiers
**Description:** As a player, I want twilight periods to boost flux generation so that I have a window for magical resource gathering.

**Acceptance Criteria:**
- [ ] During dawn (hour 6) and dusk (hour 18): Flux generation receives +100% modifier
- [ ] Modifier applies to all flux-producing sources
- [ ] Modifier activates and deactivates precisely at phase boundaries
- [ ] Typecheck/lint passes

### US-004: Modifier Integration with Resource System
**Description:** As a developer, I want time-based modifiers to integrate cleanly with the existing resource/production system so that they stack with other modifiers.

**Acceptance Criteria:**
- [ ] Create a modifier registration mechanism in the resource system that accepts source-tagged multipliers
- [ ] Time-based modifiers are tagged with source `'time-of-day'` for identification
- [ ] Modifiers stack multiplicatively with other modifier sources (room adjacency, biome, etc.)
- [ ] When phase changes, old modifiers are removed and new ones applied atomically
- [ ] Typecheck/lint passes

### US-005: Active Modifier Display
**Description:** As a player, I want to see which time-based modifiers are currently active so that I understand how the cycle affects my production.

**Acceptance Criteria:**
- [ ] Show active time modifiers in a tooltip or panel near the resource display
- [ ] Each modifier shows the resource affected and the percentage change
- [ ] Modifiers update in real time as phases change
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The system must apply production modifiers automatically when the time phase changes.
- FR-2: Day phase must grant +25% Food and -10% Undead production.
- FR-3: Night phase must grant +30% Undead production and +50% Corruption generation.
- FR-4: Twilight phases must grant +100% Flux generation.
- FR-5: Modifiers must stack correctly with other modifier sources.
- FR-6: When no special phase is active (transition edge cases), no time modifiers apply.

## Non-Goals (Out of Scope)
- Biome-specific time modifiers
- Per-room time modifier overrides
- Seasonal modifier variations
- Player-configurable modifier values

## Technical Considerations
- Depends on Time of Day System (#38) for phase signals
- Depends on Resource Production (#9) for the modifier pipeline
- Use computed signals derived from `TimeService.currentPhase` to calculate active modifiers
- Modifier types should be defined in `src/app/interfaces/`
- Consider a generic `ModifierSource` type that can be reused by biomes, adjacency, etc.

## Success Metrics
- Production rates change correctly at each phase transition
- Modifiers are visible and accurately described in UI
- No resource calculation errors when multiple modifier sources are active
- Phase transitions do not cause frame drops or calculation delays

## Open Questions
- Should modifiers apply gradually during twilight or instantly?
- How do modifiers interact with paused production (e.g., empty rooms)?
- Should there be a log entry when time modifiers change?
