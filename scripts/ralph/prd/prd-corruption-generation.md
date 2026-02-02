# PRD: Corruption Generation

## Introduction
Define the specific sources and rates of Corruption generation. Dark rooms (Soul Well, Torture Chamber) and dark creatures (Skeletons, Demon Lords) generate Corruption automatically over time. Generation rates are fixed per source and accumulate into the global Corruption pool.

## Goals
- Define Corruption generation rates per source
- Automatically generate Corruption over time from active sources
- Integrate with the production tick system
- Allow generation rates to be modified by other systems (biome, time-of-day)

## User Stories

### US-001: Room-Based Corruption Generation
**Description:** As a developer, I want dark rooms to generate Corruption automatically so that building them has consequences.

**Acceptance Criteria:**
- [ ] Soul Well generates +2 Corruption per game minute
- [ ] Torture Chamber generates +3 Corruption per game minute
- [ ] Generation only occurs when the room is operational (built, not destroyed)
- [ ] Generation rate is defined in room data (YAML or config)
- [ ] Typecheck/lint passes

### US-002: Inhabitant-Based Corruption Generation
**Description:** As a developer, I want dark creatures to generate Corruption when stationed so that creature choices matter.

**Acceptance Criteria:**
- [ ] Skeleton generates +1 Corruption per game minute when stationed in a room
- [ ] Demon Lord generates +10 Corruption per game minute when stationed
- [ ] Unstationed inhabitants do not generate Corruption
- [ ] Generation rate is defined in inhabitant data
- [ ] Typecheck/lint passes

### US-003: Corruption Accumulation in Production Tick
**Description:** As a developer, I want Corruption to accumulate during the normal production tick so that it grows alongside other resources.

**Acceptance Criteria:**
- [ ] Calculate total Corruption generation per tick from all active sources
- [ ] Add generated Corruption to the global Corruption pool each tick
- [ ] Generation respects time-of-day modifiers (Night: +50% Corruption generation)
- [ ] Generation respects biome modifiers (Corrupted biome: +100% dark room Corruption)
- [ ] Typecheck/lint passes

### US-004: Corruption Source Summary
**Description:** As a player, I want to see what is generating Corruption so that I can manage it.

**Acceptance Criteria:**
- [ ] Show Corruption generation rate (per minute) in the resource panel
- [ ] Tooltip or detail view breaks down generation by source (rooms, inhabitants)
- [ ] Show modifier effects on generation rate
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Corruption Generation Tests
**Description:** As a developer, I want tests for Corruption generation calculations so that rates are verified.

**Acceptance Criteria:**
- [ ] Test: Soul Well generates 2 Corruption per minute
- [ ] Test: Torture Chamber generates 3 Corruption per minute
- [ ] Test: Stationed Skeleton adds 1 Corruption per minute
- [ ] Test: Night modifier increases generation by 50%
- [ ] Tests in `src/app/helpers/corruption.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Soul Well must generate +2 Corruption/min.
- FR-2: Torture Chamber must generate +3 Corruption/min.
- FR-3: Skeleton must generate +1 Corruption/min when stationed.
- FR-4: Demon Lord must generate +10 Corruption/min when stationed.
- FR-5: Generation must respect time-of-day and biome modifiers.
- FR-6: Total generation rate must be displayed in the UI.

## Non-Goals (Out of Scope)
- Corruption effects (covered by #56)
- Corruption reduction/purification
- Non-dark room Corruption generation
- Corruption generation from events

## Technical Considerations
- Depends on Resource Production (#9) and Corruption Resource (#54)
- Generation rates should be data-driven (YAML or configuration)
- Integrate with the existing production calculation pipeline
- Consider a `CorruptionSource` interface for extensibility

## Success Metrics
- Corruption accumulates at correct rates from all sources
- Modifiers correctly affect generation rates
- UI accurately shows generation breakdown
- Unit tests verify all source rates

## Open Questions
- Should Corruption generation be pausable independently?
- Can rooms be "cleansed" to stop their Corruption generation?
- Should generation rates scale with room level/upgrades?
