# PRD: Hybrid Stat Generation

## Introduction
The Hybrid Stat Generation system determines how a hybrid creature's stats and traits are calculated from its two parent inhabitants. Stats use defined formulas (HP is averaged, traits are the union of both parents' traits), and some hybrids receive unique bonus traits. Hybrids display both parent icons in the UI for visual identification. This system translates fusion recipes into fully realized hybrid inhabitants.

## Goals
- Define stat inheritance formulas for all hybrid stats
- Implement HP = (Parent A HP + Parent B HP) / 2
- Implement trait inheritance as the union of both parents' traits
- Support unique bonus traits for specific hybrids
- Display both parent icons in the hybrid's UI representation
- Ensure generated stats are deterministic and reproducible

## User Stories

### US-001: HP Inheritance Formula
**Description:** As a developer, I want hybrid HP to be the average of both parents' HP so that hybrids are balanced.

**Acceptance Criteria:**
- [ ] Hybrid HP = Math.floor((Parent A HP + Parent B HP) / 2)
- [ ] The formula uses the parents' base HP values (before any temporary buffs)
- [ ] The result is always a whole number (floored)
- [ ] Unit test: Goblin (30 HP) + Kobold (20 HP) = Hobgoblin (25 HP)
- [ ] Unit test: Skeleton (40 HP) + Wraith (25 HP) = Death Knight (32 HP)
- [ ] Typecheck/lint passes

### US-002: Attack Stat Inheritance
**Description:** As a developer, I want hybrid attack to be calculated from parent stats with a defined formula.

**Acceptance Criteria:**
- [ ] Hybrid Attack = Math.floor((Parent A Attack + Parent B Attack) / 2)
- [ ] Or alternatively: Hybrid Attack = Max(Parent A Attack, Parent B Attack) (to be determined)
- [ ] The chosen formula is consistent across all hybrids
- [ ] Unit tests cover at least 3 different parent combinations
- [ ] Typecheck/lint passes

### US-003: Defense Stat Inheritance
**Description:** As a developer, I want hybrid defense to be calculated from parent stats.

**Acceptance Criteria:**
- [ ] Hybrid Defense = Math.floor((Parent A Defense + Parent B Defense) / 2)
- [ ] The formula matches the agreed-upon stat calculation pattern
- [ ] Unit tests cover at least 3 different parent combinations
- [ ] Typecheck/lint passes

### US-004: Speed Stat Inheritance
**Description:** As a developer, I want hybrid speed to be calculated from parent stats.

**Acceptance Criteria:**
- [ ] Hybrid Speed = Math.floor((Parent A Speed + Parent B Speed) / 2)
- [ ] The formula matches the agreed-upon stat calculation pattern
- [ ] Unit tests cover at least 3 different parent combinations
- [ ] Typecheck/lint passes

### US-005: Worker Efficiency Inheritance
**Description:** As a developer, I want hybrid worker efficiency to be calculated from parent stats.

**Acceptance Criteria:**
- [ ] Hybrid Worker Efficiency = (Parent A Efficiency + Parent B Efficiency) / 2
- [ ] Worker efficiency is a decimal (e.g., 1.0, 1.2), not floored
- [ ] Unit tests cover at least 3 different parent combinations
- [ ] Typecheck/lint passes

### US-006: Trait Union Inheritance
**Description:** As a developer, I want hybrids to inherit all traits from both parents so that they combine their parents' abilities.

**Acceptance Criteria:**
- [ ] Hybrid traits = Union of Parent A traits and Parent B traits
- [ ] Duplicate traits are not doubled (set union, not concatenation)
- [ ] Conflicting traits (e.g., "Fire Resistant" + "Fire Vulnerable") follow a defined resolution rule
- [ ] Unit test: Parent A ["Dark Vision", "Mining"] + Parent B ["Fire Resistant"] = ["Dark Vision", "Mining", "Fire Resistant"]
- [ ] Unit test: Parent A ["Undead"] + Parent B ["Undead", "Flying"] = ["Undead", "Flying"]
- [ ] Typecheck/lint passes

### US-007: Unique Bonus Traits
**Description:** As a developer, I want specific hybrids to receive unique bonus traits that neither parent has.

**Acceptance Criteria:**
- [ ] Bonus traits are defined per hybrid in the hybrid's YAML definition
- [ ] Bonus traits are added on top of inherited traits
- [ ] At least 5 hybrids have unique bonus traits
- [ ] Example: Death Knight gains "Spectral Charge" (neither Skeleton nor Wraith has this)
- [ ] Bonus traits are displayed with a special indicator in the UI
- [ ] Typecheck/lint passes

