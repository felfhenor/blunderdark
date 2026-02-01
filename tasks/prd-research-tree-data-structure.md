# PRD: Research Tree Data Structure

## Introduction
The Research Tree is a core progression system that unlocks new rooms, inhabitants, abilities, and upgrades. It is organized into three branches (Dark, Arcane, Engineering), each containing 10-15 research nodes with prerequisites forming a tree structure. This feature defines the data model, YAML schema, and runtime types that support the entire research system.

## Goals
- Define a research node data structure with name, description, cost, prerequisites, and unlock effects
- Create three research branches: Dark, Arcane, Engineering, each with 10-15 nodes
- Establish parent-child relationships forming a tree graph
- Ensure the data structure is serializable for save/load
- Compile research data from YAML to JSON through the existing content pipeline

## User Stories

### US-001: Define Research Node Type
**Description:** As a developer, I want a well-typed research node data structure so that each node has all necessary properties.

**Acceptance Criteria:**
- [ ] A `ResearchNode` type is defined in `src/app/interfaces/` with fields: `id`, `name`, `description`, `branch`, `cost` (resource requirements), `prerequisites` (array of node IDs), `unlocks` (array of unlock effect descriptors), `tier` (position in tree depth)
- [ ] A `ResearchBranch` type is defined as a union: `'dark' | 'arcane' | 'engineering'`
- [ ] A `ResearchTree` type is defined containing all nodes organized by branch
- [ ] Types use `type` keyword per project conventions
- [ ] Typecheck/lint passes

### US-002: Define Research State Type
**Description:** As a developer, I want a research state type so that player progress through the tree can be tracked and persisted.

**Acceptance Criteria:**
- [ ] A `ResearchState` type is defined with fields: `completedNodes` (Set or array of node IDs), `activeResearch` (node ID or null), `activeResearchProgress` (number 0-1), `activeResearchStartTick` (number)
- [ ] The type is added to `GameStateWorld` in `state-game.ts`
- [ ] The type is JSON-serializable (no Set, Map, or class instances)
- [ ] Unit tests verify serialization round-trip
- [ ] Typecheck/lint passes

### US-003: Define YAML Schema for Research Nodes
**Description:** As a developer, I want research nodes defined in YAML files so that they compile through the content pipeline.

**Acceptance Criteria:**
- [ ] A YAML schema for research nodes is defined (e.g., `gamedata/research/dark.yaml`, `gamedata/research/arcane.yaml`, `gamedata/research/engineering.yaml`)
- [ ] Each YAML file contains 10-15 research nodes with all required fields
- [ ] `npm run gamedata:build` compiles the YAML without errors
- [ ] `npm run schemas:generate` produces matching TypeScript types
- [ ] Typecheck/lint passes

### US-004: Define Dark Branch Nodes
**Description:** As a developer, I want the Dark research branch defined with 10-15 nodes covering dark magic, undead, and corruption.

**Acceptance Criteria:**
- [ ] 10-15 nodes are defined for the Dark branch in YAML
- [ ] Nodes include: Dark Arts I, Dark Arts II, Soul Manipulation, Undead Mastery, Corruption Control, Soul Well, Shadow Magic, Necromancy, Dark Rituals, Abyssal Gateway (and more)
- [ ] Each node has a clear prerequisite chain (tree structure, not a flat list)
- [ ] Costs are balanced (early nodes cheap, later nodes expensive)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-005: Define Arcane Branch Nodes
**Description:** As a developer, I want the Arcane research branch defined with 10-15 nodes covering magic, flux, and ley lines.

**Acceptance Criteria:**
- [ ] 10-15 nodes are defined for the Arcane branch in YAML
- [ ] Nodes include: Arcane Basics, Flux Manipulation, Ley Line Tapping, Enchantment, Warding, Elemental Binding, Arcane Amplification, Dimensional Studies, Planar Magic, Arcane Mastery (and more)
- [ ] Each node has prerequisites forming a tree structure
- [ ] Costs scale appropriately with tier depth
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-006: Define Engineering Branch Nodes
**Description:** As a developer, I want the Engineering research branch defined with 10-15 nodes covering construction, traps, and manufacturing.

**Acceptance Criteria:**
- [ ] 10-15 nodes are defined for the Engineering branch in YAML
- [ ] Nodes include: Basic Engineering, Advanced Construction, Trap Design, Advanced Manufacturing, Siege Works, Automated Defenses, Dark Forge, Master Architecture, Mechanical Golems, Ultimate Fortification (and more)
- [ ] Each node has prerequisites forming a tree structure
- [ ] Costs scale appropriately with tier depth
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-007: Research Tree Validation
**Description:** As a developer, I want build-time validation of the research tree so that invalid data is caught before runtime.

**Acceptance Criteria:**
- [ ] A validation script checks that all prerequisite references point to valid node IDs
- [ ] Circular dependency detection prevents infinite prerequisite loops
- [ ] Every branch has at least one root node (no prerequisites)
- [ ] Validation runs as part of `npm run gamedata:build`
- [ ] Clear error messages for invalid data
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support three research branches with independent trees
- FR-2: Each research node must have a unique ID, name, description, branch, cost, prerequisites, and unlock list
- FR-3: The research tree must be loadable from compiled JSON via ContentService
- FR-4: Research state must be serializable and included in the game state for IndexedDB persistence
- FR-5: The build pipeline must validate research tree integrity (no cycles, valid references)

## Non-Goals (Out of Scope)
- Research UI rendering (Issue #74)
- Research progress mechanics (Issue #75)
- Applying unlock effects (Issue #76)
- Dynamic research tree modification at runtime

## Technical Considerations
- Research node IDs should use a consistent naming convention (e.g., `dark-arts-1`, `arcane-basics`)
- Prerequisites form a directed acyclic graph (DAG); validation must check for cycles
- Cost should be a record of resource type to amount (e.g., `{ research: 100, gold: 50 }`)
- Unlock descriptors should be typed unions (e.g., `{ type: 'room', roomId: 'soul-well' }` or `{ type: 'trait', traitId: 'dark-vision' }`)
- YAML files should be human-editable for game designers

## Success Metrics
- All three branches compile from YAML without errors
- Research tree validation passes with no cycles or dangling references
- Type definitions are comprehensive enough to support UI, progress, and unlock systems
- Serialization round-trip preserves all research state

## Open Questions
- Should research nodes support multiple prerequisite paths (OR logic) or only all-required (AND logic)?
- Is there a maximum tree depth limit?
- Should some nodes be hidden until specific conditions are met (see Lich's Ancient Knowledge trait)?
- What resource types can research cost (Research points only, or also Gold, Flux, etc.)?
