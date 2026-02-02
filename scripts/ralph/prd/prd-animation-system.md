# PRD: Animation System

## Introduction
Blunderdark currently has an `AtlasAnimationComponent` for sprite-based animations, but lacks a comprehensive animation system for inhabitant behaviors, combat sequences, and UI transitions. This feature builds a unified animation framework that supports sprite-sheet animations for game entities (idle, work, combat) and CSS/Angular transitions for UI elements (fades, slides, page transitions). The system must integrate with the existing sprite atlas pipeline and game loop.

## Goals
- Implement idle animations for dungeon inhabitants (creatures, workers) using sprite sheet frames
- Implement work animations that play when inhabitants are performing tasks (mining, cooking, crafting)
- Implement combat attack animations for both inhabitants and invaders
- Implement UI transition animations (fade, slide) for page navigation and modal dialogs
- Implement room placement animation for visual feedback when building
- Ensure animations are driven by game state signals and do not block the game loop

## User Stories

### US-001: Create Animation Controller Service
**Description:** As a developer, I want an `AnimationService` that manages animation states and transitions for game entities so that animation logic is centralized and reusable.

**Acceptance Criteria:**
- [ ] `AnimationService` is created as a singleton service (`providedIn: 'root'`)
- [ ] Service tracks animation states per entity: `'idle'`, `'work'`, `'attack'`, `'hit'`, `'death'`
- [ ] Service provides methods to transition between states with optional callbacks on completion
- [ ] Animation state changes are driven by game state signals
- [ ] Service handles animation priority (e.g., `death` overrides `idle`)
- [ ] Typecheck/lint passes

### US-002: Implement Inhabitant Idle Animations
**Description:** As a player, I want my dungeon inhabitants to have idle animations (breathing, shifting, blinking) so that the dungeon feels alive.

**Acceptance Criteria:**
- [ ] Idle animation frames are defined in the sprite atlas for each inhabitant type
- [ ] `AtlasAnimationComponent` plays idle animation by default when no other animation is active
- [ ] Idle animations loop continuously at a configurable frame rate
- [ ] Different inhabitant types can have different idle animation lengths
- [ ] Animations pause when the game loop is paused
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Implement Inhabitant Work Animations
**Description:** As a player, I want to see inhabitants performing work animations (hammering, cooking, gathering) when they are assigned to a room so that I can tell what they are doing at a glance.

**Acceptance Criteria:**
- [ ] Work animation frames are defined per inhabitant-room combination (or per room type)
- [ ] Work animation plays when an inhabitant is actively generating resources or performing a task
- [ ] Animation transitions smoothly from idle to work and back
- [ ] Work animation speed can scale with game tick rate or production speed
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Implement Combat Attack Animations
**Description:** As a player, I want combat participants to have attack animations so that battles are visually engaging.

**Acceptance Criteria:**
- [ ] Attack animation frames are defined in the sprite atlas
- [ ] Attack animation plays once per attack action (not looping)
- [ ] Animation has clear windup and impact frames
- [ ] After attack animation completes, entity returns to idle (or hit/death if applicable)
- [ ] Both inhabitants (defenders) and invaders have attack animations
- [ ] Typecheck/lint passes

### US-005: Implement Hit and Death Animations
**Description:** As a player, I want entities to show hit reactions and death animations so that combat damage is visually communicated.

**Acceptance Criteria:**
- [ ] Hit animation is a brief flash/flinch that plays when an entity takes damage
- [ ] Death animation plays once when an entity's HP reaches zero
- [ ] Death animation does not loop; entity is removed or grayed out after completion
- [ ] Hit animation can interrupt idle or work animations and return to the previous state
- [ ] Typecheck/lint passes

### US-006: Implement UI Page Transition Animations
**Description:** As a player, I want smooth transitions (fade, slide) when navigating between pages so that the UI feels polished.

**Acceptance Criteria:**
- [ ] Route transitions use Angular's `@routeAnimation` trigger or a custom animation solution
- [ ] Pages fade in/out during navigation (default 200-300ms duration)
- [ ] The transition page (`TransitionComponent`) shows a smooth loading animation
- [ ] Animations do not delay route activation (content loads in the background)
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Implement Modal Dialog Animations
**Description:** As a player, I want modals to animate in and out (scale + fade) so that they feel responsive and polished.

