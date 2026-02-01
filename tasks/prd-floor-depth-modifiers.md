# PRD: Floor Depth Modifiers

## Introduction
Each floor's depth affects resource production through automatic modifiers. Shallow floors favor food production, while deeper floors excel at crystal and gold generation but suffer food penalties and increased corruption. This creates strategic decisions about what to build on each floor.

## Goals
- Apply automatic production modifiers based on floor depth
- Shallow floors: bonus to food, reduced corruption
- Mid-depth floors: bonus to crystal/gold, moderate corruption
- Deep floors: large bonus to rare resources, significant food penalty
- Display active depth modifiers per floor

## User Stories

### US-001: Depth Modifier Definitions
**Description:** As a developer, I want depth modifiers defined as data so that they can be easily tuned and referenced.

**Acceptance Criteria:**
- [ ] Define modifier tiers in a configuration structure (not hardcoded in logic)
- [ ] Floor 1: +20% Food, -10% Corruption
- [ ] Floors 2-3: No modifiers (baseline)
- [ ] Floors 4-6: +10% Crystal/Gold per floor depth, +5% Corruption per floor, -15% Food
- [ ] Floors 7-9: +20% Crystal/Gold per floor depth, +10% Corruption per floor, -30% Food
- [ ] Floor 10: +50% rare resources, -50% Food
- [ ] Typecheck/lint passes

### US-002: Modifier Application
**Description:** As a developer, I want depth modifiers to automatically apply to production calculations so that floor depth matters.

**Acceptance Criteria:**
- [ ] Depth modifiers integrate with the resource production system
- [ ] Modifiers are tagged with source `'floor-depth'` for identification
- [ ] Modifiers apply to all rooms on the respective floor
- [ ] Modifiers stack with other sources (time-of-day, biome, adjacency)
- [ ] Modifiers recalculate if a floor's depth changes (edge case)
- [ ] Typecheck/lint passes

### US-003: Depth Modifier Computation
**Description:** As a developer, I want depth modifiers computed as signals so that they update reactively.

**Acceptance Criteria:**
- [ ] Create `getFloorModifiers(depth: number): ResourceModifier[]` helper function
- [ ] Modifiers are computed signals derived from floor depth
- [ ] Each modifier specifies resource type and percentage change
- [ ] Helper is pure and testable
- [ ] Typecheck/lint passes

### US-004: Depth Modifier Display
**Description:** As a player, I want to see the depth modifiers for each floor so that I can plan what to build where.

**Acceptance Criteria:**
- [ ] Show depth modifiers in the floor info panel
- [ ] Each modifier shows resource type and percentage (e.g., "+20% Food", "-10% Corruption")
- [ ] Positive modifiers shown in green, negative in red
- [ ] Modifiers visible when hovering/selecting a floor in the floor selector
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Depth Modifier Unit Tests
**Description:** As a developer, I want tests for depth modifier calculations so that the math is verified.

**Acceptance Criteria:**
- [ ] Test: Floor 1 returns +20% Food, -10% Corruption
- [ ] Test: Floors 2-3 return no modifiers
- [ ] Test: Floor 5 returns +10% Crystal, +10% Gold, +5% Corruption, -15% Food (scaled by depth)
- [ ] Test: Floor 10 returns +50% rare resources, -50% Food
- [ ] Tests in `src/app/helpers/floor-modifiers.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Each floor must have production modifiers determined by its depth.
- FR-2: Modifiers must follow the defined tier structure (floors 1, 2-3, 4-6, 7-9, 10).
- FR-3: Modifiers must integrate with the resource production pipeline.
- FR-4: Modifiers must be visible in the UI per floor.

## Non-Goals (Out of Scope)
- Player-configurable depth modifiers
- Depth modifier research/upgrades
- Biome interactions with depth (covered separately)
- Floor reordering or depth swapping

## Technical Considerations
- Depends on Resource Production (#9) and Floor Creation System (#46)
- Modifier configuration could be a YAML file in `gamedata/` or a TypeScript constant
- Use the same modifier stacking approach as time-of-day modifiers
- Floor depth modifier types in `src/app/interfaces/`

## Success Metrics
- Production rates on each floor match expected modifier values
- Modifiers display correctly in the UI
- Unit tests cover all depth tiers
- Modifiers stack correctly with other modifier sources

## Open Questions
- Should "per floor depth" mean cumulative or just the tier bonus?
- Should floor 10 have unique resource types not available on other floors?
- Can research or upgrades modify depth bonuses?
