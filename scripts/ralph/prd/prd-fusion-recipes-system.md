# PRD: Fusion Recipes System

## Introduction
The Fusion Recipes System defines 20+ fusion recipes that specify how two inhabitant types combine to create a hybrid. Each recipe follows the format: Creature A + Creature B = Hybrid C, with defined resource costs (Essence + other resources). Recipes are stored in YAML data files and compiled to JSON through the existing content pipeline. This system provides the data foundation for the Fusion Interface and Hybrid Stat Generation features.

## Goals
- Define 20+ fusion recipes in YAML data files
- Establish the recipe format: Creature A + Creature B = Hybrid C + cost
- Define resource costs per recipe (Essence is always required, other resources vary)
- Ensure recipes compile through the content pipeline
- Support recipe lookup by creature pair (order-independent)

## User Stories

### US-001: Fusion Recipe YAML Schema
**Description:** As a developer, I want a well-defined YAML schema for fusion recipes so that all recipes follow a consistent format.

**Acceptance Criteria:**
- [ ] A fusion recipe schema type is defined in `src/app/interfaces/` with fields: `id`, `creatureA`, `creatureB`, `resultHybrid`, `cost`, `description`
- [ ] `creatureA` and `creatureB` reference inhabitant type IDs
- [ ] `resultHybrid` references a hybrid inhabitant type ID
- [ ] `cost` uses `Partial<Record<ResourceType, number>>` with Essence always included
- [ ] Uses `type` keyword per project conventions
- [ ] Types are exported via the barrel export at `@interfaces`
- [ ] Typecheck/lint passes

### US-002: Fusion Recipe Data Files
**Description:** As a developer, I want fusion recipes defined in YAML files in the gamedata directory.

**Acceptance Criteria:**
- [ ] A `fusion-recipes.yaml` file (or `fusion-recipes/` directory with multiple files) exists in `gamedata/`
- [ ] At least 20 recipes are defined
- [ ] Each recipe specifies creatureA, creatureB, resultHybrid, cost, and description
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-003: Tier 1 Fusion Recipes
**Description:** As a developer, I want basic fusion recipes combining Tier 1 inhabitants so that early-game fusions are available.

**Acceptance Criteria:**
- [ ] Goblin + Kobold = Hobgoblin (cost: 50 Essence)
- [ ] Goblin + Skeleton = Bone Goblin (cost: 40 Essence + 10 Crystals)
- [ ] Kobold + Imp = Fire Kobold (cost: 45 Essence)
- [ ] Skeleton + Imp = Flame Skeleton (cost: 55 Essence + 5 Crystals)
- [ ] Goblin + Imp = Goblin Firestarter (cost: 50 Essence + 10 Food)
- [ ] All recipes compile and reference valid creature IDs
- [ ] Typecheck/lint passes

### US-004: Tier 2 Fusion Recipes
**Description:** As a developer, I want fusion recipes combining Tier 1 and Tier 2 inhabitants for mid-game progression.

**Acceptance Criteria:**
- [ ] Skeleton + Wraith = Death Knight (cost: 100 Essence + 20 Crystals)
- [ ] Orc + Goblin = War Chief (cost: 80 Essence + 15 Food)
- [ ] Wraith + Imp = Phantom Flame (cost: 90 Essence + 10 Crystals)
- [ ] Stone Elemental + Skeleton = Bone Golem (cost: 120 Essence + 30 Crystals)
- [ ] Orc + Stone Elemental = Iron Brute (cost: 110 Essence + 25 Crystals)
- [ ] All recipes compile and reference valid creature IDs
- [ ] Typecheck/lint passes

### US-005: Advanced Fusion Recipes
**Description:** As a developer, I want advanced fusion recipes for high-tier combinations.

**Acceptance Criteria:**
- [ ] Lich + Wraith = Dread Lich (cost: 200 Essence + 50 Crystals + 20 Corruption)
- [ ] Lich + Skeleton = Bone Lord (cost: 180 Essence + 40 Crystals)
- [ ] Mimic + Kobold = Trap Mimic (cost: 150 Essence + 30 Gold)
- [ ] Stone Elemental + Wraith = Phantom Colossus (cost: 160 Essence + 40 Crystals)
- [ ] Orc + Lich = Death Warlord (cost: 250 Essence + 50 Crystals + 30 Corruption)
- [ ] All recipes compile and reference valid creature IDs
- [ ] Typecheck/lint passes