**Acceptance Criteria:**
- [ ] `ModalComponent` animates in with a scale-up + fade-in effect
- [ ] `ModalComponent` animates out with a scale-down + fade-out effect
- [ ] Animation duration is 150-250ms
- [ ] Backdrop fades in/out alongside the modal
- [ ] Animations respect `prefers-reduced-motion` media query
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-008: Implement Room Placement Animation
**Description:** As a player, I want a visual animation when I place a new room so that the action feels satisfying and the new room is highlighted.

**Acceptance Criteria:**
- [ ] When a room is placed, a brief "build" animation plays (e.g., scale from 0 to 1, slight bounce)
- [ ] The room briefly glows or pulses after placement
- [ ] Animation duration is 300-500ms
- [ ] Animation does not block subsequent room placement
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-009: Add Animation Speed/Toggle Option
**Description:** As a player, I want to control animation speed or disable animations so that I can optimize for performance or personal preference.

**Acceptance Criteria:**
- [ ] `GameOptions` includes a `showAnimations` boolean option, defaulting to `true`
- [ ] When disabled, sprite entities show a static frame and UI transitions are instant
- [ ] Option respects `prefers-reduced-motion` media query as a default
- [ ] Setting persists via `localStorageSignal`
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-010: Define Sprite Atlas Animation Metadata
**Description:** As a developer, I want animation frame sequences defined in the gamedata YAML so that the content pipeline can generate atlas metadata for animations.

**Acceptance Criteria:**
- [ ] YAML schema supports defining animation sequences per entity (frame indices, frame rate, loop behavior)
- [ ] Build scripts (`npm run gamedata:build`) process animation metadata
- [ ] `ContentService` loads animation metadata at app init
- [ ] `AtlasAnimationComponent` reads animation data from `ContentService`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support sprite-sheet-based animations with configurable frame sequences, frame rates, and loop behavior.
- FR-2: Entity animations must transition between states (idle, work, attack, hit, death) based on game state signals.
- FR-3: UI transitions must use CSS or Angular animations with configurable duration.
- FR-4: Animation metadata must be definable in YAML gamedata and compiled to JSON.
- FR-5: A global toggle must allow players to disable all animations.
- FR-6: Animations must respect the `prefers-reduced-motion` media query.

## Non-Goals (Out of Scope)
- Skeletal/bone-based animation
- 3D animations or WebGL rendering
- Procedural animation generation
- Animation blending between states (simple state switching is sufficient)
- Video cutscenes

## Technical Considerations
- The existing `AtlasAnimationComponent` in `src/app/components/atlas-animation/` provides a foundation for sprite-sheet animation; it should be extended rather than replaced.
- The sprite atlas pipeline in `scripts/` generates atlas images and metadata; animation frame sequences need to be added to this pipeline.
- Dependencies on #11 (inhabitant system), #5 (room system), and #43 (combat system) mean some animations may need placeholder sprites initially.
- CSS animations and transitions are GPU-accelerated and performant for UI effects.
- Angular 20 supports view transitions API which could be used for page transitions.
- The game loop in `src/app/helpers/gameloop.ts` runs on a tick schedule; sprite animations should advance based on real time (`requestAnimationFrame`) while game-state-driven transitions respond to tick events.
- `OnPush` change detection means animation frame updates in components need to use signals or `markForCheck()`.

## Success Metrics
- All entity types have working idle, work, and combat animations
- UI transitions are smooth with no visible layout jumps or flashes
- Animation frame rate is independent of game tick rate
- Players can disable all animations without loss of game functionality
- Room placement feels responsive with visual feedback within 100ms of the action

## Open Questions
- Should animation speeds scale with game speed multiplier (e.g., 2x speed = 2x animation speed)?
- What is the sprite frame budget per entity per animation state?
- Should we use Angular's built-in animation module or a lightweight third-party library?
- How should animations behave when the game tab is backgrounded (pause or skip)?
