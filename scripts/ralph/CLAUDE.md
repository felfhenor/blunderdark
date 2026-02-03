# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blunderdark is a browser-based and desktop dungeon-building game built with Angular 20, TypeScript, and Electron. Game content is defined in YAML files, compiled to JSON at build time, and delivered alongside generated sprite atlases. PIXI is used to render the world.

## Commands

- **Dev server:** `npm start` (runs Angular dev server on port 9766 + gamedata watcher concurrently)
- **First-time setup:** `npm run setup` (builds gamedata; also runs automatically via `postinstall`)
- **Build:** `npm run build` (full production build: versioninfo, gamedata, spritesheets, Angular, changelog)
- **Lint:** `npm run lint`
- **Test:** `npm run test` (Vitest single run)
- **Test watch:** `npm run test:watch` (Vitest UI on port 9899)
- **Build gamedata:** `npm run gamedata:build` (compiles YAML to JSON)
- **Generate schemas:** `npm run schemas:generate` (TypeScript types from gamedata)
- **Generate spritesheets:** `npm run gamedata:art:spritesheets`
- **Electron build:** `npm run build:electron`

Tests are scoped to `src/app/helpers/**/*.spec.ts` only.

## Architecture

### State Management

Angular Signals are the primary state mechanism. Custom persistent signal helpers (`localStorageSignal`, `indexedDbSignal` in `src/app/helpers/signal.ts`) sync state to localStorage and IndexedDB respectively. Game state lives in IndexedDB; UI options live in localStorage.

### Content Pipeline

`gamedata/` contains YAML definitions for currencies, invaders, inhabitants, decorations, pets, and rooms. Build scripts in `scripts/` compile YAML to JSON, generate TypeScript schemas, and create sprite atlases from individual images in `gameassets/`. The `ContentService` loads compiled JSON and spritesheets at app init. All resources have a unique UUID and name - they cannot overlap with any other data. All content must go in this folder.

### Game Loop

`src/app/helpers/gameloop.ts` implements a tick-based game loop with pause/resume. Uses a scheduler that yields to the browser event loop.

### Routing

Pages are in `src/app/pages/` with route guards in `src/app/guards/` that enforce setup completion before game access. Routes: Home, Setup, Transition, Game, Game-Play, Game-Setup-World, Game-Generate-World.

### Path Aliases

TypeScript path aliases are configured in `tsconfig.json`: `@components/*`, `@services/*`, `@helpers/*`, `@interfaces/*`, `@directives/*`, `@guards/*`, `@pages/*`, `@routes/*`, `@environments/*`, `@pipes/*`. Barrel exports exist at `@helpers` and `@interfaces`.

## Code Conventions

- **Types over interfaces** — use `type` instead of `interface` in all cases
- **Do not use enums** - use union types of string literals instead
- **Standalone components only** — no NgModules. Do NOT set `standalone: true` in decorators (it's the default in Angular 20)
- **Signals for state** — use `input()`/`output()` functions instead of decorators; use `computed()` for derived state; use `update`/`set` on signals, never `mutate`
- **OnPush change detection** — set `changeDetection: ChangeDetectionStrategy.OnPush` on all components
- **Native control flow** — use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- **Class/style bindings** — use `class` and `style` bindings, not `ngClass`/`ngStyle`
- **Host bindings** — put in the `host` object of decorator, not `@HostBinding`/`@HostListener`
- **Inject function** — use `inject()` instead of constructor injection
- **Services** — `providedIn: 'root'` for singletons
- **Interfaces** — define in `src/app/interfaces/`, not exported from services or components
- **Sorting** — use `sortBy` from `es-toolkit/compat` instead of `Array.sort()`
- **Avoid `any`** — use `unknown` when type is uncertain
- **Images** — use `NgOptimizedImage` for all static images
- **Inline templates** — preferred for small components
- **Reactive forms** — preferred over template-driven forms