### US-006: Hybrid Inhabitant Definitions
**Description:** As a developer, I want all hybrid inhabitants defined in YAML gamedata so that fusion results are fully specified.

**Acceptance Criteria:**
- [ ] Each hybrid referenced by a recipe has a corresponding YAML definition
- [ ] Hybrid definitions include: id, name, type, tier, description, baseStats, traits, spriteId
- [ ] Hybrids are marked with a `hybrid: true` flag
- [ ] Hybrid definitions include `parentTypes` array listing valid parent creature types
- [ ] All hybrid YAML files compile to valid JSON
- [ ] Typecheck/lint passes

### US-007: Recipe Lookup by Creature Pair
**Description:** As a developer, I want to look up a fusion recipe by providing two creature type IDs so that the fusion interface can show previews.

**Acceptance Criteria:**
- [ ] A utility function exists to look up a recipe given two creature type IDs
- [ ] Lookup is order-independent (A+B and B+A return the same recipe)
- [ ] Returns the full recipe object if found, or null/undefined if no recipe exists
- [ ] Lookup is O(1) or O(log n) using a map or index
- [ ] Unit tests cover: valid pair, reversed pair, invalid pair, same creature twice
- [ ] Typecheck/lint passes

### US-008: Recipe Validation
**Description:** As a developer, I want build-time validation of fusion recipes to catch errors early.

**Acceptance Criteria:**
- [ ] The gamedata build step validates that all creatureA/creatureB IDs reference existing inhabitant types
- [ ] The build step validates that all resultHybrid IDs reference existing hybrid definitions
- [ ] Duplicate recipes (same pair) produce a build warning or error
- [ ] Missing cost fields produce a build error
- [ ] Typecheck/lint passes

### US-009: Recipe Cost Balancing Structure
**Description:** As a developer, I want recipe costs to follow a consistent balancing structure.

**Acceptance Criteria:**
- [ ] All recipes require Essence as a minimum cost
- [ ] Essence cost scales with the resulting hybrid's tier (Tier 1 hybrid: 40-60, Tier 2: 80-120, Tier 3: 150-250)
- [ ] Additional resource costs are optional and thematically appropriate
- [ ] Cost data is defined in the recipe YAML, not hardcoded
- [ ] Typecheck/lint passes

### US-010: ContentService Integration
**Description:** As a developer, I want fusion recipes loaded by ContentService at app init so that they are available throughout the app.

**Acceptance Criteria:**
- [ ] ContentService loads compiled fusion recipe JSON at initialization
- [ ] Recipes are available via a signal or method (e.g., `contentService.fusionRecipes()`)
- [ ] A recipe index/map is built for efficient lookup
- [ ] Loading failure is handled gracefully with an error message
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: At least 20 fusion recipes must be defined in YAML.
- FR-2: Each recipe must specify creature A, creature B, result hybrid, and cost.
- FR-3: Recipes must be order-independent (A+B = B+A).
- FR-4: All referenced creature and hybrid IDs must be valid.
- FR-5: Recipes must compile through the content pipeline to JSON.
- FR-6: A lookup function must exist for efficient recipe querying.

## Non-Goals (Out of Scope)
- Fusion UI (handled by Issue #92)
- Hybrid stat calculation logic (handled by Issue #94)
- Dynamic recipe discovery or unlocking
- Recipe balancing iteration (initial values are estimates)

## Technical Considerations
- Depends on inhabitant data model (Issue #11).
- YAML files should follow the existing content pipeline pattern in `gamedata/`.
- The recipe lookup map should use a canonical key: sort the two creature IDs alphabetically and join them (e.g., `"goblin|kobold"`).
- Schema generation via `npm run schemas:generate` should produce TypeScript types for recipes.
- Hybrid inhabitant definitions should extend the existing `InhabitantDefinition` type with a `hybrid` flag and `parentTypes` field.

## Success Metrics
- 20+ recipes are defined and compile without errors
- Recipe lookup correctly finds recipes regardless of creature order
- All referenced creature and hybrid IDs are valid
- ContentService loads recipes and makes them available to the UI

## Open Questions
- Should recipes be discoverable (hidden until first performed) or always visible?
- Can the same creature type appear in multiple recipes with different partners?
- What is the exact Essence cost scaling formula?
- Should there be "failed fusion" outcomes for invalid or unknown combinations?
