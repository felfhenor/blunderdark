# Blunderdark - GitHub Development Issues

**Total Issues:** 95 (code/development only)
**Format:** Ready for GitHub import

---

## Epic 1: Core Grid & Placement System

### Issue #1: Implement Grid System

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Implement the foundational 20x20 grid system that will serve as the base for all room placement.

**Acceptance Criteria:**

- [ ] Create GridManager class/system
- [ ] 20x20 tile grid per floor
- [ ] Each tile tracks: occupied (bool), room_id (int/null), connection_type
- [ ] Grid renders visually in-game
- [ ] Can select/highlight individual tiles
- [ ] Grid state can be saved/loaded

**Technical Notes:**

- Use array or dictionary for grid storage
- Consider memory optimization for multi-floor
- Grid coordinates: (x, y) from (0,0) to (19,19)

**Dependencies:** None (foundational)

---

### Issue #2: Camera Controls

**Labels:** `enhancement`, `ui`, `priority-high`

**Description:**
Implement camera navigation for viewing the grid and dungeon.

**Acceptance Criteria:**

- [ ] Pan camera with mouse drag or WASD
- [ ] Zoom in/out with mouse wheel
- [ ] Camera bounds (don't go outside grid limits)
- [ ] Smooth camera movement
- [ ] Reset camera button

**Technical Notes:**

- Clamp camera position to grid boundaries
- Consider orthographic vs perspective camera

**Dependencies:** #1 (Grid System)

---

### Issue #3: Tetromino Room Shapes

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Define and implement all tetromino room shapes as data structures.

**Acceptance Criteria:**

- [ ] Create RoomShape class/struct
- [ ] Define shapes: Square 2x2, Square 3x3, Square 4x4, L-shape, T-shape, I-shape
- [ ] Each shape defines which tiles it occupies (relative coordinates)
- [ ] Shapes cannot be rotated
- [ ] Shapes can be serialized for save/load

**Technical Notes:**

- Store shapes as relative tile coordinates: [(0,0), (0,1), (1,0), (1,1)] for 2x2
- Consider using scriptable objects (Unity) or resources (Godot)

**Dependencies:** None (data structure definition)

---

### Issue #4: Room Placement Validation

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Implement validation logic for placing rooms on the grid.

**Acceptance Criteria:**

- [ ] Check if all tiles in room shape are empty
- [ ] Check if placement is within grid bounds
- [ ] Prevent overlapping rooms
- [ ] Visual feedback for valid (green) vs invalid (red) placement
- [ ] Return detailed error messages (why placement failed)

**Technical Notes:**

- Validation runs before committing room placement
- Consider caching valid placement positions for performance

**Dependencies:** #1 (Grid System), #3 (Room Shapes)

---

### Issue #5: Room Placement UI

**Labels:** `enhancement`, `ui`, `priority-high`

**Description:**
Create UI for selecting and placing rooms on the grid.

**Acceptance Criteria:**

- [ ] Room selection menu (shows available room types)
- [ ] Room preview follows mouse cursor
- [ ] Click to place room
- [ ] Escape/right-click to cancel placement
- [ ] Visual representation of room shape on grid

**Technical Notes:**

- Update preview every frame while in placement mode
- Consider highlighting affected tiles

**Dependencies:** #1 (Grid System), #3 (Room Shapes), #4 (Validation)

---

### Issue #6: Room Removal

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Allow players to remove/demolish placed rooms.

**Acceptance Criteria:**

- [ ] Right-click or select room to get removal option
- [ ] Confirmation dialog before removal
- [ ] Return 50% of room cost as refund
- [ ] Clear all tiles occupied by room
- [ ] Reassign inhabitants before removal

**Technical Notes:**

- Validate that Altar cannot be removed
- Handle connected hallways (remove or orphan?)

**Dependencies:** #5 (Room Placement UI), #7 (Resource Manager)

---

## Epic 2: Resource System

### Issue #7: Resource Manager

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Create central resource management system for all currencies.

**Acceptance Criteria:**

- [ ] ResourceManager singleton/static class
- [ ] Track 7 resource types: Crystals, Food, Gold, Flux, Research, Essence, Corruption
- [ ] Add/subtract resources with validation (can't go negative)
- [ ] Resource storage limits (configurable per type)
- [ ] Events/callbacks when resources change
- [ ] Save/load resource state

**Technical Notes:**

- Use dictionary/map for resource storage: {ResourceType: amount}
- Consider overflow handling (max storage)

**Dependencies:** None (foundational)

---

### Issue #8: Time System

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Implement real-time tick system for resource generation and events.

**Acceptance Criteria:**

- [ ] Game time runs in real-time (1 second = 1 game second)
- [ ] Pause functionality
- [ ] Speed controls: 1x, 2x, 4x
- [ ] Time tracking (days, hours, minutes)
- [ ] Time-based event triggers

**Technical Notes:**

- Use delta time for accurate timing
- Consider fixed timestep for deterministic behavior

**Dependencies:** None (foundational)

---

### Issue #9: Production Calculation System

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Build system to calculate resource production from rooms and inhabitants.

**Acceptance Criteria:**

- [ ] Calculate base production per room type
- [ ] Apply inhabitant efficiency bonuses
- [ ] Apply adjacency bonuses
- [ ] Apply conditional modifiers (fear, hunger, time of day)
- [ ] Update production every tick
- [ ] Accumulate resources in ResourceManager

**Technical Notes:**
Formula: `Final Production = Base × (1 + Bonuses) × Modifiers`

- Run production calculations every game tick (1 second)
- Cache calculations where possible

**Dependencies:** #7 (Resource Manager), #8 (Time System)

---

### Issue #10: Resource UI Display

**Labels:** `enhancement`, `ui`, `priority-high`

**Description:**
Create UI to display current resource amounts and production rates.

**Acceptance Criteria:**

- [ ] Resource bar showing all 7 currencies
- [ ] Display current amount and max storage
- [ ] Show production rate per minute (+X/min)
- [ ] Color-coded warnings (low resources = red)
- [ ] Tooltips explaining each resource

**Technical Notes:**

- Update UI every frame or on resource change events
- Consider compact vs expanded view

**Dependencies:** #7 (Resource Manager), #9 (Production Calculation)

---

## Epic 3: Inhabitant System

### Issue #11: Inhabitant Data Model

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Create data structures for all inhabitant types and their stats.

**Acceptance Criteria:**

- [ ] Inhabitant class with properties: name, type, tier, cost, stats
- [ ] Stats: HP, Attack, Defense, Speed, Worker Efficiency, Traits
- [ ] Conditional states: Scared, Hungry, Normal
- [ ] Define all Tier 1 inhabitants (Goblin, Kobold, Skeleton, Myconid, Slime)
- [ ] Serializable for save/load

**Technical Notes:**

- Use scriptable objects (Unity) or resource files (Godot)
- Consider inheritance for shared behavior

**Dependencies:** None (data structure definition)

---

### Issue #12: Inhabitant Roster UI

**Labels:** `enhancement`, `ui`, `priority-high`

**Description:**
Create UI for viewing and managing all recruited inhabitants.

**Acceptance Criteria:**

- [ ] List of all inhabitants (owned)
- [ ] Show inhabitant stats and current assignment
- [ ] Filter by assigned/unassigned
- [ ] Click to view details
- [ ] Reassign inhabitants from roster

**Technical Notes:**

- Consider list vs grid view
- Show visual icons for each inhabitant type

**Dependencies:** #11 (Inhabitant Data Model)

---

### Issue #13: Inhabitant Assignment System

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Allow assigning inhabitants to rooms for production/defense.

**Acceptance Criteria:**

- [ ] Click room to see assignment slots
- [ ] Drag-drop or click to assign inhabitant
- [ ] Respect max inhabitant limits per room
- [ ] Update production when inhabitant assigned
- [ ] Visual indicator of assigned inhabitants in room

**Technical Notes:**

- Each room tracks assigned inhabitants (list/array)
- Validate assignment (room has space, inhabitant not already assigned)

**Dependencies:** #11 (Inhabitant Data Model), #5 (Room Placement UI)

---

### Issue #14: Inhabitant Recruitment System

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Implement system for purchasing/recruiting new inhabitants.

**Acceptance Criteria:**

- [ ] Recruitment UI (shop/altar interface)
- [ ] Show available inhabitant types and costs
- [ ] Purchase with resources (deduct from ResourceManager)
- [ ] Add purchased inhabitant to roster
- [ ] Unlock tier-based availability

**Technical Notes:**

- Tier 1 always available from start
- Tier 2+ requires unlocks

**Dependencies:** #7 (Resource Manager), #11 (Inhabitant Data Model)

---

### Issue #15: Efficiency Calculation

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Calculate production bonuses from assigned inhabitants.

**Acceptance Criteria:**

- [ ] Read inhabitant efficiency traits (e.g., Miner +20%)
- [ ] Apply to room production
- [ ] Stack multiple inhabitants' bonuses
- [ ] Update in real-time when assignment changes

**Technical Notes:**

- Integrate with Production Calculation System (Issue #9)
- Consider multiplicative vs additive stacking

**Dependencies:** #9 (Production Calculation), #11 (Inhabitant Data Model), #13 (Assignment System)

---

## Epic 4: Room Connection System

### Issue #16: Adjacency Detection

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Detect when two rooms share an edge on the grid.

**Acceptance Criteria:**

- [ ] Check if rooms share at least 1 edge tile
- [ ] Corner touching does NOT count as adjacent
- [ ] Return list of adjacent rooms for any given room
- [ ] Update adjacency when rooms placed/removed

**Technical Notes:**

- Edge sharing: two tiles at (x,y) and (x+1,y) or (x,y+1)
- Cache adjacency data for performance

**Dependencies:** #1 (Grid System), #5 (Room Placement)

---

### Issue #17: Direct Adjacency Connection

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Allow connecting adjacent rooms directly without hallways.

**Acceptance Criteria:**

- [ ] UI button: "Connect to adjacent room"
- [ ] Creates logical connection (no cost)
- [ ] Visual indicator (doorway icon)
- [ ] Enables adjacency bonuses
- [ ] Can disconnect if needed

**Technical Notes:**

- Store connections in each room's data
- Bidirectional connection (Room A ↔ Room B)

**Dependencies:** #16 (Adjacency Detection)

---

### Issue #18: Hallway Pathfinding

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Implement pathfinding for hallway placement between rooms.

**Acceptance Criteria:**

- [ ] A\* or Dijkstra pathfinding on grid
- [ ] Path from room A to room B
- [ ] Path avoids occupied tiles
- [ ] Can handle corners/turns
- [ ] Optimize for shortest path

**Technical Notes:**

- Use grid tiles as nodes
- Consider Manhattan distance heuristic for A\*

**Dependencies:** #1 (Grid System)

---

### Issue #19: Hallway Placement Tool

**Labels:** `enhancement`, `ui`, `priority-high`

**Description:**
UI tool for placing hallways to connect rooms.

**Acceptance Criteria:**

- [ ] Select "Build Hallway" mode
- [ ] Click room A, then room B
- [ ] Show preview of hallway path
- [ ] Display cost (5 Crystals per tile)
- [ ] Confirm to build or cancel

**Technical Notes:**

- Auto-calculate path using Issue #18
- Allow manual path editing (stretch goal)

**Dependencies:** #18 (Hallway Pathfinding), #7 (Resource Manager)

---

### Issue #20: Hallway Data Structure

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Create data structure to store hallway information.

**Acceptance Criteria:**

- [ ] Hallway class with: start_room, end_room, path (list of tiles)
- [ ] Track which tiles belong to hallway
- [ ] Store upgrades/features applied to hallway
- [ ] Serializable for save/load

**Technical Notes:**

- Hallways occupy grid tiles like rooms
- Multiple hallways can connect the same room

**Dependencies:** #1 (Grid System)

---

### Issue #21: Connection Cost System

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Calculate and charge costs for building hallways.

**Acceptance Criteria:**

- [ ] 5 Crystals per hallway tile
- [ ] Deduct from ResourceManager on confirm
- [ ] Prevent building if insufficient resources
- [ ] Show cost preview before confirming

**Technical Notes:**

- Cost = path length × 5 Crystals
- Direct adjacency = free

**Dependencies:** #7 (Resource Manager), #19 (Hallway Placement Tool)

---

## Epic 5: Room Synergies & Bonuses

### Issue #22: Adjacency Bonus System

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Implement adjacency-based production bonuses between rooms.

**Acceptance Criteria:**

- [ ] Define adjacency bonuses per room type pair
- [ ] Detect when bonus applies (rooms adjacent + connected)
- [ ] Apply bonus to production calculations
- [ ] Bonuses stack if multiple adjacent rooms

**Examples:**

- Mine + Forge = +30% production
- Grove + Lake = +40% production

**Dependencies:** #9 (Production Calculation), #16 (Adjacency Detection), #17 (Direct Connection)

---

### Issue #23: Synergy Detection Logic

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Automatically detect and apply synergies between rooms/inhabitants.

**Acceptance Criteria:**

- [ ] Check all rooms for synergy conditions
- [ ] Apply bonuses when conditions met
- [ ] Update when rooms/inhabitants change
- [ ] Track active synergies per room

**Technical Notes:**

- Run synergy check on room placement, inhabitant assignment, connection changes
- Cache results to avoid recalculating every frame

**Dependencies:** #9 (Production Calculation), #13 (Inhabitant Assignment), #22 (Adjacency Bonuses)

---

### Issue #24: Synergy Tooltip System

**Labels:** `enhancement`, `ui`, `priority-medium`

**Description:**
Show players which synergies are active and why.

**Acceptance Criteria:**

- [ ] Hover over room to see active synergies
- [ ] Tooltip explains bonus source (e.g., "Adjacent to Forge: +30%")
- [ ] Show potential synergies (what could be added)
- [ ] Color-code: active (green), potential (yellow)

**Dependencies:** #23 (Synergy Detection)

---

### Issue #25: Conditional Production Modifiers

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Apply production modifiers based on game state (time, fear, hunger, etc.).

**Acceptance Criteria:**

- [ ] Time-of-day modifiers (day/night)
- [ ] Fear modifiers (scared inhabitants)
- [ ] Hunger modifiers (hungry inhabitants)
- [ ] Floor depth modifiers
- [ ] Biome modifiers

**Technical Notes:**

- Modifiers applied after base + bonuses in production formula
- Stack multiplicatively

**Dependencies:** #9 (Production Calculation)

---

## Epic 6: Tier 1 Rooms Implementation

### Issue #26: Crystal Mine Room

**Labels:** `enhancement`, `content`, `priority-high`

**Description:**
Implement Crystal Mine room with all functionality.

**Acceptance Criteria:**

- [ ] L-shaped room
- [ ] Base production: 5 Crystals/min
- [ ] Max 2 inhabitants (upgradeable to 4)
- [ ] Low fear level
- [ ] 3 upgrade paths implemented
- [ ] Adjacency bonuses (Mine+Mine, Mine+Forge, Mine+Library)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #9 (Production Calculation)

---

### Issue #27: Mushroom Grove Room

**Labels:** `enhancement`, `content`, `priority-high`

**Description:**
Implement Mushroom Grove room with all functionality.

**Acceptance Criteria:**

- [ ] T-shaped room
- [ ] Base production: 8 Food/min
- [ ] Max 3 inhabitants (upgradeable to 5)
- [ ] Low fear level (can be removed with upgrade)
- [ ] 3 upgrade paths implemented
- [ ] Adjacency bonuses (Grove+Water, Grove+Dark rooms)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #9 (Production Calculation)

---

### Issue #28: Shadow Library Room

**Labels:** `enhancement`, `content`, `priority-high`

**Description:**
Implement Shadow Library room with all functionality.

**Acceptance Criteria:**

- [ ] L-shaped room
- [ ] Base production: 3 Research/min
- [ ] Max 1 inhabitant (upgradeable to 3)
- [ ] Medium fear level
- [ ] 3 upgrade paths implemented
- [ ] Adjacency bonuses implemented

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #9 (Production Calculation)

---

### Issue #29: Spawning Pool Room

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Spawning Pool room with breeding functionality.

**Acceptance Criteria:**

- [ ] Square 2x2 room
- [ ] Spawns 1 basic inhabitant every 5 minutes
- [ ] Max 2 inhabitants (upgradeable to 4)
- [ ] Low fear level (upgradeable to High)
- [ ] 2 upgrade paths implemented
- [ ] Adjacency bonuses implemented

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #8 (Time System), #11 (Inhabitant Data)

---

### Issue #30: Soul Well Room

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Soul Well room with necromancy mechanics.

**Acceptance Criteria:**

- [ ] Square 3x3 room
- [ ] Produces 1 Skeleton every 3 min OR converts Corruption to Essence
- [ ] Max 2 inhabitants (upgradeable to 3)
- [ ] High fear level
- [ ] 2 upgrade paths implemented
- [ ] Adjacency effects (spreads Corruption, synergies)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #8 (Time System), #11 (Inhabitant Data)

---

### Issue #31: Altar Room (Default)

**Labels:** `enhancement`, `content`, `priority-critical`

**Description:**
Implement the Altar room (unique, auto-placed).

**Acceptance Criteria:**

- [ ] Square 3x3 room
- [ ] Auto-placed on game start
- [ ] Cannot be removed
- [ ] Enables room placement and recruitment
- [ ] Upgrade system (Level 2, Level 3)
- [ ] Reduces fear in adjacent rooms

**Dependencies:** #3 (Room Shapes), #5 (Room Placement)

---

### Issue #32: Room Upgrade System

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Create system for upgrading rooms with branching choices.

**Acceptance Criteria:**

- [ ] Upgrade UI for each room
- [ ] Show available upgrades and costs
- [ ] Mutually exclusive choices (choosing one locks out others)
- [ ] Upgrade tiers (Tier 1 upgrades unlock Tier 2)
- [ ] Apply upgrade effects immediately
- [ ] Visual indication of upgraded rooms

**Technical Notes:**

- Store chosen upgrades in room data
- Validate upgrade prerequisites

**Dependencies:** #5 (Room Placement), #7 (Resource Manager)

---

## Epic 7: Fear & Hunger Systems

### Issue #33: Fear Level Tracking

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Implement fear level tracking for each room.

**Acceptance Criteria:**

- [ ] Fear levels: None, Low, Medium, High, Very High
- [ ] Each room has base fear level
- [ ] Inhabitants can modify fear (e.g., Skeleton +1, Dryad -2)
- [ ] Fear displays in room UI

**Technical Notes:**

- Fear is an integer (0-4) or enum
- Base fear + inhabitant modifiers = total fear

**Dependencies:** #5 (Room Placement), #11 (Inhabitant Data)

---

### Issue #34: Fear Propagation

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Fear spreads from high-fear rooms to adjacent rooms.

**Acceptance Criteria:**

- [ ] High fear rooms affect adjacent rooms
- [ ] Propagation distance (1 tile for most, farther for Medusa)
- [ ] Adjacent rooms' fear increases based on source
- [ ] Update propagation when rooms/inhabitants change

**Technical Notes:**

- Check all adjacent rooms when calculating fear
- Some creatures (Medusa) affect rooms within 2-3 tile radius

**Dependencies:** #16 (Adjacency Detection), #33 (Fear Tracking)

---

### Issue #35: Hunger System

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Inhabitants consume food over time and become hungry.

**Acceptance Criteria:**

- [ ] Each inhabitant has food consumption rate (per hour/day)
- [ ] Auto-deduct food from ResourceManager
- [ ] Track hunger state per inhabitant (fed, hungry, starving)
- [ ] Hungry state triggers production penalties
- [ ] Some inhabitants don't eat (Inappetent trait)

**Technical Notes:**

- Check food consumption every game hour
- If insufficient food, mark inhabitants as hungry

**Dependencies:** #7 (Resource Manager), #8 (Time System), #11 (Inhabitant Data)

---

### Issue #36: Fear/Hunger UI Indicators

**Labels:** `enhancement`, `ui`, `priority-medium`

**Description:**
Visual feedback for fear levels and hunger status.

**Acceptance Criteria:**

- [ ] Fear icon on rooms (color-coded by level)
- [ ] Hunger icon on inhabitants (red = hungry)
- [ ] Tooltip explains fear/hunger effects
- [ ] Warning when food running low

**Dependencies:** #33 (Fear Tracking), #35 (Hunger System)

---

### Issue #37: Conditional State Modifiers

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Apply production/combat modifiers based on inhabitant states.

**Acceptance Criteria:**

- [ ] Scared state: Apply per-creature scared effects
- [ ] Hungry state: Apply per-creature hungry effects
- [ ] Normal state: No modifiers
- [ ] Effects apply to production and combat

**Examples:**

- Kobold scared: Eats 2x food, +10% production
- Goblin hungry: -50% production

**Dependencies:** #9 (Production Calculation), #33 (Fear Tracking), #35 (Hunger System)

---

## Epic 8: Day/Night Cycle

### Issue #38: Time of Day System

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Implement 24-hour day/night cycle.

**Acceptance Criteria:**

- [ ] 24-hour cycle (configurable speed)
- [ ] Day = 12 hours, Night = 12 hours
- [ ] Twilight transitions (1 hour each)
- [ ] Current time displayed in UI
- [ ] Events trigger at specific times

**Technical Notes:**

- 1 real minute = 1 game hour (adjustable)
- Track current hour (0-23)

**Dependencies:** #8 (Time System)

---

### Issue #39: Day/Night Production Modifiers

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Apply time-of-day bonuses/penalties to production.

**Acceptance Criteria:**

- [ ] Day: Food +25%, Undead -10%
- [ ] Night: Undead +30%, Corruption generation +50%
- [ ] Twilight: Flux generation +100%
- [ ] Modifiers apply automatically based on time

**Technical Notes:**

- Check current time when calculating production
- Update modifiers at time transitions

**Dependencies:** #9 (Production Calculation), #38 (Time of Day)

---

### Issue #40: Visual Time Indicators

**Labels:** `enhancement`, `ui`, `priority-medium`

**Description:**
Visual representation of current time of day.

**Acceptance Criteria:**

- [ ] Clock UI showing current hour
- [ ] Background/lighting changes (day=bright, night=dark)
- [ ] Sun/moon icon
- [ ] Time speed indicator (1x, 2x, 4x)

**Dependencies:** #38 (Time of Day)

---

## Epic 9: Basic Invasion System

### Issue #41: Turn-Based Invasion Mode

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Implement turn-based combat mode during invasions.

**Acceptance Criteria:**

- [ ] Pause normal gameplay when invasion starts
- [ ] Turn order: Initiative based on Speed stat
- [ ] Invaders and defenders take turns
- [ ] Actions: Move, Attack, Use Ability
- [ ] Combat ends when one side defeated/retreats

**Technical Notes:**

- Queue-based turn system
- Each unit gets one action per turn

**Dependencies:** #11 (Inhabitant Data Model for combat stats)

---

### Issue #42: Invader Pathfinding

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Invaders pathfind toward their objective (Altar).

**Acceptance Criteria:**

- [ ] A\* pathfinding from spawn to Altar
- [ ] Move through hallways and connected rooms
- [ ] Avoid high-fear rooms if possible (morale check)
- [ ] Detour for secondary objectives (Vault, Throne)
- [ ] Recalculate path if blocked

**Technical Notes:**

- Use connection graph (rooms + hallways as nodes)
- Weighted pathfinding (fear = higher cost)

**Dependencies:** #18 (Hallway Pathfinding), #17 (Room Connections), #33 (Fear System)

---

### Issue #43: Basic Combat Resolution

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Resolve combat between defenders and invaders.

**Acceptance Criteria:**

- [ ] Attack roll: d20 + Attack stat
- [ ] Damage calculation: (Attack - Defense)
- [ ] HP reduction on hit
- [ ] Death when HP reaches 0
- [ ] Visual feedback (damage numbers, health bars)

**Technical Notes:**

- Simple damage formula for MVP
- Add special abilities later

**Dependencies:** #11 (Inhabitant Data Model), #41 (Turn-Based Mode)

---

### Issue #44: Invasion Trigger System

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Trigger invasions automatically based on time and conditions.

**Acceptance Criteria:**

- [ ] First invasion after Day 30 (grace period)
- [ ] Schedule invasions based on day count
- [ ] Frequency increases over time
- [ ] Trigger special invasions (events, reputation)
- [ ] Warning before invasion starts (2 minutes)

**Technical Notes:**

- Track days since last invasion
- Random variance in invasion timing (±2 days)

**Dependencies:** #8 (Time System)

---

### Issue #45: Invasion Win/Loss Conditions

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Determine victory or defeat for invasions.

**Acceptance Criteria:**

- [ ] Defenders win: All invaders killed or retreated
- [ ] Invaders win: Altar destroyed OR 2 secondary objectives complete
- [ ] Turn limit: 30 turns (defenders win if invaders don't reach objective)
- [ ] Display results screen after invasion

**Technical Notes:**

- Track objectives completion
- Handle partial victories (some rooms sacked but invasion failed)

**Dependencies:** #41 (Turn-Based Mode), #43 (Combat Resolution)

---

## Epic 10: Multi-Floor System

### Issue #46: Floor Creation System

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Allow creating multiple floors for vertical dungeon expansion.

**Acceptance Criteria:**

- [ ] Create new floor (costs resources)
- [ ] Max 10 floors
- [ ] Each floor has own 20x20 grid
- [ ] Each floor tracks its depth (1-10)
- [ ] Floor depth affects bonuses/penalties

**Technical Notes:**

- Store floors in array/list
- Each floor is independent GridManager instance

**Dependencies:** #1 (Grid System), #7 (Resource Manager)

---

### Issue #47: Floor Navigation UI

**Labels:** `enhancement`, `ui`, `priority-high`

**Description:**
UI for switching between floors.

**Acceptance Criteria:**

- [ ] Floor selector (dropdown or buttons)
- [ ] Show current floor number
- [ ] Minimap showing all floors
- [ ] Keyboard shortcuts (Page Up/Down to change floors)

**Technical Notes:**

- Only render current floor for performance
- Show connections to adjacent floors

**Dependencies:** #46 (Floor Creation)

---

### Issue #48: Vertical Connections (Stairs)

**Labels:** `enhancement`, `content`, `priority-high`

**Description:**
Implement stairs to connect adjacent floors.

**Acceptance Criteria:**

- [ ] Stairs room/feature (occupies 1 tile)
- [ ] Connects floor N to floor N+1 or N-1
- [ ] Cost: 20 Crystals
- [ ] Inhabitants/resources can move between floors
- [ ] Visual indicator on both floors

**Technical Notes:**

- Stairs must be placed on same grid coordinates on both floors
- Bidirectional connection

**Dependencies:** #46 (Floor Creation), #7 (Resource Manager)

---

### Issue #49: Vertical Connections (Elevators & Portals)

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement elevators and portals for multi-floor transport.

**Acceptance Criteria:**

- [ ] Elevator: Connects 2+ floors, fast travel, costs 50 Crystals + 20 Flux
- [ ] Portal: Connects any floors, instant travel, costs 100 Flux + 30 Essence
- [ ] Visual indicators showing connections

**Technical Notes:**

- Elevators are vertical hallways
- Portals can link non-adjacent floors

**Dependencies:** #46 (Floor Creation), #7 (Resource Manager)

---

### Issue #50: Floor Depth Modifiers

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Apply bonuses/penalties based on floor depth.

**Acceptance Criteria:**

- [ ] Floor 1: +20% Food, -10% Corruption
- [ ] Floors 2-3: No modifiers
- [ ] Floors 4-6: +10% Crystal/Gold per floor, +5% Corruption/floor, -15% Food
- [ ] Floors 7-9: +20% Crystal/Gold per floor, +10% Corruption/floor, -30% Food
- [ ] Floor 10+: +50% rare resources, -50% Food

**Dependencies:** #9 (Production Calculation), #46 (Floor Creation)

---

## Epic 11: Floor Biomes

### Issue #51: Biome System

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Implement biome types that affect floor properties.

**Acceptance Criteria:**

- [ ] 5 biome types: Volcanic, Flooded, Crystal, Corrupted, Fungal
- [ ] Each floor can have one biome (or neutral)
- [ ] Biome set on floor creation (random or chosen)
- [ ] Biomes stored in floor data

**Dependencies:** #46 (Floor Creation)

---

### Issue #52: Biome Restrictions

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Certain rooms cannot be placed in certain biomes.

**Acceptance Criteria:**

- [ ] Volcanic: Cannot build Underground Lake or Mushroom Grove
- [ ] Flooded: Cannot build Soul Well or Torture Chamber
- [ ] Crystal Cave: Max 5 Crystal Mines per floor
- [ ] Corrupted: Cannot build pure/harmony rooms
- [ ] Validation when placing rooms

**Dependencies:** #4 (Room Placement Validation), #51 (Biome System)

---

### Issue #53: Biome Bonuses

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Biomes provide production bonuses to specific room types.

**Acceptance Criteria:**

- [ ] Volcanic: Forges +50% efficiency
- [ ] Flooded: Lakes +50% production
- [ ] Crystal Cave: Mines +40% output
- [ ] Corrupted: Dark rooms +100% Corruption
- [ ] Fungal: Groves +60% output

**Dependencies:** #9 (Production Calculation), #51 (Biome System)

---

## Epic 12: Corruption System

### Issue #54: Corruption Resource

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Add Corruption as a tracked resource with unique properties.

**Acceptance Criteria:**

- [ ] Corruption tracked in ResourceManager
- [ ] Generated by dark rooms and creatures
- [ ] Can be spent on dark upgrades/features
- [ ] High Corruption triggers effects (mutations, invasions)
- [ ] Display in resource UI (with warning if high)

**Dependencies:** #7 (Resource Manager), #10 (Resource UI)

---

### Issue #55: Corruption Generation

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Rooms and inhabitants generate Corruption over time.

**Acceptance Criteria:**

- [ ] Soul Well: +2 Corruption/min
- [ ] Torture Chamber: +3 Corruption/min
- [ ] Skeleton: +1 Corruption/min when stationed
- [ ] Demon Lord: +10 Corruption/min
- [ ] Corruption accumulates automatically

**Dependencies:** #9 (Production Calculation), #54 (Corruption Resource)

---

### Issue #56: Corruption Effects

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
High Corruption causes random mutations and events.

**Acceptance Criteria:**

- [ ] At 50 Corruption: Unlock dark upgrades
- [ ] At 100 Corruption: Random mutations (inhabitants gain/lose traits)
- [ ] At 200 Corruption: Trigger Crusade invasion event
- [ ] Visual corruption effects on dungeon

**Technical Notes:**

- Mutations should be balanced (not always beneficial)
- Crusade is very difficult invasion

**Dependencies:** #54 (Corruption Resource), #44 (Invasion Triggers)

---

### Issue #57: Corruption Threshold Triggers

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Specific events trigger at Corruption milestones.

**Acceptance Criteria:**

- [ ] Check Corruption level every game hour
- [ ] Trigger appropriate events at thresholds
- [ ] Warning messages before major thresholds
- [ ] Can reduce Corruption to avoid events (Dryad, purification)

**Dependencies:** #54 (Corruption Resource), #56 (Corruption Effects)

---

## Epic 13: Tier 2 Rooms

### Issue #58: Dark Forge Room

**Labels:** `enhancement`, `content`, `priority-high`

**Description:**
Implement Dark Forge room with crafting mechanics.

**Acceptance Criteria:**

- [ ] Square 2x2 room
- [ ] Converts resources to equipment/upgrades
- [ ] Max 2 inhabitants (upgradeable to 4)
- [ ] Medium fear level
- [ ] Crafting options implemented
- [ ] Adjacency bonuses (Mine, Training Grounds, Trap Workshop)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #7 (Resource Manager)

---

### Issue #59: Alchemy Lab Room

**Labels:** `enhancement`, `content`, `priority-high`

**Description:**
Implement Alchemy Lab with resource conversion.

**Acceptance Criteria:**

- [ ] L-shaped room
- [ ] Base conversion: 5 Crystals + 5 Food = 1 Flux
- [ ] Max 1 inhabitant (upgradeable to 3)
- [ ] Medium fear level
- [ ] Upgrade paths implemented
- [ ] Adjacency bonuses implemented

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #7 (Resource Manager)

---

### Issue #60: Training Grounds Room

**Labels:** `enhancement`, `content`, `priority-high`

**Description:**
Implement Training Grounds for combat preparation.

**Acceptance Criteria:**

- [ ] T-shaped room
- [ ] Trains inhabitants for combat (+1 defense level)
- [ ] Max 4 inhabitants (upgradeable to 6)
- [ ] Low fear level
- [ ] Training mechanics implemented
- [ ] Adjacency bonuses (Barracks, Forge, Altar)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #11 (Inhabitant Data)

---

### Issue #61: Barracks Room

**Labels:** `enhancement`, `content`, `priority-high`

**Description:**
Implement Barracks for housing defenders.

**Acceptance Criteria:**

- [ ] I-shaped (1x4) room
- [ ] Houses combat units (6-10 max)
- [ ] Low fear level (can be removed)
- [ ] Provides defense rating
- [ ] Upgrade paths implemented
- [ ] Adjacency bonuses (Training Grounds, Trap Workshop)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #11 (Inhabitant Data)

---

### Issue #62: Summoning Circle Room

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Summoning Circle for creature summoning.

**Acceptance Criteria:**

- [ ] L-shaped room
- [ ] Summons rare inhabitants and temporary helpers
- [ ] Max 1 inhabitant (upgradeable to 2)
- [ ] High fear level
- [ ] Summoning mechanics implemented
- [ ] Adjacency bonuses (Library, Soul Well)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #7 (Resource Manager), #11 (Inhabitant Data)

---

### Issue #63: Treasure Vault Room

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Treasure Vault for gold storage.

**Acceptance Criteria:**

- [ ] Square 3x3 room
- [ ] +50% Gold storage capacity
- [ ] Generates passive Gold
- [ ] Max 1 inhabitant (upgradeable to 2)
- [ ] Medium fear (Mimic risk)
- [ ] Upgrade paths implemented
- [ ] Adjacency bonuses (Altar, Trap Workshop)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #7 (Resource Manager)

---

### Issue #64: Underground Lake Room

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Underground Lake biome room.

**Acceptance Criteria:**

- [ ] T-shaped (3x3) room
- [ ] Generates 5 Food/min (fish)
- [ ] Provides humidity to adjacent rooms (+20% production)
- [ ] Max 3 inhabitants (upgradeable to 5)
- [ ] No fear (upgradeable to Low)
- [ ] Upgrade paths implemented
- [ ] Adjacency bonuses (Mushroom Grove, Alchemy Lab)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #9 (Production Calculation)

---

### Issue #65: Trap Workshop Room

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Trap Workshop for creating traps.

**Acceptance Criteria:**

- [ ] Square 2x2 room
- [ ] Creates traps for hallways and rooms
- [ ] Max 2 inhabitants (upgradeable to 4)
- [ ] Medium fear level
- [ ] Trap crafting mechanics implemented
- [ ] Adjacency bonuses (Forge, Alchemy Lab, Summoning Circle)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #7 (Resource Manager)

---

### Issue #66: Torture Chamber Room

**Labels:** `enhancement`, `content`, `priority-low`

**Description:**
Implement Torture Chamber for dark conversion.

**Acceptance Criteria:**

- [ ] L-shaped room
- [ ] Extracts information, converts prisoners, generates Corruption
- [ ] Max 1 inhabitant (upgradeable to 2)
- [ ] Very High fear level
- [ ] Upgrade paths implemented
- [ ] Adjacency effects (spreads Corruption and Fear)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #54 (Corruption System)

---

## Epic 14: Tier 2 Inhabitants

### Issue #67: Stone Elemental Inhabitant

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Stone Elemental with geological traits.

**Acceptance Criteria:**

- [ ] Stats defined (HP, Attack, Defense, Speed)
- [ ] Traits: Inappetent, Geological (+40% mining), Sturdy (+1 Defense)
- [ ] Scared/Hungry behaviors defined
- [ ] Special interactions (Mines, Forges, Ley Lines)
- [ ] Fusion options defined

**Dependencies:** #11 (Inhabitant Data Model)

---

### Issue #68: Wraith Inhabitant

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Wraith with incorporeal abilities.

**Acceptance Criteria:**

- [ ] Stats defined
- [ ] Traits: Inappetent, Fearless, Terrifying (+2 Fear), Intangible
- [ ] Scholar trait (+20% Research)
- [ ] Scared/Hungry behaviors defined
- [ ] Special interactions (Libraries, Soul Wells, Night bonus)
- [ ] Fusion options defined

**Dependencies:** #11 (Inhabitant Data Model)

---

### Issue #69: Lich Inhabitant

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Lich with necromancy mastery.

**Acceptance Criteria:**

- [ ] Stats defined
- [ ] Traits: Scholarly (+40% Research), Undead Master, Fearless, Ancient Knowledge
- [ ] Scared/Hungry behaviors defined
- [ ] Special interactions (Throne Room, Soul Well, Library)
- [ ] Fusion options defined

**Dependencies:** #11 (Inhabitant Data Model)

---

### Issue #70: Orc Inhabitant

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Orc with warrior traits.

**Acceptance Criteria:**

- [ ] Stats defined (high combat stats)
- [ ] Traits: Warrior (+30% Training), Intimidating (+1 Fear), Strong, Aggressive
- [ ] Scared (Berserk) and Hungry (Grumpy) behaviors
- [ ] Special interactions (Barracks, Forge, War Bands)
- [ ] Fusion options defined

**Dependencies:** #11 (Inhabitant Data Model)

---

### Issue #71: Mimic Inhabitant

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Mimic with shapeshifting abilities.

**Acceptance Criteria:**

- [ ] Stats defined
- [ ] Traits: Shapeshifter, Treasure Guardian (+2 Defense in Vault), Versatile (80% efficiency anywhere)
- [ ] Scared/Hungry behaviors defined
- [ ] Special interactions (Treasure Vault, trap mechanics)
- [ ] Fusion options defined

**Dependencies:** #11 (Inhabitant Data Model)

---

### Issue #72: Additional Tier 2 Inhabitants

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement remaining Tier 2 inhabitants: Dryad, Gargoyle, Imp.

**Acceptance Criteria:**

- [ ] Dryad: Nature/purification traits
- [ ] Gargoyle: Stone form, defensive, architectural
- [ ] Imp: Mischievous, fire-starter, corruptor
- [ ] All stats and traits defined
- [ ] Scared/Hungry behaviors for each
- [ ] Special interactions defined
- [ ] Fusion options defined

**Dependencies:** #11 (Inhabitant Data Model)

---

## Epic 15: Research System

### Issue #73: Research Tree Data Structure

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Create research tree with nodes and dependencies.

**Acceptance Criteria:**

- [ ] Research nodes: name, description, cost, prerequisites, unlocks
- [ ] 3 branches: Dark, Arcane, Engineering
- [ ] Each branch has 10-15 research nodes
- [ ] Tree structure (parent-child relationships)
- [ ] Serializable for save/load

**Technical Notes:**

- Use graph structure
- Some nodes require multiple prerequisites

**Dependencies:** #7 (Resource Manager)

---

### Issue #74: Research UI

**Labels:** `enhancement`, `ui`, `priority-high`

**Description:**
UI for viewing and selecting research projects.

**Acceptance Criteria:**

- [ ] Research tree visualization (node graph)
- [ ] Show available vs locked research
- [ ] Display costs and prerequisites
- [ ] Click to start research
- [ ] Progress bar for active research

**Technical Notes:**

- Consider tech tree style UI (Civilization-like)
- Visual lines connecting prerequisites

**Dependencies:** #73 (Research Tree Data)

---

### Issue #75: Research Progress System

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Track research progress over time.

**Acceptance Criteria:**

- [ ] Start research (deduct Research resource)
- [ ] Research takes time (hours/days)
- [ ] Only one active research at a time
- [ ] Complete research: unlock effect
- [ ] Can cancel research (lose progress)

**Technical Notes:**

- Some research is instant, some takes days
- Research speed can be modified (Library upgrades)

**Dependencies:** #7 (Resource Manager), #8 (Time System), #73 (Research Tree Data)

---

### Issue #76: Research Unlocks

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Research unlocks rooms, inhabitants, features, etc.

**Acceptance Criteria:**

- [ ] Define unlock effects per research node
- [ ] Apply unlocks when research completes
- [ ] Show newly unlocked content in UI
- [ ] Track which research is completed

**Examples:**

- "Dark Arts I" → Unlock Soul Well room
- "Advanced Manufacturing" → Unlock Dark Forge

**Dependencies:** #75 (Research Progress)

---

## Epic 16: Seasonal Events

### Issue #77: Seasonal Cycle System

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Implement 7-day seasonal cycle.

**Acceptance Criteria:**

- [ ] 4 seasons: Growth, Harvest, Darkness, Storms
- [ ] Each season lasts 7 game days
- [ ] Cycle repeats automatically
- [ ] Current season displayed in UI
- [ ] Events trigger during specific seasons

**Dependencies:** #8 (Time System)

---

### Issue #78: Season-Specific Bonuses

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Each season provides unique bonuses/penalties.

**Acceptance Criteria:**

- [ ] Growth: +50% Food production, -25% recruitment costs
- [ ] Harvest: +20% all production, merchant visits
- [ ] Darkness: +100% Corruption generation, +50% dark creatures
- [ ] Storms: +80% Flux generation, random events

**Dependencies:** #9 (Production Calculation), #77 (Seasonal Cycle)

---

### Issue #79: Seasonal Events

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Random events spawn during seasons.

**Acceptance Criteria:**

- [ ] Define 10-15 seasonal events
- [ ] Events trigger randomly during appropriate season
- [ ] Events have effects (bonuses, challenges, choices)
- [ ] Event notifications pop up in UI

**Examples:**

- Growth: "Bumper Crop" (+50 Food instantly)
- Darkness: "Demonic Visitor" (can recruit rare demon)

**Dependencies:** #77 (Seasonal Cycle), #8 (Time System)

---

### Issue #80: Merchant System

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Traveling merchants visit during Harvest season.

**Acceptance Criteria:**

- [ ] Merchant appears during Harvest
- [ ] Offers resource trades (buy/sell)
- [ ] Offers rare items (blueprints, features)
- [ ] Merchant UI for transactions
- [ ] Merchant leaves after 3 days

**Dependencies:** #7 (Resource Manager), #77 (Seasonal Cycle)

---

## Epic 17: Combat Expansion

### Issue #81: Multiple Invader Types

**Labels:** `enhancement`, `content`, `priority-high`

**Description:**
Add variety of invader classes with different stats/abilities.

**Acceptance Criteria:**

- [ ] 5+ invader classes: Warrior, Rogue, Mage, Cleric, Paladin, Ranger
- [ ] Each has unique stats (HP, Attack, Defense, Speed)
- [ ] Each has special abilities (Rogue disarms traps, Cleric heals)
- [ ] Invader composition varies based on dungeon profile

**Dependencies:** #43 (Combat Resolution)

---

### Issue #82: Invasion Composition Logic

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Determine invader party composition based on dungeon state.

**Acceptance Criteria:**

- [ ] High Corruption → More Paladins/Clerics
- [ ] High Wealth → More Rogues/Thieves
- [ ] High Knowledge → More Mages
- [ ] Balanced dungeon → Mixed party
- [ ] Party size scales with dungeon size (3-15 invaders)

**Dependencies:** #44 (Invasion Triggers), #54 (Corruption), #81 (Invader Types)

---

### Issue #83: Morale System

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Invaders have morale that affects their willingness to fight.

**Acceptance Criteria:**

- [ ] Invaders start with 100 morale
- [ ] Lose morale: Ally killed (-10), Trap triggered (-5), High fear room (-15)
- [ ] Gain morale: Room captured (+10)
- [ ] At 0 morale: Invaders retreat
- [ ] Display morale bar for invader party

**Dependencies:** #41 (Turn-Based Mode), #33 (Fear System)

---

### Issue #84: Special Combat Abilities

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Implement unique combat abilities for defenders.

**Acceptance Criteria:**

- [ ] Medusa: Petrifying Gaze (10% chance to petrify per turn)
- [ ] Dragon: Breath Weapon (AOE damage, 3-turn cooldown)
- [ ] Lich: Spell casting (Death Bolt, Raise Dead, Shield)
- [ ] Wraith: Intangible (50% evade physical attacks)
- [ ] Orc: Berserk Rage (+100% attack when below 50% HP)

**Dependencies:** #43 (Combat Resolution), #11 (Inhabitant Data)

---

### Issue #85: Trap System

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Implement hallway trap placement and triggering.

**Acceptance Criteria:**

- [ ] Trap placement in hallways
- [ ] 5+ trap types (Pit, Arrow, Rune, Magic, Fear Glyph)
- [ ] Trap trigger logic during invasions
- [ ] Trap effects (damage, slow, fear)
- [ ] Traps have durability/charges
- [ ] Trap crafting in Trap Workshop

**Dependencies:** #19 (Hallway Placement), #42 (Invader Pathfinding), #65 (Trap Workshop)

---

### Issue #86: Invasion Objectives System

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Invasions have primary and secondary objectives.

**Acceptance Criteria:**

- [ ] Primary objective: Destroy Altar (always)
- [ ] 2 random secondary objectives per invasion
- [ ] Objective types: Slay Monster, Rescue Prisoner, Steal Treasure, Seal Portal, etc.
- [ ] Track objective completion
- [ ] Victory conditions based on objectives

**Dependencies:** #45 (Win/Loss Conditions)

---

### Issue #87: Invasion Rewards System

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Rewards for successful defense, consequences for failure.

**Acceptance Criteria:**

- [ ] Successful defense: Reputation bonus, looted equipment, prisoners, experience
- [ ] Failed defense: Room damage, resource loss, Altar rebuild
- [ ] Prisoner handling: Execute, ransom, convert, sacrifice, experiment
- [ ] Equipment crafting from looted items

**Dependencies:** #45 (Win/Loss Conditions), #7 (Resource Manager)

---

## Epic 18: Tier 3 Content

### Issue #88: Ley Line Nexus Room

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Ley Line Nexus for magic amplification.

**Acceptance Criteria:**

- [ ] T-shaped (3x4) room
- [ ] Generates 10 Flux/min
- [ ] Amplifies magic in range (+30% to magic rooms within 3 spaces)
- [ ] Max 2 inhabitants (upgradeable to 3)
- [ ] Medium fear level
- [ ] Upgrade paths implemented
- [ ] Can only be placed on floors with ley line convergence

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #46 (Multi-Floor)

---

### Issue #89: Throne Room

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Throne Room for leadership bonuses.

**Acceptance Criteria:**

- [ ] Square 4x4 room (Unique)
- [ ] Max 1 inhabitant (must be Unique creature)
- [ ] Provides dungeon-wide bonuses based on seated ruler
- [ ] Variable fear (depends on ruler)
- [ ] Upgrade paths implemented
- [ ] Adjacency bonuses (Vault, central placement)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement)

---

### Issue #90: Breeding Pits Room

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement Breeding Pits for advanced creature creation.

**Acceptance Criteria:**

- [ ] Square 3x3 room
- [ ] Creates hybrid creatures, mutation experimentation
- [ ] Max 4 inhabitants (upgradeable to 6)
- [ ] High fear level
- [ ] Upgrade paths implemented
- [ ] Adjacency bonuses (Spawning Pool, Corruption, Library)

**Dependencies:** #3 (Room Shapes), #5 (Room Placement), #54 (Corruption)

---

### Issue #91: Legendary Inhabitants

**Labels:** `enhancement`, `content`, `priority-low`

**Description:**
Implement Unique/Legendary inhabitants: Dragon, Demon Lord, Beholder, Medusa, Ancient Treant.

**Acceptance Criteria:**

- [ ] All 5 legendary creatures defined
- [ ] Unique recruitment requirements (special events, high costs)
- [ ] Dungeon-wide aura effects
- [ ] High maintenance/upkeep systems
- [ ] Special abilities and restrictions
- [ ] Only 1 of each per dungeon

**Dependencies:** #11 (Inhabitant Data Model), #7 (Resource Manager)

---

## Epic 19: Creature Fusion

### Issue #92: Fusion Interface

**Labels:** `enhancement`, `ui`, `priority-medium`

**Description:**
UI for fusing two creatures into a hybrid.

**Acceptance Criteria:**

- [ ] Select two inhabitants to fuse
- [ ] Show fusion result preview (if recipe exists)
- [ ] Display fusion cost (resources + Essence)
- [ ] Confirm fusion (removes originals, adds hybrid)
- [ ] Show all available fusion recipes

**Dependencies:** #11 (Inhabitant Data Model), #7 (Resource Manager)

---

### Issue #93: Fusion Recipes System

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Define and implement fusion combinations.

**Acceptance Criteria:**

- [ ] 20+ fusion recipes defined
- [ ] Recipe format: Creature A + Creature B = Hybrid C
- [ ] Recipe costs (Essence, other resources)
- [ ] Store recipes in data files

**Examples:**

- Goblin + Kobold = Hobgoblin
- Skeleton + Wraith = Death Knight

**Dependencies:** #11 (Inhabitant Data Model)

---

### Issue #94: Hybrid Stat Generation

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Generate stats for hybrid creatures based on parents.

**Acceptance Criteria:**

- [ ] Hybrid inherits traits from both parents
- [ ] Stats are average or sum of parents (depends on stat)
- [ ] Some hybrids have unique bonus traits
- [ ] Hybrids display both parent icons in UI

**Technical Notes:**

- HP = (Parent A HP + Parent B HP) / 2
- Traits = Union of both parents' traits
- Some combinations grant special bonuses

**Dependencies:** #93 (Fusion Recipes)

---

## Epic 20: Reputation System

### Issue #95: Reputation Tracking

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Track reputation in 5 categories.

**Acceptance Criteria:**

- [ ] Track: Terror, Wealth, Knowledge, Harmony, Chaos
- [ ] Actions generate reputation points
- [ ] Reputation levels: None, Low, Medium, High, Legendary
- [ ] Display reputation in UI

**Dependencies:** None (foundational)

---

### Issue #96: Reputation Effects

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Reputation affects gameplay and unlocks.

**Acceptance Criteria:**

- [ ] High Terror: Attracts dark invasions, unlocks Torture Chamber
- [ ] High Wealth: Attracts thieves, unlocks Treasure Vault upgrades
- [ ] High Knowledge: Unlocks advanced research
- [ ] High Harmony: Attracts peaceful creatures, reduces invasions
- [ ] High Chaos: Random events increase, unpredictable bonuses

**Dependencies:** #95 (Reputation Tracking), #44 (Invasion Triggers)

---

## Epic 21: Room Features System

### Issue #97: Feature Attachment System

**Labels:** `enhancement`, `core-system`, `priority-medium`

**Description:**
Allow attaching features to rooms for customization.

**Acceptance Criteria:**

- [ ] Each room has 2-3 feature slots (depends on size)
- [ ] Features can be purchased and attached
- [ ] Features provide bonuses
- [ ] Features can be removed (lose feature)
- [ ] Visual representation of features in rooms

**Dependencies:** #5 (Room Placement), #7 (Resource Manager)

---

### Issue #98: Environmental Features

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement environmental room features.

**Acceptance Criteria:**

- [ ] Coffins: +1 undead inhabitant, -1 Fear for undead
- [ ] Bioluminescent Moss: -1 Fear, +5% adjacent production
- [ ] Arcane Crystals: +1 Flux/min, +15% magic efficiency
- [ ] Blood Altar: Sacrifice Food for bonuses, +2 Corruption/min
- [ ] Geothermal Vents: +15% production, fire bonus
- [ ] Fungal Network: Connect rooms, teleport between

**Dependencies:** #97 (Feature Attachment)

---

### Issue #99: Functional Features

**Labels:** `enhancement`, `content`, `priority-medium`

**Description:**
Implement functional room features.

**Acceptance Criteria:**

- [ ] Storage Expansion: +100% resource storage
- [ ] Efficiency Enchantment: +20% base production
- [ ] Fear Ward: -2 Fear in room
- [ ] Corruption Seal: Prevent Corruption generation
- [ ] Training Station: Inhabitants gain XP
- [ ] Resource Converter: Toggle output types

**Dependencies:** #97 (Feature Attachment)

---

### Issue #100: Prestige Features

**Labels:** `enhancement`, `content`, `priority-low`

**Description:**
Implement rare/expensive prestige features.

**Acceptance Criteria:**

- [ ] Elder Runes: +50% production, room becomes magical
- [ ] Void Gate: Summon random creature once/day (risky)
- [ ] Time Dilation Field: 150% speed, high maintenance
- [ ] Phylactery: Respawn dead inhabitants as undead
- [ ] Dragon's Hoard Core: 5 Gold/min, +100% Gold storage (Unique)

**Dependencies:** #97 (Feature Attachment), #7 (Resource Manager)

---

## Epic 22: Victory Conditions

### Issue #101: Victory Path Implementation

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Implement all 5 victory conditions.

**Acceptance Criteria:**

- [ ] Terror Lord: 500 Corruption, 10 defenses, Floor 10+, Demon Lord
- [ ] Dragon's Hoard: 10,000 Gold, Throne+Lair, Dragon, 30 days peaceful
- [ ] Mad Scientist: All research, 5 hybrids, 3 Breeding Pits, Perfect Creature
- [ ] Harmonious Kingdom: 0 Corruption for 30 days, 50+ inhabitants, 7 floors, max Harmony
- [ ] Eternal Empire: Day 365, positive resources, 3 Uniques, 100+ rooms
- [ ] Victory screen triggers when conditions met

**Dependencies:** #54 (Corruption), #7 (Resources), #46 (Multi-Floor), #95 (Reputation)

---

### Issue #102: Victory Progress Tracking UI

**Labels:** `enhancement`, `ui`, `priority-medium`

**Description:**
Show progress toward each victory condition.

**Acceptance Criteria:**

- [ ] Victory menu showing all 5 paths
- [ ] Progress bars/checkboxes for each condition
- [ ] Highlight active pursuit (which victory player is closest to)
- [ ] Tooltips explaining what's needed

**Dependencies:** #101 (Victory Paths)

---

## Epic 23: Save System

### Issue #103: Comprehensive Save System

**Labels:** `enhancement`, `core-system`, `priority-critical`

**Description:**
Save entire game state to file.

**Acceptance Criteria:**

- [ ] Save all floors, rooms, hallways
- [ ] Save all inhabitants and assignments
- [ ] Save resources, research progress, reputation
- [ ] Save day/night cycle, seasonal state
- [ ] Save invasion history, victory progress
- [ ] File format: JSON or binary

**Dependencies:** All core systems

---

### Issue #104: Autosave

**Labels:** `enhancement`, `core-system`, `priority-high`

**Description:**
Automatic saving at regular intervals.

**Acceptance Criteria:**

- [ ] Autosave every 5 minutes
- [ ] Autosave before invasions
- [ ] Autosave on quit
- [ ] Autosave indicator (don't block gameplay)

**Dependencies:** #103 (Save System)

---

### Issue #105: Multiple Save Slots

**Labels:** `enhancement`, `ui`, `priority-medium`

**Description:**
Allow multiple save files.

**Acceptance Criteria:**

- [ ] 3+ manual save slots
- [ ] 1 autosave slot
- [ ] Save slot shows: timestamp, dungeon name, playtime
- [ ] Can delete saves

**Dependencies:** #103 (Save System)

---

### Issue #106: Save File Versioning

**Labels:** `enhancement`, `technical`, `priority-high`

**Description:**
Handle save file compatibility across game updates.

**Acceptance Criteria:**

- [ ] Save files include version number
- [ ] Migration logic for old save versions
- [ ] Warning if save is from newer version
- [ ] Graceful failure if save incompatible

**Dependencies:** #103 (Save System)

---

## Epic 24: Polish & Optimization

### Issue #107: Performance Profiling

**Labels:** `enhancement`, `technical`, `priority-high`

**Description:**
Profile game performance and identify bottlenecks.

**Acceptance Criteria:**

- [ ] Use profiler tools to measure frame time
- [ ] Identify slowest functions/systems
- [ ] Test with max dungeon size (100+ rooms)
- [ ] Document performance issues

**Dependencies:** All core systems (for testing)

---

### Issue #108: Pathfinding Optimization

**Labels:** `enhancement`, `technical`, `priority-high`

**Description:**
Optimize A\* pathfinding for invasions and hallways.

**Acceptance Criteria:**

- [ ] Cache pathfinding results
- [ ] Use hierarchical pathfinding for large dungeons
- [ ] Limit pathfinding calls per frame
- [ ] Optimize grid traversal algorithms

**Dependencies:** #18 (Hallway Pathfinding), #42 (Invader Pathfinding)

---

### Issue #109: Memory Optimization

**Labels:** `enhancement`, `technical`, `priority-medium`

**Description:**
Reduce memory usage for long play sessions.

**Acceptance Criteria:**

- [ ] Unload unused floor data
- [ ] Pool frequently created objects
- [ ] Compress save files
- [ ] Limit event history storage

**Dependencies:** All core systems

---

### Issue #110: Load Time Optimization

**Labels:** `enhancement`, `technical`, `priority-medium`

**Description:**
Improve game startup and save file loading.

**Acceptance Criteria:**

- [ ] Async loading for large saves
- [ ] Progress bar during load
- [ ] Lazy loading for assets
- [ ] Load time under 10 seconds for large dungeons

**Dependencies:** #103 (Save System)

---

## Epic 25: Tutorial & Help

### Issue #111: Tutorial Sequence

**Labels:** `enhancement`, `ui`, `priority-high`

**Description:**
Step-by-step tutorial for new players.

**Acceptance Criteria:**

- [ ] Tutorial starts on first launch
- [ ] Teaches: Room placement, Resource generation, Inhabitants, Connections
- [ ] Interactive steps (complete action to proceed)
- [ ] Can skip tutorial
- [ ] Tooltip hints throughout tutorial

**Dependencies:** #1 (Grid), #5 (Room Placement), #13 (Inhabitants), #17 (Connections)

---

### Issue #112: Contextual Tooltips

**Labels:** `enhancement`, `ui`, `priority-medium`

**Description:**
Helpful tooltips throughout the game.

**Acceptance Criteria:**

- [ ] Hover tooltips on all UI elements
- [ ] Explain stats, bonuses, costs
- [ ] Show calculations (why production is X)
- [ ] Keyboard shortcuts in tooltips

**Dependencies:** All UI systems

---

### Issue #113: Help Menu

**Labels:** `enhancement`, `ui`, `priority-medium`

**Description:**
In-game help documentation.

**Acceptance Criteria:**

- [ ] Help button in main menu
- [ ] Sections: Rooms, Inhabitants, Combat, Resources, Victory
- [ ] Search functionality
- [ ] Links to tutorial replay

**Dependencies:** #111 (Tutorial)

---

## Epic 26: Accessibility

### Issue #114: Colorblind Modes

**Labels:** `enhancement`, `accessibility`, `priority-medium`

**Description:**
Add colorblind-friendly palette options.

**Acceptance Criteria:**

- [ ] 3+ colorblind modes (Deuteranopia, Protanopia, Tritanopia)
- [ ] Setting in options menu
- [ ] All UI elements remain distinguishable
- [ ] Test with colorblind simulation tools

**Dependencies:** All visual systems

---

### Issue #115: Text Scaling

**Labels:** `enhancement`, `accessibility`, `priority-medium`

**Description:**
Allow text size adjustment.

**Acceptance Criteria:**

- [ ] Text scaling: 75%, 100%, 125%, 150%
- [ ] All text scales proportionally
- [ ] UI adjusts to prevent overlap
- [ ] Setting persists

**Dependencies:** All UI systems

---

### Issue #116: UI Contrast Options

**Labels:** `enhancement`, `accessibility`, `priority-low`

**Description:**
High contrast mode for visibility.

**Acceptance Criteria:**

- [ ] High contrast mode option
- [ ] Increases contrast between elements
- [ ] Readable on all backgrounds
- [ ] Toggle in settings

**Dependencies:** All visual systems

---

## Epic 27: Audio

### Issue #117: Background Music System

**Labels:** `enhancement`, `audio`, `priority-medium`

**Description:**
Add atmospheric background music.

**Acceptance Criteria:**

- [ ] 3-5 music tracks (menu, gameplay, invasion, victory)
- [ ] Seamless looping
- [ ] Crossfade between tracks
- [ ] Volume controls
- [ ] Music changes based on game state

**Dependencies:** #41 (Invasion Mode), #101 (Victory)

---

### Issue #118: Sound Effects

**Labels:** `enhancement`, `audio`, `priority-medium`

**Description:**
Add sound effects for all major actions.

**Acceptance Criteria:**

- [ ] Room placement (building sound)
- [ ] Resource collection (coin/gem sounds)
- [ ] Combat (attack, hit, death sounds)
- [ ] UI clicks
- [ ] Ambient sounds per biome

**Dependencies:** All major game systems

---

## Epic 28: Visual Polish

### Issue #119: Particle Effects

**Labels:** `enhancement`, `visual`, `priority-medium`

**Description:**
Add visual particle effects for atmosphere.

**Acceptance Criteria:**

- [ ] Magic sparkles (Flux generation, spells)
- [ ] Corruption tendrils (dark rooms)
- [ ] Food/resource generation particles
- [ ] Combat impact effects
- [ ] Biome-specific particles (lava, spores, crystals)

**Dependencies:** #9 (Production), #43 (Combat), #51 (Biomes)

---

### Issue #120: Animation System

**Labels:** `enhancement`, `visual`, `priority-medium`

**Description:**
Smooth animations for inhabitants and UI.

**Acceptance Criteria:**

- [ ] Inhabitant idle animations
- [ ] Inhabitant work animations
- [ ] Combat attack animations
- [ ] UI transitions (fade, slide)
- [ ] Room placement animation

**Dependencies:** #11 (Inhabitants), #5 (Room Placement), #43 (Combat)

---

### Issue #121: Biome Visual Theming

**Labels:** `enhancement`, `visual`, `priority-medium`

**Description:**
Visual distinction for each biome type.

**Acceptance Criteria:**

- [ ] Unique floor background/tileset per biome
- [ ] Color palette per biome (red=volcanic, blue=flooded, etc.)
- [ ] Ambient particles (lava bubbles, water drops, crystals, spores)
- [ ] Biome name displayed in UI

**Dependencies:** #51 (Biome System)

---

**Total Issues:** 121 (code/development only)
**Average Estimate:** 3-5 story points per issue
**Total Estimated Story Points:** ~450-500
**Estimated Development Time:** 20-24 months
