# PRD: Particle Effects

## Introduction
Blunderdark's dungeon-building gameplay involves magical resources (Flux), corruption mechanics, resource generation, combat, and diverse biomes. Visual particle effects will communicate these systems to the player through animated visual feedback -- sparkles for magic, tendrils for corruption, floating particles for resource generation, impact effects for combat, and environmental particles for biomes. This feature adds a lightweight particle system rendered via CSS animations or HTML5 Canvas overlays.

## Goals
- Implement a reusable particle effect system that can be triggered from any component
- Support magic sparkle effects for Flux generation and spell-related events
- Support corruption tendril/smoke effects for dark/corrupted rooms
- Support resource generation particles (floating coins, food icons, etc.)
- Support combat impact effects (hit sparks, damage numbers)
- Support biome-specific ambient particles (lava embers, water droplets, crystal shimmers, fungal spores)
- Maintain performance at 60fps with multiple active particle emitters

## User Stories

### US-001: Create Particle Engine Service
**Description:** As a developer, I want a `ParticleService` that manages particle emitters and their lifecycle so that any component can trigger particle effects declaratively.

**Acceptance Criteria:**
- [ ] `ParticleService` is created as a singleton service (`providedIn: 'root'`)
- [ ] Service provides methods to spawn, update, and destroy particle emitters
- [ ] Each emitter has configurable properties: position, particle count, lifetime, velocity, color, size, opacity fade
- [ ] Emitters automatically clean up after their particles expire
- [ ] Service uses `requestAnimationFrame` for updates (not the game loop tick)
- [ ] Typecheck/lint passes

### US-002: Create Particle Renderer Component
**Description:** As a developer, I want a particle renderer component that can be placed in the DOM to display particles at a given position so that effects are rendered in the correct location.

**Acceptance Criteria:**
- [ ] `ParticleRendererComponent` is created as a standalone Angular component with `OnPush` change detection
- [ ] Component renders particles using CSS transforms and opacity (or a Canvas overlay)
- [ ] Component accepts an emitter configuration via `input()`
- [ ] Particles animate smoothly at 60fps
- [ ] Component cleans up DOM elements when particles expire
- [ ] Typecheck/lint passes

### US-003: Implement Magic Sparkle Effects
**Description:** As a player, I want to see sparkle particles when Flux is generated or magical events occur so that magical activity is visually distinct.

**Acceptance Criteria:**
- [ ] Sparkle particle preset defined with small bright particles, random upward drift, fade-out
- [ ] Sparkle effect triggers when Flux resource is generated
- [ ] Sparkle effect triggers on spell/magic-related room actions
- [ ] Particles use a bright blue/purple color palette (consistent with Flux theming)
- [ ] Effect is visually noticeable but not overwhelming (5-15 particles per burst)
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Implement Corruption Tendril Effects
**Description:** As a player, I want to see dark, smoky tendril particles emanating from corrupted or dark rooms so that corruption is visually communicated.

**Acceptance Criteria:**
- [ ] Corruption particle preset defined with dark, slow-moving particles that drift and fade
- [ ] Particles use dark purple/black color palette with low opacity
- [ ] Effect is persistent (continuous emitter) on corrupted rooms while they are visible
- [ ] Emitter activates/deactivates based on room visibility on screen
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Implement Resource Generation Particles
**Description:** As a player, I want to see small floating particles when rooms generate resources (food, coins, materials) so that I get visual feedback on production.

**Acceptance Criteria:**
- [ ] Resource particle preset with small icons or colored dots that float upward and fade
- [ ] Different color per resource type (gold for coins, green for food, blue for Flux, etc.)
- [ ] Effect triggers when a room produces resources during a game tick
- [ ] Particles are brief (0.5-1 second lifetime)
- [ ] Typecheck/lint passes

### US-006: Implement Combat Impact Effects
**Description:** As a player, I want to see impact particles during combat (hit sparks, miss indicators) so that battles feel dynamic.