### US-008: Stat Generation Function
**Description:** As a developer, I want a pure function that generates hybrid stats from two parent inhabitants and a recipe.

**Acceptance Criteria:**
- [ ] A function `generateHybridStats(parentA, parentB, recipe)` exists in `src/app/helpers/`
- [ ] The function returns a complete stat block for the hybrid
- [ ] The function is pure (no side effects, deterministic output)
- [ ] The function handles edge cases (zero stats, missing traits)
- [ ] Comprehensive unit tests exist in `src/app/helpers/` matching the spec pattern
- [ ] Typecheck/lint passes

### US-009: Hybrid Instance Creation
**Description:** As a developer, I want to create a fully realized hybrid inhabitant instance from the generated stats.

**Acceptance Criteria:**
- [ ] A function creates a new inhabitant instance with: generated stats, combined traits, bonus traits, hybrid flag, parent references
- [ ] The instance includes: `id` (unique generated), `name`, `type`, `tier`, `stats`, `traits`, `hybrid: true`, `fusedFrom: [parentA.id, parentB.id]`
- [ ] The instance is compatible with the existing inhabitant data model
- [ ] The instance can be saved to IndexedDB and loaded correctly
- [ ] Typecheck/lint passes

### US-010: Dual Parent Icon Display
**Description:** As a dungeon builder, I want hybrids to display both parent icons in the UI so that I can quickly identify their lineage.

**Acceptance Criteria:**
- [ ] Hybrid inhabitants show a composite icon with both parent sprites
- [ ] The composite uses a split or overlay layout (e.g., left half = Parent A, right half = Parent B)
- [ ] The hybrid's own name is displayed below the composite icon
- [ ] The composite icon works in all UI contexts: roster, room panel, tooltips
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-011: Stat Override for Special Hybrids
**Description:** As a developer, I want certain hybrids to have stat overrides that differ from the standard formula.

**Acceptance Criteria:**
- [ ] Hybrid YAML definitions can include `statOverrides` that replace formula-calculated values
- [ ] Override values take precedence over the calculated average
- [ ] Only specified stats are overridden; unspecified stats use the formula
- [ ] Unit tests verify overrides are applied correctly
- [ ] Typecheck/lint passes

### US-012: Hybrid Tier Calculation
**Description:** As a developer, I want hybrid tier to be determined by the recipe, not calculated from parents.

**Acceptance Criteria:**
- [ ] Hybrid tier is defined in the hybrid's YAML definition
- [ ] Generally: same-tier fusion = same tier, cross-tier fusion = higher tier
- [ ] Tier determines the hybrid's recruitment cost if it were available through normal means
- [ ] Unit tests verify tier is correctly assigned from definition
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: HP must be calculated as the average of both parents' HP (floored).
- FR-2: Attack, Defense, and Speed must follow the defined inheritance formula.
- FR-3: Worker Efficiency must be the average of both parents' efficiency.
- FR-4: Traits must be the union of both parents' trait sets.
- FR-5: Unique bonus traits defined per hybrid must be added to inherited traits.
- FR-6: A pure stat generation function must exist with comprehensive tests.
- FR-7: Hybrids must display dual parent icons in all UI contexts.
- FR-8: Stat overrides must be supported for special hybrids.

## Non-Goals (Out of Scope)
- Fusion UI flow (handled by Issue #92)
- Fusion recipe definitions (handled by Issue #93)
- Hybrid combat AI or behavior differences
- Hybrid-specific room bonuses

## Technical Considerations
- Depends on fusion recipes system (Issue #93) for recipe data and hybrid definitions.
- The stat generation function should be in `src/app/helpers/` and have comprehensive tests in `src/app/helpers/*.spec.ts`.
- Use `sortBy` from `es-toolkit/compat` if trait lists need sorting.
- The dual icon display component should use Angular's `NgOptimizedImage` for the parent sprites.
- Stat overrides in YAML should use a sparse object (only specify overridden stats).
- Conflicting trait resolution should be deterministic (e.g., always favor the higher-tier parent's version).

## Success Metrics
- All stat formulas produce correct results for all 20+ recipes
- Trait inheritance correctly unions parent traits without duplicates
- Bonus traits are added to the correct hybrids
- Dual parent icons render correctly in all UI contexts
- All unit tests pass for the stat generation function
- Generated hybrids save and load correctly

## Open Questions
- Should stats round up or down (floor vs ceil)?
- How should conflicting traits be resolved (e.g., Fire Resistant + Fire Vulnerable)?
- Should there be a stat bonus/penalty based on the Essence spent?
- Can hybrids level up or are their stats fixed at creation?
- What is the exact layout for dual parent icons (split, overlay, small badges)?
