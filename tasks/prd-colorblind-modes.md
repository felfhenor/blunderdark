# PRD: Colorblind Modes

## Introduction
Blunderdark relies on color to communicate game state, resource types, threat levels, and UI feedback. Players with color vision deficiencies (affecting roughly 8% of males and 0.5% of females) may struggle to distinguish critical visual information. This feature adds selectable colorblind simulation/correction modes so that all UI elements remain distinguishable regardless of a player's color perception.

## Goals
- Provide at least 3 colorblind accessibility modes: Deuteranopia, Protanopia, and Tritanopia
- Ensure every color-coded UI element remains distinguishable under each mode
- Persist the selected mode across sessions via `localStorageSignal`
- Maintain visual quality and readability for players who do not need colorblind assistance
- Pass manual verification using browser-based colorblind simulation tools (e.g., Chrome DevTools rendering emulation)

## User Stories

### US-001: Add Colorblind Mode Option to GameOptions
**Description:** As a developer, I want to extend the `GameOptions` type and default options to include a `colorblindMode` setting so that the colorblind preference is stored alongside other UI options.

**Acceptance Criteria:**
- [ ] `GameOption` type in `src/app/interfaces/state-options.ts` is extended (or a new string-union field `colorblindMode` is added to `GameOptions`) with values `'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'`
- [ ] Default value is `'none'`
- [ ] The option is persisted via `localStorageSignal` (same mechanism as `uiTheme`)
- [ ] Typecheck/lint passes (`npm run lint`)

### US-002: Apply CSS Filter to Document Root
**Description:** As a developer, I want a reactive effect in `ThemeService` that applies an SVG/CSS filter to the document root based on the selected colorblind mode so that all rendered content is transformed.

**Acceptance Criteria:**
- [ ] `ThemeService` reads the `colorblindMode` option via `getOption`
- [ ] An `effect()` applies a CSS `filter` property on `document.documentElement` (or a wrapping element) using an appropriate SVG color matrix for each mode
- [ ] When mode is `'none'`, no filter is applied
- [ ] Switching modes at runtime updates the filter immediately without a page reload
- [ ] Typecheck/lint passes

### US-003: Add Colorblind Mode Selector to Options UI
**Description:** As a player, I want a dropdown or radio group in the UI options panel so that I can choose my preferred colorblind mode.

**Acceptance Criteria:**
- [ ] `PanelOptionsUIComponent` displays a labeled selector for colorblind mode
- [ ] Options listed: None, Deuteranopia, Protanopia, Tritanopia
- [ ] Selecting an option updates the option signal and persists the choice
- [ ] Current selection is visually indicated
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Create SVG Color Matrix Filters
**Description:** As a developer, I want accurate SVG `<feColorMatrix>` definitions for each colorblind type so that the CSS filter produces a perceptually correct simulation/correction.

**Acceptance Criteria:**
- [ ] An inline SVG with `<filter>` definitions is injected into the DOM (or stored in `assets/`)
- [ ] Deuteranopia matrix is based on established research (Brettel et al. or Machado et al.)
- [ ] Protanopia matrix is based on established research
- [ ] Tritanopia matrix is based on established research
- [ ] Filters are referenced by CSS `filter: url(#filter-id)`
- [ ] Typecheck/lint passes

### US-005: Ensure Icon and Sprite Distinguishability
**Description:** As a player with color vision deficiency, I want all game icons, sprites, and resource indicators to remain distinguishable when a colorblind mode is active so that I can play effectively.

**Acceptance Criteria:**
- [ ] Atlas sprites rendered via `AtlasImageComponent` and `AtlasAnimationComponent` are affected by the applied filter
- [ ] Resource icons (currencies, stats) remain distinguishable under all three modes
- [ ] No two semantically different UI elements collapse to the same apparent color under any mode
- [ ] Verified using Chrome DevTools > Rendering > Emulate vision deficiencies
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Add Unit Tests for Colorblind Option Persistence
**Description:** As a developer, I want tests confirming the colorblind mode option is correctly read, written, and defaulted so that regressions are caught.

**Acceptance Criteria:**
- [ ] Test in `src/app/helpers/` verifies default value is `'none'`
- [ ] Test verifies setting and retrieving each mode value
- [ ] Tests pass via `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must provide a `colorblindMode` option with values `'none'`, `'deuteranopia'`, `'protanopia'`, and `'tritanopia'`.
- FR-2: When a user selects a colorblind mode, the entire application viewport must be rendered through the corresponding color transformation filter.
- FR-3: The selected mode must persist across browser sessions and Electron restarts via localStorage.
- FR-4: When `'none'` is selected, no color transformation is applied and rendering performance is unaffected.
- FR-5: The colorblind mode selector must appear in the UI tab of the options panel.

## Non-Goals (Out of Scope)
- Custom user-defined color matrices
- Per-element color overrides (the global CSS filter approach covers all elements uniformly)
- Daltonization (color correction to make colors "right") -- this feature provides simulation-aware palettes, not color correction algorithms
- Automated testing of visual distinguishability (manual verification is sufficient for this phase)

## Technical Considerations
- The CSS `filter` property with an SVG `<feColorMatrix>` is well-supported in all modern browsers and Electron.
- Applying a filter to `document.documentElement` may have performance implications; if so, apply it to the Angular app root element instead.
- DaisyUI themes already define semantic color variables; the filter approach transforms all colors uniformly without needing to override individual theme variables.
- The `ThemeService` already uses `effect()` to reactively apply the `data-theme` attribute; the colorblind filter can follow the same pattern.
- The existing `localStorageSignal` helper in `src/app/helpers/signal.ts` is the correct persistence mechanism for UI options.

## Success Metrics
- 100% of UI elements remain visually distinguishable under each colorblind mode when verified with Chrome DevTools vision deficiency emulation
- Option persists correctly across page reloads
- No measurable frame rate degradation when a filter is active

## Open Questions
- Should we also add a "custom" mode that lets users adjust color matrix values directly?
- Are there specific game elements (e.g., biome color coding) that need supplementary non-color indicators (icons, patterns) beyond the filter approach?
- Should we consider a daltonization (correction) approach in addition to or instead of simulation filters?
