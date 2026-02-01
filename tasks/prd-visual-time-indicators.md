# PRD: Visual Time Indicators

## Introduction
Provide clear visual feedback for the current time of day through a clock UI, background/lighting changes, sun/moon icons, and a time speed indicator. These visual cues help players intuitively understand the current phase and plan their activities accordingly.

## Goals
- Display a clock UI showing the current game hour
- Change background/lighting to reflect day, night, and twilight phases
- Show a sun or moon icon based on the current phase
- Display the current time speed multiplier with controls to change it
- Ensure all visual changes are smooth and non-jarring

## User Stories

### US-001: Clock UI Component
**Description:** As a player, I want to see a clock displaying the current game hour so that I always know what time it is in the game.

**Acceptance Criteria:**
- [ ] Create `TimeClockComponent` displaying the current hour (0-23) in a readable format
- [ ] Show the hour as a circular or linear clock face
- [ ] Update in real time as the game clock advances
- [ ] Position in a consistent, non-obstructive location in the game UI
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Phase-Based Background Styling
**Description:** As a player, I want the game background to change based on the time of day so that I can visually distinguish day from night.

**Acceptance Criteria:**
- [ ] Day phase: Bright, warm-toned background or overlay
- [ ] Night phase: Dark, cool-toned background or overlay
- [ ] Dawn: Gradual transition from dark to bright (warm orange tint)
- [ ] Dusk: Gradual transition from bright to dark (purple/red tint)
- [ ] Transitions use CSS animations for smoothness (no abrupt changes)
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Sun/Moon Icon Display
**Description:** As a player, I want to see a sun or moon icon that reflects the current time of day so that I have an at-a-glance phase indicator.

**Acceptance Criteria:**
- [ ] Show sun icon during day phase
- [ ] Show moon icon during night phase
- [ ] Show transitional icon (half sun/moon) during dawn and dusk
- [ ] Icon positioned near the clock UI
- [ ] Icon changes smoothly (fade or morph transition)
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Time Speed Indicator and Controls
**Description:** As a player, I want to see the current time speed and have controls to change it so that I can control the pace of the game.

**Acceptance Criteria:**
- [ ] Display current speed multiplier (1x, 2x, 4x) near the clock
- [ ] Provide clickable buttons or toggle to cycle through speed options
- [ ] Active speed is visually highlighted
- [ ] Speed change takes effect immediately
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Accessibility Considerations
**Description:** As a player with visual impairments, I want time information conveyed through text as well as visual effects so that I can still understand the time of day.

**Acceptance Criteria:**
- [ ] Clock displays numeric hour alongside any visual clock face
- [ ] Phase name is displayed as text (not just color changes)
- [ ] Speed indicator uses text labels alongside icons
- [ ] All interactive elements have appropriate ARIA labels
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The clock UI must display the current game hour updated in real time.
- FR-2: Background styling must change smoothly based on the current time phase.
- FR-3: A sun or moon icon must reflect the current phase.
- FR-4: Time speed controls must allow the player to switch between 1x, 2x, and 4x.
- FR-5: All visual elements must update reactively using Angular Signals.

## Non-Goals (Out of Scope)
- Particle effects (stars, clouds, etc.)
- Dynamic shadows on game tiles
- Weather visual effects
- Audio changes based on time

## Technical Considerations
- Depends on Time of Day System (#38) for `currentHour`, `currentPhase`, and `timeSpeed` signals
- Use CSS custom properties (variables) for theme colors, toggled by phase
- Background transitions should use CSS transitions (not JavaScript animation loops)
- Consider using `@switch` for phase-based template rendering
- Sprite assets for sun/moon icons should be added to `gameassets/`

## Success Metrics
- Players can identify the current phase at a glance without reading text
- Phase transitions are smooth with no visual glitches
- Time speed controls respond instantly
- No performance impact from visual transitions

## Open Questions
- Should the clock be analog (circular) or digital (numeric) or both?
- What specific color palette for each phase?
- Should background changes apply to the entire viewport or just the game grid area?
