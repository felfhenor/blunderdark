# PRD: Resource Manager

## Introduction
The Resource Manager is a foundational system that tracks all 7 resource currencies in Blunderdark: Crystals, Food, Gold, Flux, Research, Essence, and Corruption. It provides a centralized API for adding, subtracting, and querying resources with validation and event notification.

## Goals
- Track all 7 resource types with current amounts and storage limits
- Provide safe add/subtract operations that prevent negative values and respect caps
- Emit reactive signals when resources change for UI and game logic consumption
- Persist resource state as part of the game state for save/load

## User Stories

### US-001: Define Resource Types and State
**Description:** As a developer, I want resource types and their state defined as TypeScript types so that the resource system is type-safe.

**Acceptance Criteria:**
- [ ] A `ResourceType` union type is defined: `'crystals' | 'food' | 'gold' | 'flux' | 'research' | 'essence' | 'corruption'`
- [ ] A `ResourceState` type is defined with: `current: number`, `max: number` for each resource
- [ ] A `ResourceMap` type maps `ResourceType` to `ResourceState`
- [ ] Types are in `src/app/interfaces/` (e.g., `resource.ts`)
- [ ] Currency definitions in `gamedata/currency/base.yml` are expanded to include all 7 types with default max values
- [ ] Typecheck/lint passes

### US-002: Resource State Signal
**Description:** As a developer, I want resource state managed as an Angular Signal so that the UI reactively updates when resources change.

**Acceptance Criteria:**
- [ ] A helper file `src/app/helpers/resources.ts` manages resource state via signals
- [ ] `getResource(type: ResourceType)` returns a computed signal with `{current, max}` for that resource
- [ ] `allResources()` returns a computed signal with the full `ResourceMap`
- [ ] Resource state is integrated into `GameStateWorld` for IndexedDB persistence
- [ ] On new game, resources initialize to configured starting values
- [ ] Typecheck/lint passes

### US-003: Add Resources with Cap Validation
**Description:** As a developer, I want to add resources with automatic capping so that values never exceed storage limits.

**Acceptance Criteria:**
- [ ] A function `addResource(type, amount)` increases the resource by `amount`
- [ ] If adding would exceed `max`, the value is capped at `max` (excess is silently discarded)
- [ ] Adding a negative amount is rejected (throws or returns error)
- [ ] The function returns the actual amount added (after capping)
- [ ] Unit tests cover: normal add, add exceeding cap, add zero, add negative
- [ ] Typecheck/lint passes

### US-004: Subtract Resources with Floor Validation
**Description:** As a developer, I want to subtract resources with a floor check so that values never go negative.

**Acceptance Criteria:**
- [ ] A function `subtractResource(type, amount)` decreases the resource by `amount`
- [ ] If subtracting would go below 0, the operation fails and returns `false` (no partial subtraction)
- [ ] A function `canAfford(costs: Partial<Record<ResourceType, number>>)` checks if all costs can be paid
- [ ] A function `payCost(costs: Partial<Record<ResourceType, number>>)` atomically subtracts multiple resources (all-or-nothing)
- [ ] Unit tests cover: normal subtract, subtract more than available, canAfford true/false, multi-resource payCost
- [ ] Typecheck/lint passes

### US-005: Resource Change Callbacks
**Description:** As a developer, I want to react to resource changes so that game systems can respond (e.g., UI updates, trigger events at thresholds).

**Acceptance Criteria:**
- [ ] Since Angular Signals are used, any `computed()` or `effect()` depending on resource signals automatically reacts to changes
- [ ] A helper `isResourceLow(type, threshold)` returns a computed signal that is `true` when resource drops below threshold percentage
- [ ] A helper `isResourceFull(type)` returns a computed signal that is `true` when resource equals its max
- [ ] Unit tests verify reactive behavior of `isResourceLow` and `isResourceFull`
- [ ] Typecheck/lint passes

### US-006: Resource Save and Load
**Description:** As a player, I want my resources to persist across sessions so that I don't lose progress.

**Acceptance Criteria:**
- [ ] Resource state is included in `GameStateWorld` and saved to IndexedDB
- [ ] On game load, resources are restored from saved state
- [ ] If a new resource type is added in a game update, migration initializes it to default values
- [ ] Unit tests verify serialization round-trip
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must track 7 resource types: Crystals, Food, Gold, Flux, Research, Essence, Corruption
- FR-2: Add operations must cap at storage maximum; subtract operations must prevent going below zero
- FR-3: Multi-resource transactions (e.g., paying a cost) must be atomic (all-or-nothing)
- FR-4: Resource state must be reactive via Angular Signals
- FR-5: Resource state must persist to IndexedDB as part of game state

## Non-Goals (Out of Scope)
- Resource production/generation (handled by Issue #9)
- Resource UI display (handled by Issue #10)
- Resource trading or conversion between types
- Resource decay over time
- Per-room resource storage bonuses

## Technical Considerations
- Use Angular Signals (`signal`, `computed`) for all resource state, not RxJS
- Resource state should be stored inside `GameStateWorld` as a serializable record
- The `updateGamestate()` helper from `state-game.ts` should be used for atomic state updates
- Currency definitions in `gamedata/currency/base.yml` should define the 7 types with default `max` values
- Consider using `es-toolkit/compat` utilities if any collection operations are needed
- All resource operations should be synchronous for game loop performance

## Success Metrics
- All add/subtract operations pass validation unit tests with zero edge-case failures
- Resource state round-trips through save/load without data loss
- No race conditions in multi-resource transactions

## Open Questions
- Should storage limits be upgradeable via rooms or research?
- What are the starting values for each resource on a new game?
- Should there be a resource history/log for debugging?
