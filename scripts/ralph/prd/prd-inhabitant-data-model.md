# PRD: Inhabitant Data Model

## Introduction
The inhabitant data model defines the core data structures for dungeon inhabitants -- the creatures that work in rooms, produce resources, and defend the dungeon. This issue establishes the type definitions, stat systems, and Tier 1 creature definitions that all other inhabitant systems build upon.

## Goals
- Define a comprehensive `Inhabitant` type with stats, traits, and conditional states
- Define all 5 Tier 1 inhabitant types in YAML gamedata
- Ensure the model supports serialization for save/load
- Provide a foundation for recruitment, assignment, and efficiency systems

## User Stories

### US-001: Define Inhabitant Type
**Description:** As a developer, I want a well-typed `Inhabitant` type so that all inhabitant systems share a consistent data model.

**Acceptance Criteria:**
- [ ] An `InhabitantDefinition` type is defined in `src/app/interfaces/` with fields: `id`, `name`, `type`, `tier`, `description`
- [ ] A `cost` field defines the resource costs to recruit (using `Partial<Record<ResourceType, number>>`)
- [ ] Uses `type` keyword per project conventions
- [ ] Types are exported via the barrel export at `@interfaces`
- [ ] Typecheck/lint passes

### US-002: Define Inhabitant Stats
**Description:** As a developer, I want inhabitants to have stats so that they can be compared and affect gameplay.

**Acceptance Criteria:**
- [ ] An `InhabitantStats` type is defined with: `hp`, `attack`, `defense`, `speed`, `workerEfficiency`
- [ ] `workerEfficiency` is a percentage modifier (e.g., 1.0 = 100% = no bonus, 1.2 = 120% = +20%)
- [ ] The `InhabitantDefinition` type includes a `stats: InhabitantStats` field
- [ ] Stats are numeric values (no stat can be negative)
- [ ] Typecheck/lint passes

### US-003: Define Inhabitant Traits
**Description:** As a developer, I want inhabitants to have traits that provide specific bonuses so that different creatures are suited for different roles.

**Acceptance Criteria:**
- [ ] An `InhabitantTrait` type is defined with: `id`, `name`, `description`, `effectType`, `effectValue`
- [ ] Example traits: "Miner" (+20% crystal production), "Cook" (+15% food production), "Scholar" (+10% research)
- [ ] `InhabitantDefinition` includes a `traits: InhabitantTrait[]` field
- [ ] Traits are defined in YAML gamedata and loaded via ContentService
- [ ] Typecheck/lint passes

### US-004: Define Conditional States
**Description:** As a developer, I want inhabitants to have conditional states so that their behavior changes based on dungeon conditions.

**Acceptance Criteria:**
- [ ] An `InhabitantState` union type is defined: `'normal' | 'scared' | 'hungry'`
- [ ] A runtime `InhabitantInstance` type is defined for owned inhabitants with: `instanceId`, `definitionId`, `name`, `state: InhabitantState`, `assignedRoomId: string | null`
- [ ] `InhabitantInstance` is the type stored in game state (not `InhabitantDefinition`)
- [ ] State defaults to `'normal'` when recruited
- [ ] Typecheck/lint passes

### US-005: Define Tier 1 Inhabitants in Gamedata
**Description:** As a designer, I want Tier 1 inhabitants defined in YAML so that they are data-driven and easy to modify.

**Acceptance Criteria:**
- [ ] `gamedata/inhabitant/base.yml` defines 5 Tier 1 inhabitants: Goblin, Kobold, Skeleton, Myconid, Slime
- [ ] Each entry includes: id, name, type, tier (1), description, cost, stats, traits
- [ ] Goblin: balanced stats, "Miner" trait
- [ ] Kobold: high speed, "Trapper" trait
- [ ] Skeleton: high defense, "Guardian" trait
- [ ] Myconid: high worker efficiency, "Farmer" trait
- [ ] Slime: low stats but very cheap cost, "Adaptable" trait
- [ ] YAML compiles via `npm run gamedata:build` without errors
- [ ] Typecheck/lint passes

### US-006: Inhabitant Serialization for Save/Load
**Description:** As a developer, I want inhabitant instances to be serializable so that owned inhabitants persist across save/load.

**Acceptance Criteria:**
- [ ] `InhabitantInstance` is JSON-serializable (no class instances, functions, or circular references)
- [ ] Game state (`GameStateWorld`) includes an array of `InhabitantInstance` for owned inhabitants
- [ ] On save, all owned inhabitants are persisted with their current state and assignment
- [ ] On load, inhabitants are restored and their definitions are resolved from content data
- [ ] Unit tests verify serialization round-trip for an inhabitant with all fields populated
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must define inhabitant types with stats, traits, and conditional states
- FR-2: All 5 Tier 1 inhabitants must be defined in YAML gamedata
- FR-3: Runtime inhabitant instances must track state and room assignment
- FR-4: Inhabitant data must be serializable for save/load
- FR-5: Type definitions must use `type` keyword and follow project conventions

## Non-Goals (Out of Scope)
- Tier 2+ inhabitants
- Inhabitant leveling or stat growth
- Inhabitant AI or pathfinding
- Combat mechanics
- Inhabitant visual sprites (art)
- Recruitment or assignment UI (Issues #12, #13, #14)

## Technical Considerations
- Definitions (static content) vs. instances (runtime state) should be clearly separated
- Definitions come from `ContentService` (compiled YAML); instances live in `GameStateWorld`
- The existing `gamedata/inhabitant/base.yml` file is currently empty and needs to be populated
- Traits may need their own YAML file or can be inline in inhabitant definitions
- Consider using branded types for `InhabitantInstanceId` and `InhabitantDefinitionId` (like `GameId`)
- The `stat.ts` interface file already exists and may be leveraged or extended

## Success Metrics
- All 5 Tier 1 inhabitants compile from YAML without errors
- Type definitions enable autocomplete and type checking across the codebase
- Serialization round-trip preserves all inhabitant data exactly

## Open Questions
- Should inhabitants have a morale/happiness stat in addition to conditional states?
- What are the exact stat values for each Tier 1 inhabitant?
- Should traits be separate gamedata entries (referenced by ID) or inline per inhabitant?
- Can an inhabitant have multiple conditional states simultaneously (scared AND hungry)?
