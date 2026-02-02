# PRD: Inhabitant Recruitment System

## Introduction
The inhabitant recruitment system allows players to spend resources to recruit new inhabitants from an altar or shop interface. It controls which inhabitant types are available based on tier progression and handles the purchase transaction.

## Goals
- Provide a recruitment UI (altar/shop interface) for purchasing inhabitants
- Display available inhabitant types with their costs and stats
- Process purchases by deducting resources and adding inhabitants to the roster
- Gate availability by tier-based unlocks

## User Stories

### US-001: Recruitment UI Panel
**Description:** As a player, I want to access a recruitment interface so that I can recruit new inhabitants for my dungeon.

**Acceptance Criteria:**
- [ ] A recruitment panel opens when clicking the altar room on the grid
- [ ] Panel shows a list of available inhabitant types that can be recruited
- [ ] Panel has a clear title (e.g., "Altar of Summoning") and close button
- [ ] Panel can be closed with Escape or clicking outside
- [ ] Component is standalone with OnPush change detection
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Inhabitant Type Display
**Description:** As a player, I want to see detailed information about each recruitable inhabitant so that I can make informed choices.

**Acceptance Criteria:**
- [ ] Each recruitable type shows: name, tier badge, description, key stats (HP, Attack, Defense, Speed, Efficiency)
- [ ] Traits are displayed as tags with tooltip descriptions
- [ ] Resource cost is shown for each type (e.g., "Cost: 50 Gold, 20 Crystals")
- [ ] Inhabitants the player cannot afford have dimmed costs with the insufficient resource highlighted in red
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Purchase Inhabitant
**Description:** As a player, I want to click a recruit button to purchase an inhabitant so that it joins my roster.

**Acceptance Criteria:**
- [ ] A "Recruit" button is shown for each inhabitant type
- [ ] Button is disabled when the player cannot afford the cost
- [ ] Clicking "Recruit" deducts the resource cost atomically (using `payCost()` from resource manager)
- [ ] A new `InhabitantInstance` is created with a unique ID, the definition ID, state "normal", and no assignment
- [ ] The new inhabitant is added to `GameStateWorld.inhabitants`
- [ ] A success notification is shown: "Recruited [Name]!"
- [ ] Typecheck/lint passes

### US-004: Insufficient Resources Feedback
**Description:** As a player, I want clear feedback when I cannot afford a recruitment so that I know what resources I need.

**Acceptance Criteria:**
- [ ] The "Recruit" button shows a tooltip on hover listing missing resources when disabled
- [ ] Tooltip format: "Need: 30 more Gold, 10 more Crystals"
- [ ] Attempting to click a disabled button does nothing (no error notification)
- [ ] If resources change (e.g., production ticks), button state updates reactively
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Tier-Based Availability
**Description:** As a developer, I want inhabitant availability gated by tier so that the player unlocks new types as they progress.

**Acceptance Criteria:**
- [ ] Each inhabitant definition has a `tier` field (1, 2, 3, etc.)
- [ ] A signal `unlockedTier()` determines the player's current maximum recruitable tier
- [ ] Only inhabitants with `tier <= unlockedTier()` appear in the recruitment panel
- [ ] Tier 1 is always unlocked (Goblin, Kobold, Skeleton, Myconid, Slime)
- [ ] Higher tiers show as locked with a message: "Requires Tier X" (for discoverability)
- [ ] Typecheck/lint passes

### US-006: Recruitment Limits
**Description:** As a developer, I want optional limits on recruitment so that the game can balance inhabitant counts.

**Acceptance Criteria:**
- [ ] A configurable maximum total inhabitants limit exists (e.g., 50 max)
- [ ] When at max, the "Recruit" button is disabled for all types with message "Roster full"
- [ ] The current count and max are displayed in the recruitment panel header (e.g., "Inhabitants: 12/50")
- [ ] Max inhabitant count can be increased by specific rooms or upgrades (data-driven)
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must display a recruitment interface accessible from the altar room
- FR-2: Each inhabitant type must show name, stats, traits, and resource cost
- FR-3: Purchasing must atomically deduct resources and create a new inhabitant instance
- FR-4: Availability must be gated by tier, with only unlocked tiers shown as recruitable
- FR-5: Total inhabitant count must respect a configurable maximum

## Non-Goals (Out of Scope)
- Inhabitant dismissal or selling
- Random/rotating shop inventory
- Bulk recruitment
- Recruitment cooldowns or timers
- Special/legendary inhabitant recruitment
- Inhabitant customization (name, appearance) at recruitment time

## Technical Considerations
- The recruitment panel should be a standalone component, likely opened as a modal or side panel
- Resource cost checking uses `canAfford()` from the resource manager (Issue #7)
- Purchase uses `payCost()` for atomic multi-resource deduction
- Inhabitant definitions are loaded from `ContentService` (compiled from `gamedata/inhabitant/`)
- New inhabitant instances need unique IDs; consider using `crypto.randomUUID()` or the existing ID generation pattern
- Tier unlocking mechanism needs definition -- could be based on dungeon level, research, or specific room construction
- Depends on resource manager (Issue #7) and inhabitant data model (Issue #11)

## Success Metrics
- Recruitment transaction (click to roster update) completes within 100ms
- Cannot recruit when resources are insufficient (no negative resource bugs)
- Tier gating correctly filters available types

## Open Questions
- How does the player unlock higher tiers? Research? Room construction? Floor depth?
- Should there be a recruitment queue (recruit over time) or instant recruitment?
- Should recruitment costs scale with the number of inhabitants already owned?
- Is there a limit per inhabitant type, or only a global max?
