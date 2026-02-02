# PRD: Merchant System

## Introduction
The Merchant System introduces a visiting trader who appears during the Harvest season, offering resource trades, rare items, blueprints, and special features. The merchant stays for 3 game days before departing. This system provides an economic outlet for surplus resources and a way to acquire rare content that cannot be obtained through normal gameplay.

## Goals
- Implement a merchant that appears during the Harvest season
- Offer resource buy/sell trades with configurable prices
- Offer rare items (blueprints, special features) on a rotating inventory
- Provide a merchant UI for browsing and completing transactions
- Merchant departs after 3 game days
- Persist merchant state (present/absent, inventory, timer) through save/load

## User Stories

### US-001: Define Merchant Data Structure
**Description:** As a developer, I want the merchant system data structures defined so that merchant state and inventory are well-typed.

**Acceptance Criteria:**
- [ ] A `MerchantState` type is defined with: `isPresent`, `arrivalDay`, `departureDayRemaining`, `inventory` (array of trade offers)
- [ ] A `TradeOffer` type is defined with: `id`, `name`, `description`, `cost` (resource record), `reward` (item/resource/blueprint), `stock` (available quantity), `type` ('buy' | 'sell' | 'special')
- [ ] Types use `type` keyword per project conventions
- [ ] `MerchantState` is added to `GameStateWorld`
- [ ] Typecheck/lint passes

### US-002: Merchant Arrival Logic
**Description:** As a developer, I want the merchant to arrive at the start of Harvest season.

**Acceptance Criteria:**
- [ ] When the Harvest season begins, the merchant arrival is triggered
- [ ] The merchant's `isPresent` flag is set to true
- [ ] The merchant's inventory is generated from the available trade pool
- [ ] The departure countdown is set to 3 game days
- [ ] A notification informs the player that the merchant has arrived
- [ ] Unit tests verify arrival triggers at Harvest start
- [ ] Typecheck/lint passes

### US-003: Merchant Departure Logic
**Description:** As a developer, I want the merchant to depart after 3 game days.

**Acceptance Criteria:**
- [ ] Each game day, the departure countdown decrements by 1
- [ ] When the countdown reaches 0, the merchant's `isPresent` flag is set to false
- [ ] The merchant's inventory is cleared on departure
- [ ] A notification informs the player that the merchant has departed
- [ ] If Harvest ends before 3 days, the merchant still stays for the full 3 days
- [ ] Unit tests verify departure after exactly 3 days
- [ ] Typecheck/lint passes

### US-004: Merchant Inventory Generation
**Description:** As a developer, I want the merchant's inventory generated from a configurable pool of trades.

**Acceptance Criteria:**
- [ ] A trade pool is defined in YAML (e.g., `gamedata/merchant/trades.yaml`)
- [ ] Each arrival, 5-10 trades are randomly selected from the pool
- [ ] At least 2 resource trades (buy/sell), 2 rare items, and 1 special offer are included
- [ ] Stock quantities are set per offer (e.g., 3 available of a given trade)
- [ ] The pool is compiled through the gamedata pipeline
- [ ] Typecheck/lint passes

### US-005: Merchant UI - Trade List
**Description:** As a player, I want to see the merchant's available trades so that I can decide what to buy or sell.

**Acceptance Criteria:**
- [ ] A merchant UI panel/modal is accessible when the merchant is present
- [ ] The UI shows a list of available trades with name, description, cost, and stock
- [ ] Trades are categorized by type (Buy, Sell, Special)
- [ ] Sold-out trades are greyed out or hidden
- [ ] The component is standalone with OnPush change detection
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-006: Execute Trade Transaction
**Description:** As a player, I want to complete a trade so that I exchange resources for goods.

**Acceptance Criteria:**
- [ ] Clicking a trade and confirming deducts the cost from the player's resources
- [ ] The reward is added to the player's inventory/resources
- [ ] The trade's stock decrements by 1
- [ ] If the player lacks sufficient resources, the trade button is disabled
- [ ] A transaction confirmation message is displayed
- [ ] Unit tests verify resource deduction and reward granting
- [ ] Typecheck/lint passes

### US-007: Merchant Notification and Access
**Description:** As a player, I want to be notified when the merchant arrives and easily access the merchant UI.

**Acceptance Criteria:**
- [ ] A notification appears when the merchant arrives with a "Visit Merchant" button
- [ ] A merchant icon/button appears in the game HUD while the merchant is present
- [ ] The icon shows the remaining days before departure
- [ ] Clicking the icon opens the merchant UI
- [ ] The icon disappears when the merchant departs
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The merchant must appear during Harvest season and stay for 3 game days
- FR-2: The merchant must offer a randomly generated inventory from a configurable trade pool
- FR-3: Players must be able to execute trades, exchanging resources for goods
- FR-4: Stock must be tracked per trade offer and depleted on purchase
- FR-5: The merchant UI must display available trades and the player's ability to afford them
- FR-6: Merchant state must persist through save/load

## Non-Goals (Out of Scope)
- Merchant reputation or loyalty system
- Haggling or price negotiation
- Multiple concurrent merchants
- Merchant quests or missions
- Black market or illegal goods

## Technical Considerations
- Depends on the resource system (Issue #7) and seasonal cycle (Issue #77)
- Merchant arrival should listen to the season transition hook from Issue #77
- Trade pool YAML should be extensible for future content updates
- Inventory generation should use a seeded RNG tied to the game state for deterministic regeneration
- The merchant UI should be a lazy-loaded component to avoid bundle bloat
- Use `computed()` signals to derive affordability checks from resource state

## Success Metrics
- Merchant arrives at the start of every Harvest season
- Merchant departs exactly 3 days after arrival
- All trades execute correctly with resource deduction and reward granting
- Inventory varies between visits

## Open Questions
- Should the merchant offer different tiers of items based on game progression?
- Can the player sell items back to the merchant?
- Should the merchant have a personality or dialogue?
- Is the 3-day stay fixed or can research/upgrades extend it?
