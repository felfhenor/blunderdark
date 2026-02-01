# PRD: Corruption Effects

## Introduction
High Corruption levels trigger escalating effects on the dungeon. At 50 Corruption, dark upgrades unlock. At 100, random mutations affect inhabitants. At 200, a powerful Crusade invasion event triggers. Visual corruption effects provide atmospheric feedback as levels rise.

## Goals
- Unlock dark upgrades at 50 Corruption
- Trigger random mutations at 100 Corruption
- Trigger Crusade invasion at 200 Corruption
- Apply visual corruption effects to the dungeon
- Communicate effects clearly to the player

## User Stories

### US-001: Dark Upgrade Unlock (50 Corruption)
**Description:** As a player, I want dark upgrades to unlock at 50 Corruption so that embracing Corruption has rewards.

**Acceptance Criteria:**
- [ ] When Corruption reaches 50, unlock a set of dark upgrade options
- [ ] Dark upgrades are visible but locked below 50 Corruption
- [ ] Upgrades remain unlocked even if Corruption drops below 50
- [ ] Show notification when dark upgrades become available
- [ ] Typecheck/lint passes

### US-002: Random Mutations (100 Corruption)
**Description:** As a player, I want inhabitants to gain random mutations at 100 Corruption so that high Corruption has unpredictable effects.

**Acceptance Criteria:**
- [ ] At 100 Corruption, trigger a mutation event on a random inhabitant
- [ ] Mutations can be positive (stat boost) or negative (stat reduction)
- [ ] Mutation is permanent on the affected inhabitant
- [ ] Show notification describing the mutation and affected inhabitant
- [ ] Mutation events can repeat (each time 100 threshold is re-crossed)
- [ ] Typecheck/lint passes

### US-003: Crusade Invasion Event (200 Corruption)
**Description:** As a developer, I want a Crusade invasion to trigger at 200 Corruption so that extreme Corruption has serious consequences.

**Acceptance Criteria:**
- [ ] When Corruption reaches 200, trigger a special "Crusade" invasion event
- [ ] Crusade is a powerful invasion (stronger than normal scheduled invasions)
- [ ] Use the special invasion trigger from the Invasion Trigger System
- [ ] Show prominent warning before the Crusade begins
- [ ] Crusade can only trigger once per threshold crossing (not every tick at 200)
- [ ] Typecheck/lint passes

### US-004: Visual Corruption Effects
**Description:** As a player, I want the dungeon to look increasingly corrupted as Corruption rises so that the atmosphere reflects the danger.

**Acceptance Criteria:**
- [ ] Low Corruption (0-49): No visual effects
- [ ] Medium (50-99): Subtle dark tinting on dungeon edges
- [ ] High (100-199): Noticeable purple/dark veins on tiles, particle effects
- [ ] Critical (200+): Heavy corruption overlay, pulsing effects
- [ ] Effects scale smoothly between thresholds
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Corruption Effect Notifications
**Description:** As a player, I want clear notifications when Corruption effects trigger so that I understand what is happening.

**Acceptance Criteria:**
- [ ] Notification at 50: "Dark powers awaken. Dark upgrades are now available."
- [ ] Notification at 100: "Corruption seeps into your minions. [Inhabitant] has mutated."
- [ ] Notification at 200: "The forces of light rally. A Crusade approaches!"
- [ ] Notifications are dismissible and logged in a message history
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: Dark upgrades must unlock at 50 Corruption.
- FR-2: Random mutations must trigger at 100 Corruption.
- FR-3: A Crusade invasion must trigger at 200 Corruption.
- FR-4: Visual effects must scale with Corruption level.
- FR-5: Notifications must inform the player of each effect.

## Non-Goals (Out of Scope)
- Specific dark upgrade definitions (future feature)
- Mutation catalog or balancing
- Crusade army composition
- Corruption reduction mechanics

## Technical Considerations
- Depends on Corruption Resource (#54) and Invasion Trigger System (#44)
- Use `effect()` or watch the corruption signal to trigger events at thresholds
- Track which thresholds have been crossed to prevent re-triggering
- Mutation types in `src/app/interfaces/`
- Visual effects via CSS classes toggled by corruption level

## Success Metrics
- Effects trigger at correct thresholds
- No duplicate triggers for the same threshold crossing
- Visual effects are visible and atmospheric
- Notifications are timely and informative

## Open Questions
- Should mutations be completely random or weighted by inhabitant type?
- Can the player choose to "embrace" or "resist" mutations?
- Should Crusade difficulty scale with total Corruption?
