# PRD: Functional Features

## Introduction
Functional Features are utility-focused room attachments that provide practical bonuses to room operations. These include Storage Expansion, Efficiency Enchantment, Fear Ward, Corruption Seal, Training Station, and Resource Converter. Each offers a straightforward, impactful modification to a room's behavior without thematic complexity.

## Goals
- Implement six functional features with clear, quantifiable effects
- Define all features in YAML gamedata
- Integrate with the feature attachment system (Issue #97)
- Ensure effects are immediately visible in room stat displays
- Provide strategic trade-offs that encourage diverse feature choices

## User Stories

### US-001: Storage Expansion Feature
**Description:** As a player, I want to attach Storage Expansion so that a room can hold significantly more resources.

**Acceptance Criteria:**
- [ ] Storage Expansion is defined in gamedata with: cost, bonus (+100% resource storage capacity)
- [ ] The room's maximum resource storage doubles when this feature is attached
- [ ] The bonus applies to all resource types stored in the room
- [ ] Removing the feature reduces capacity; excess resources are capped (not lost instantly but no new storage)
- [ ] Room tooltip shows updated storage capacity
- [ ] Unit tests verify storage capacity doubling and removal behavior
- [ ] Typecheck/lint passes

### US-002: Efficiency Enchantment Feature
**Description:** As a player, I want to attach Efficiency Enchantment so that the room's base production increases.

**Acceptance Criteria:**
- [ ] Efficiency Enchantment is defined in gamedata with: cost, bonus (+20% base production)
- [ ] Room production output increases by 20% for all resource types the room produces
- [ ] The bonus is multiplicative with other production modifiers
- [ ] Room stats panel shows the modified production value with the enchantment contribution
- [ ] Unit tests verify 20% production increase and stacking behavior
- [ ] Typecheck/lint passes

### US-003: Fear Ward Feature
**Description:** As a player, I want to attach a Fear Ward so that the room's Fear level decreases, improving inhabitant morale.

**Acceptance Criteria:**
- [ ] Fear Ward is defined in gamedata with: cost, bonus (-2 Fear in room)
- [ ] The room's Fear value decreases by 2 when the Ward is attached
- [ ] Fear cannot go below 0 (clamp at minimum)
- [ ] The Fear reduction is visible in the room's stat display
- [ ] Unit tests verify Fear reduction and minimum clamp
- [ ] Typecheck/lint passes

### US-004: Corruption Seal Feature
**Description:** As a player, I want to attach a Corruption Seal so that the room stops generating Corruption.

**Acceptance Criteria:**
- [ ] Corruption Seal is defined in gamedata with: cost, bonus (prevent Corruption generation)
- [ ] The room produces 0 Corruption per tick when the Seal is attached, regardless of other modifiers
- [ ] Existing Corruption in the room is not removed (only new generation is prevented)
- [ ] The Seal is visually indicated on the room (e.g., a seal icon)
- [ ] Unit tests verify Corruption generation is zeroed
- [ ] Typecheck/lint passes

### US-005: Training Station Feature
**Description:** As a player, I want to attach a Training Station so that inhabitants assigned to the room gain experience over time.

**Acceptance Criteria:**
- [ ] Training Station is defined in gamedata with: cost, bonus (passive XP gain for inhabitants)
- [ ] Inhabitants assigned to the room gain XP each game tick (amount defined in gamedata)
- [ ] XP gain rate is shown in the feature tooltip
- [ ] XP gain applies to all inhabitants in the room, not just one
- [ ] Unit tests verify XP accumulation over time
- [ ] Typecheck/lint passes

### US-006: Resource Converter Feature
**Description:** As a player, I want to attach a Resource Converter so that I can toggle the room's output to a different resource type.

**Acceptance Criteria:**
- [ ] Resource Converter is defined in gamedata with: cost, bonus (toggle output type)
- [ ] When attached, a dropdown or toggle appears in the room panel to select the output resource
- [ ] Available output resources are defined per room type in gamedata
- [ ] Conversion applies a 75% efficiency rate (lose 25% of base production in conversion)
- [ ] Switching output type takes effect immediately
- [ ] Unit tests verify conversion rate and output switching
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Functional Features Gamedata
**Description:** As a developer, I want all functional features defined in YAML so that they integrate with the content pipeline.

**Acceptance Criteria:**
- [ ] All six functional features are defined in `gamedata/feature/` YAML files
- [ ] Each definition includes: id, name, description, category (`functional`), cost, bonuses
- [ ] The build pipeline compiles and validates all definitions
- [ ] `ContentService` serves functional features queryable by category
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Storage Expansion must double the room's resource storage capacity
- FR-2: Efficiency Enchantment must increase base production by 20%
- FR-3: Fear Ward must reduce room Fear by 2, with a minimum of 0
- FR-4: Corruption Seal must prevent all Corruption generation in the room
- FR-5: Training Station must grant XP to all inhabitants in the room over time
- FR-6: Resource Converter must allow toggling output type at 75% efficiency

## Non-Goals (Out of Scope)
- Feature upgrading (e.g., Fear Ward II with -4 Fear)
- Feature prerequisites beyond having an empty slot
- Animated visual effects for functional features
- Cross-room functional feature interactions

## Technical Considerations
- Depends on Issue #97 (Feature Attachment System) for slot and attachment mechanics
- Production modifiers (Efficiency Enchantment) must integrate with the room's production calculation pipeline
- Corruption Seal needs to override/zero Corruption in the production formula, not just subtract
- Resource Converter introduces dynamic output type, which affects downstream resource routing
- Training Station XP rate should scale with game tick rate from `gameloop.ts`

## Success Metrics
- All six functional features apply their bonuses correctly when attached
- All bonuses are reverted correctly when features are removed
- Resource Converter toggle updates output type without bugs
- Unit tests pass for all feature mechanics

## Open Questions
- Should Storage Expansion have diminishing returns if multiple are attached to the same room?
- Does the Resource Converter preserve the room's original output alongside the converted output, or replace it?
- Should Training Station XP gain have diminishing returns for high-level inhabitants?
