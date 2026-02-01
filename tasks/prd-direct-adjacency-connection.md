# PRD: Direct Adjacency Connection

## Introduction
Direct adjacency connection allows the player to logically link two rooms that share an edge. This creates a free bidirectional connection represented by a doorway icon, enabling adjacency bonuses and inhabitant movement between rooms. Connections can also be disconnected if the player changes their dungeon layout strategy.

## Goals
- Allow players to connect two adjacent rooms with a single UI action
- Display a visual doorway indicator on connected edges
- Enable bidirectional connections (Room A connects to Room B and vice versa)
- Support disconnection to allow layout flexibility
- Trigger adjacency bonus recalculation on connect/disconnect

## User Stories

### US-001: Connect Adjacent Rooms via UI
**Description:** As a dungeon builder, I want to click a button to connect two adjacent rooms so that I can enable bonuses and inhabitant movement between them.

**Acceptance Criteria:**
- [ ] A "Connect" button appears when selecting a room that has adjacent, unconnected neighbors
- [ ] Clicking the button shows a list of adjacent rooms available for connection
- [ ] Selecting a room from the list creates a bidirectional connection
- [ ] The connection is stored in the game state
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Display Doorway Icon on Connected Edge
**Description:** As a dungeon builder, I want to see a doorway icon on the shared edge of connected rooms so that I can visually identify which rooms are linked.

**Acceptance Criteria:**
- [ ] A doorway sprite/icon renders on the grid at the shared edge between two connected rooms
- [ ] The icon appears on both sides of the connection (or centered on the edge)
- [ ] The icon is removed when the connection is severed
- [ ] Multiple connections from one room each show their own doorway icon
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Disconnect Rooms
**Description:** As a dungeon builder, I want to disconnect two connected rooms so that I can reorganize my dungeon layout.

**Acceptance Criteria:**
- [ ] A "Disconnect" option appears when selecting a room with active connections
- [ ] Disconnecting removes the bidirectional link from both rooms
- [ ] The doorway icon is removed from the grid
- [ ] Adjacency bonuses are recalculated after disconnection
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Connection Data Model
**Description:** As a developer, I want a connection data structure that stores bidirectional room links so that other systems can query connected rooms.

**Acceptance Criteria:**
- [ ] A `Connection` type exists with `roomAId`, `roomBId`, and `edgeTiles` fields
- [ ] Connections are stored in the game state and persist across save/load
- [ ] A helper function `getConnectedRooms(roomId: string): string[]` returns all connected room IDs
- [ ] A helper function `areRoomsConnected(roomAId: string, roomBId: string): boolean` exists
- [ ] Typecheck/lint passes

### US-005: Connection Validation
**Description:** As a developer, I want connection creation to validate that the two rooms are actually adjacent so that invalid connections cannot exist.

**Acceptance Criteria:**
- [ ] Attempting to connect non-adjacent rooms throws an error or returns false
- [ ] Attempting to connect already-connected rooms is a no-op
- [ ] Attempting to connect a room to itself is rejected
- [ ] Unit tests cover all validation cases
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must allow creating a logical connection between two rooms that are confirmed adjacent via the adjacency detection system.
- FR-2: Connections must be bidirectional: connecting A to B also connects B to A.
- FR-3: Direct adjacency connections must have zero resource cost.
- FR-4: A visual doorway indicator must render on the shared edge tiles of connected rooms.
- FR-5: Disconnecting rooms must remove the connection from both sides and trigger bonus recalculation.

## Non-Goals (Out of Scope)
- Hallway connections between non-adjacent rooms (handled by Issues #18-#20)
- Connection costs (direct adjacency is free; hallway costs handled by Issue #21)
- Adjacency bonus calculation logic (handled by Issue #22)
- Inhabitant pathfinding through connections

## Technical Considerations
- Depends on adjacency detection (Issue #16) for determining which rooms can be connected.
- Connection state should be stored in IndexedDB as part of the game state.
- Use Angular Signals for reactive connection state so the grid UI updates automatically.
- The doorway icon should be a sprite from the game's spritesheet system.
- Consider storing connections in a flat array in game state with a lookup helper, rather than nesting inside room objects, to simplify bidirectional management.

## Success Metrics
- Players can connect and disconnect adjacent rooms without errors
- Doorway icons render correctly on shared edges
- Connection state persists across save/load cycles
- Connection/disconnection triggers bonus recalculation within the same tick

## Open Questions
- Should there be a limit on how many connections a single room can have?
- Should the doorway icon vary by room type or connection type?
- Should there be an animation or sound effect when connecting/disconnecting?
