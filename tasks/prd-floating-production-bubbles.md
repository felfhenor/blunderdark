# PRD: Floating Production Bubbles

## Introduction

Replace toast notifications for room production/crafting events with cute floating bubbles that appear directly above the producing room on the grid map. When a room produces resources, completes a crafting queue, or generates non-base outputs (inhabitants, traps, etc.), a small bubble floats upward from the room and fades out — giving immediate, spatially-anchored feedback similar to classic RPG damage numbers.

This applies to:
- **Continuous production rooms** — every tick, show net resource gains (e.g. "+3 gold, +1 flux")
- **Queue completion rooms** — when a crafting queue finishes (breeding, forging, alchemy, summoning, torture, traps, spawning pool)
- **Non-base-currency outputs** — inhabitants spawned, traps forged, items created, souls captured, research completed

## Goals

- Provide immediate, spatial feedback for room production without relying on corner toasts
- Make the dungeon feel alive by showing resource flow directly on the map
- Keep the system performant despite potentially many rooms producing every second
- Allow players to toggle bubbles on/off via game options

## User Stories

### US-001: Create floating bubble component
**Description:** As a developer, I need a reusable floating bubble component that can display one or more lines of text, animate upward, and fade out.

**Acceptance Criteria:**
- [ ] New `FloatingBubbleComponent` in `src/app/components/floating-bubble/`
- [ ] Accepts a list of display entries (icon/label + amount pairs)
- [ ] Renders as an absolutely-positioned element above its anchor point
- [ ] Animates upward (~30px) and fades out over ~1.5 seconds using CSS `@keyframes`
- [ ] Removes itself from the DOM after animation completes (use `animationend` event)
- [ ] Uses `changeDetection: ChangeDetectionStrategy.OnPush`
- [ ] Typecheck/lint passes

### US-002: Create floating bubble manager service
**Description:** As a developer, I need a service that manages bubble lifecycle — creating, positioning, and batching bubbles per room per tick.

**Acceptance Criteria:**
- [ ] New helper or service that exposes a `showBubble(roomId, floorIndex, entries)` function
- [ ] Batches multiple resource types for the same room into a single bubble ("+3 gold, +1 flux" on separate lines)
- [ ] Tracks active bubbles per room to avoid excessive stacking (if a previous bubble is still animating, the new one stacks above it or replaces it)
- [ ] Limits maximum concurrent bubbles per room (e.g. max 3 stacked) to prevent visual clutter
- [ ] Respects the game option toggle — does nothing when bubbles are disabled
- [ ] Typecheck/lint passes

### US-003: Integrate bubbles with continuous production
**Description:** As a player, I want to see floating "+resource" bubbles above rooms that produce resources every tick, so I can see my dungeon's economy at a glance.

**Acceptance Criteria:**
- [ ] After `productionProcess` runs each tick, per-room production deltas trigger bubbles on the current floor
- [ ] Each bubble shows all resources that room produced that tick, combined into one bubble
- [ ] Only rooms on the currently-viewed floor show bubbles (no off-screen rendering)
- [ ] Zero-production rooms (or rooms producing 0 of everything) do not show bubbles
- [ ] Uses currency display formatting (icon + short amount) consistent with existing `<app-currency-cost>` style
- [ ] Typecheck/lint passes

### US-004: Integrate bubbles with queue completions
**Description:** As a player, I want to see a floating bubble when a crafting room finishes a job (e.g. "+1 Goblin Grunt" from the Spawning Pool, "+1 Iron Trap" from the Trap Workshop).

**Acceptance Criteria:**
- [ ] Subscribe to all queue completion Subjects: `spawningPoolSpawn$`, `breedingCompleted$`, `mutationCompleted$`, `alchemyLabCompleted$`, `darkForgeCompleted$`, `summoningCompleted$`, `tortureExtractionComplete$`, `tortureConversionComplete$`, `trapWorkshopCompleted$`, `researchCompleted$`
- [ ] Each completion triggers a bubble above the relevant room showing what was produced (e.g. "+1 Goblin Grunt", "+1 Iron Sword")
- [ ] Queue bubbles use a distinct style or color to differentiate from continuous production bubbles (e.g. slightly different background color or a small icon)
- [ ] Typecheck/lint passes

### US-005: Integrate bubbles with room placement
**Description:** As a player, I want to see a confirmation bubble when I place a new room, so the action feels satisfying.

**Acceptance Criteria:**
- [ ] After `roomPlacementPlace` succeeds, a bubble appears above the newly placed room showing the room name (e.g. "Gold Mine built!")
- [ ] Bubble uses a distinct "creation" style (e.g. different color or slightly larger)
- [ ] Typecheck/lint passes

### US-006: Position bubbles on the grid (scales with zoom/pan)
**Description:** As a player, I want bubbles to appear spatially anchored to rooms on the map, moving with pan and scaling with zoom.

**Acceptance Criteria:**
- [ ] Bubbles are rendered inside the `grid-container` element (the one with the camera transform), so they inherit zoom and pan automatically
- [ ] Positioned using the same room-anchor logic as room labels (`--room-center-offset`, anchor tile coordinates)
- [ ] Bubbles appear above the room label, offset upward so they don't overlap the room name
- [ ] Multiple stacked bubbles offset further upward to avoid overlapping each other
- [ ] Typecheck/lint passes