**Acceptance Criteria:**
- [ ] Combat hit preset with bright, fast-expanding particles that fade quickly
- [ ] Combat miss preset with a subtle whiff/puff effect
- [ ] Death/defeat preset with a more dramatic particle burst
- [ ] Effects trigger on corresponding combat events
- [ ] Particles do not obscure combat information (HP, damage numbers)
- [ ] Typecheck/lint passes

### US-007: Implement Biome-Specific Ambient Particles
**Description:** As a player, I want each biome to have subtle ambient particles so that environments feel alive and distinct.

**Acceptance Criteria:**
- [ ] Volcanic biome: floating embers/lava sparks (orange/red, upward drift)
- [ ] Flooded biome: water droplets/bubbles (blue, downward or lateral drift)
- [ ] Crystalline biome: crystal shimmer/glint particles (white/cyan, stationary twinkle)
- [ ] Fungal biome: floating spores (green/yellow, slow random drift)
- [ ] Ambient particles are continuous low-density emitters
- [ ] Particles are only active for biomes currently visible on screen
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-008: Add Particle Toggle Option
**Description:** As a player, I want to disable particle effects in the options panel so that I can improve performance or reduce visual distraction if needed.

**Acceptance Criteria:**
- [ ] `GameOptions` includes a `showParticles` boolean option, defaulting to `true`
- [ ] When disabled, no particle emitters are spawned
- [ ] Option is in the UI tab of the options panel
- [ ] Setting persists via `localStorageSignal`
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-009: Performance Testing for Particle System
**Description:** As a developer, I want to verify the particle system does not degrade frame rate so that gameplay remains smooth.

**Acceptance Criteria:**
- [ ] With 10+ simultaneous emitters, frame rate stays above 55fps on a mid-range device
- [ ] Expired particles are removed from the DOM promptly (no memory leak)
- [ ] ParticleService properly cleans up emitters when components are destroyed
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must provide a `ParticleService` with methods to create and manage particle emitters.
- FR-2: Particle effects must be triggerable from any component or service in the application.
- FR-3: Each particle emitter must support configurable position, particle count, lifetime, velocity, color, size, and opacity.
- FR-4: Biome ambient particles must activate only when the biome is visible on screen.
- FR-5: A global toggle must allow players to disable all particle effects.
- FR-6: Particle rendering must not block the main game loop.

## Non-Goals (Out of Scope)
- GPU-accelerated particle rendering (WebGL/WebGPU)
- Physics-based particle interactions (collisions, gravity wells)
- Particle editor UI for content creators
- Procedurally generated particle textures

## Technical Considerations
- CSS `transform` and `opacity` animations are GPU-accelerated in modern browsers and Electron, making them performant for moderate particle counts.
- For higher particle counts, a single `<canvas>` overlay may be more performant than individual DOM elements.
- The particle system should run on `requestAnimationFrame`, separate from the game loop in `src/app/helpers/gameloop.ts`, since particles are visual-only and should not be tied to game tick rate.
- Dependencies on #9 (room system), #43 (combat), and #51 (biomes) mean some trigger points may need stubs until those systems exist.
- Angular's `OnPush` change detection means particle components should use signals or manual change detection for animation updates.
- Consider using Angular's `AnimationBuilder` or plain DOM manipulation for particle animations to avoid change detection overhead.

## Success Metrics
- All 5 particle categories (magic, corruption, resources, combat, biome) are implemented and visually distinct
- Frame rate remains above 55fps with typical particle load
- No memory leaks from orphaned particle emitters
- Players can toggle particles off for performance

## Open Questions
- Should particles be rendered in a global overlay layer or within individual component templates?
- What is the maximum particle count budget per emitter and globally?
- Should particle effects scale with the text scaling option, or remain at fixed pixel sizes?
- Are there accessibility concerns with animated particles (e.g., motion sensitivity)? Should a "reduced motion" option be considered alongside the toggle?
