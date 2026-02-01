# PRD: Efficiency Calculation

## Introduction
The efficiency calculation system reads inhabitant traits and computes how they modify room production. It integrates with the production calculation system to ensure that the right inhabitants in the right rooms yield optimal output. Efficiency updates in real-time as assignments change.

## Goals
- Read efficiency-related traits from assigned inhabitants
- Calculate per-room efficiency bonuses from all assigned inhabitants
- Stack multiple inhabitants' bonuses correctly
- Update efficiency in real-time when assignments change
- Provide efficiency data for UI display

## User Stories

### US-001: Read Inhabitant Efficiency Traits
**Description:** As a developer, I want to extract efficiency-relevant traits from inhabitants so that they can be applied to room production.

**Acceptance Criteria:**
- [ ] A function `getEfficiencyTraits(inhabitantInstance)` resolves the inhabitant's definition and returns efficiency-related traits
- [ ] Efficiency traits are identified by `effectType === 'production_bonus'` or similar discriminator
- [ ] Each trait specifies: target resource type (or "all"), bonus percentage
- [ ] Function handles inhabitants with no efficiency traits (returns empty array)
- [ ] Unit tests cover: inhabitant with one trait, multiple traits, no traits
- [ ] Typecheck/lint passes

### US-002: Calculate Room Efficiency Bonus
**Description:** As a developer, I want to calculate the total efficiency bonus for a room from all assigned inhabitants so that production reflects the workforce.

**Acceptance Criteria:**
- [ ] A function `calculateRoomEfficiency(roomId, gameState)` returns the efficiency multiplier for the room
- [ ] Function iterates all inhabitants assigned to the room and sums their efficiency bonuses
- [ ] Bonus stacking is additive: two +20% bonuses = +40% total (multiplier of 1.4)
- [ ] Room with no assigned inhabitants returns multiplier of 1.0 (or 0.0 if room requires workers)
- [ ] Unit tests cover: empty room, one worker, multiple workers, workers with different trait types
- [ ] Typecheck/lint passes

### US-003: Trait-Room Matching
**Description:** As a developer, I want efficiency traits to match specific room types so that placing the right inhabitant in the right room matters.

**Acceptance Criteria:**
- [ ] Traits with a specific `targetResourceType` only apply when the room produces that resource
- [ ] Traits with `targetResourceType: 'all'` apply to any room
- [ ] A Goblin with "Miner" (+20% crystals) gets the bonus in a Crystal Mine but not in a Farm
- [ ] Mismatched traits still count as 0% bonus (inhabitant is present but no efficiency bonus from that trait)
- [ ] Unit tests cover: matching trait, non-matching trait, "all" trait, mixed traits
- [ ] Typecheck/lint passes

### US-004: Real-Time Efficiency Updates
**Description:** As a developer, I want efficiency to recalculate immediately when assignments change so that production rates are always accurate.

**Acceptance Criteria:**
- [ ] Efficiency is exposed as a computed signal per room: `roomEfficiency(roomId): Signal<number>`
- [ ] Signal recomputes when inhabitants are assigned or unassigned from the room
- [ ] Signal recomputes when an inhabitant's state changes (scared/hungry affecting efficiency)
- [ ] Production system (Issue #9) consumes this signal in its calculation
- [ ] Typecheck/lint passes

### US-005: Efficiency Display in Room Detail
**Description:** As a player, I want to see the efficiency bonus for a room so that I understand how my inhabitants affect production.

**Acceptance Criteria:**
- [ ] The room detail panel (from Issue #13) shows the current efficiency multiplier (e.g., "Efficiency: 140%")
- [ ] A breakdown shows each assigned inhabitant's contribution (e.g., "Goblin: +20% (Miner)")
- [ ] Base efficiency (100%) is shown separately from inhabitant bonuses
- [ ] If efficiency is below 100% due to conditional states, the penalty is shown in red
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Aggregate Efficiency Statistics
**Description:** As a developer, I want aggregate efficiency stats available so that the UI can show overall dungeon performance.

**Acceptance Criteria:**
- [ ] A computed signal `averageDungeonEfficiency()` returns the average efficiency across all production rooms
- [ ] A computed signal `totalEfficiencyBonusForResource(resourceType)` returns the sum of all efficiency bonuses for a specific resource
- [ ] These signals are available for potential dashboard/stats display
- [ ] Unit tests verify correct aggregation across multiple rooms
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must read efficiency traits from all inhabitants assigned to a room
- FR-2: Efficiency bonuses must stack additively across multiple inhabitants
- FR-3: Traits must match room production type for the bonus to apply
- FR-4: Efficiency must update reactively when assignments or inhabitant states change
- FR-5: Efficiency data must be available as signals for both production calculation and UI display

## Non-Goals (Out of Scope)
- Efficiency upgrades via research or room improvements
- Diminishing returns for stacking too many bonuses
- Efficiency caps or limits
- Efficiency decay over time
- Synergy bonuses between specific inhabitant type combinations

## Technical Considerations
- Efficiency helpers should be in `src/app/helpers/efficiency.ts`
- The efficiency calculation is a pure function of game state, making it easy to test
- Computed signals should depend on the relevant slices of game state (inhabitants, assignments, room types) to minimize recomputation
- Integrates with the production calculation system (Issue #9) as the "Bonuses" term in: `Final = Base * (1 + Bonuses) * Modifiers`
- Depends on inhabitant data model (Issue #11) for traits and states, production system (Issue #9) for integration, and assignment system (Issue #13) for assignment data
- Conditional state modifiers (scared, hungry) are handled by the production system's conditional modifier calculation, not here. Efficiency focuses on trait-based bonuses.

## Success Metrics
- Efficiency calculation for a room with 5 inhabitants completes in under 0.1ms
- Trait matching correctly differentiates targeted vs. universal bonuses
- UI efficiency display matches the actual production modifier applied

## Open Questions
- Should efficiency bonuses be capped at some maximum (e.g., +200%)?
- Can future room upgrades add inherent efficiency bonuses (not from inhabitants)?
- Should there be negative efficiency traits (penalties for wrong room type)?
- How do "Adaptable" traits (like Slime's) interact with room matching?