### US-007: Add game option toggle for bubbles
**Description:** As a player, I want to toggle floating bubbles on/off in the game options, in case I find them distracting.

**Acceptance Criteria:**
- [ ] Add `showProductionBubbles` boolean to `GameOption` type and defaults (default: `true`)
- [ ] Add toggle in the UI options tab of the options modal
- [ ] When disabled, no bubbles are created (not just hidden — skip creation entirely for performance)
- [ ] Setting persists across sessions via localStorage
- [ ] Typecheck/lint passes

### US-008: Performance guardrails
**Description:** As a developer, I need to ensure bubbles don't degrade performance when many rooms are producing simultaneously.

**Acceptance Criteria:**
- [ ] Global cap on total active bubbles (e.g. 50) — oldest bubbles are removed when cap is exceeded
- [ ] Bubbles use CSS animations only (no JS `requestAnimationFrame` ticker)
- [ ] Bubbles self-destruct via `animationend` — no leaked DOM nodes
- [ ] At game speed 2x/4x, bubbles still fire per-tick but animation duration stays constant (bubbles may overlap more, but don't speed up)
- [ ] Profile with 20+ producing rooms and confirm no frame drops
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: A `FloatingBubbleComponent` renders a small, rounded, semi-transparent bubble with one or more "+resource" lines
- FR-2: Bubbles animate upward ~30px and fade from full opacity to 0 over ~1.5 seconds via CSS `@keyframes`
- FR-3: Bubbles self-remove from the DOM after the animation ends
- FR-4: A bubble manager tracks active bubbles, batches per-room-per-tick entries, enforces per-room and global caps
- FR-5: `productionProcess` (or a post-production hook) emits per-room production deltas that the bubble manager consumes
- FR-6: All queue completion Subjects trigger bubbles with the name/type of the produced item
- FR-7: Room placement triggers a "room built" bubble
- FR-8: Bubbles render inside the grid's transform container so they scale with zoom and move with pan
- FR-9: Bubbles position above the room label using the same anchor-tile + center-offset logic
- FR-10: A `showProductionBubbles` game option (default true) gates all bubble creation
- FR-11: A global cap of ~50 concurrent bubbles prevents DOM bloat
- FR-12: Only rooms on the currently-viewed floor produce bubbles

## Non-Goals

- No bubbles for base resource consumption (food eaten, gold spent) — only gains
- No bubbles for manual player actions (buying from merchant, manually spending resources)
- No particle effects or complex animations — keep it simple CSS float-up + fade
- No per-resource-type color coding in this initial version (can be added later)
- No sound effects tied to bubbles
- No bubbles for invasion events (damage dealt/taken) — that's a separate system

## Design Considerations

- **Visual style:** Small rounded pill/badge with semi-transparent dark background (similar to existing room labels), white text, ~text-xs size. Example: a dark pill reading "+3 gold" with a tiny gold icon, floating upward and fading.
- **Stacking:** When multiple bubbles exist for the same room, each new one offsets further up. Old bubbles continue their animation independently.
- **Currency icons:** Reuse the existing `AtlasImageComponent` or currency icon classes for inline resource icons in bubbles if feasible. At minimum, show the resource name in short form.
- **Batching example:** If a Gold Mine produces +3 gold and +1 flux in a tick, one bubble appears with two lines: "+3 gold" and "+1 flux".

## Technical Considerations

- **Grid integration:** Bubbles must be children of the `grid-container` div (which has the `cameraTransform` applied) so they zoom/pan with the map. They should be absolutely positioned relative to the room's anchor tile.
- **Tile size:** Each tile is 64px wide + 1px gap = 65px pitch. Room center offset is `(centerX - anchorX) * 65px`. Bubbles should use the same math.
- **Production deltas:** Currently `productionProcess` modifies `state.world.resources` in bulk. To get per-room deltas, either: (a) compute per-room production separately in a post-tick hook using the existing `productionCalculateForRoom` logic, or (b) emit per-room deltas from within `productionProcess`. Option (a) is cleaner since it avoids modifying the core production logic.
- **Existing room label z-index:** Room labels use `z-index: 5`. Bubbles should use `z-index: 6` or higher so they float above labels.
- **Game speed:** At 2x/4x speed, multiple ticks process per second. Each tick still triggers its own bubble. The CSS animation duration stays constant at ~1.5s, so bubbles may overlap — this is acceptable and actually looks good (conveying speed).
- **Floor visibility:** Only the currently-viewed floor index should produce bubbles. The grid component already tracks the active floor.

## Success Metrics

- Floating bubbles visually appear above producing rooms within 1 tick of production
- Bubbles correctly show batched resources per room per tick
- Queue completions show the correct produced item name
- No measurable frame rate drop with 20+ simultaneous bubbles
- Toggle in options correctly enables/disables all bubbles
- Bubbles scale and pan correctly with the grid at all zoom levels

## Open Questions

- Should continuous production bubbles show the per-tick amount or accumulate over a few seconds for readability? (Current decision: per-tick, as user chose 1A)
- Should queue completion bubbles look visually distinct from production bubbles? (Suggested: yes, slight color variation)
- Should bubbles for very small amounts (e.g. "+0.01 flux") be suppressed below a threshold? (Likely yes for visual cleanliness, but not specified)
