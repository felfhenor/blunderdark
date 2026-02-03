# Helpers Directory

## World Generation Configuration Pattern

When adding new pre-worldgen configuration options (like world seed or starting biome):

1. Create a module-level signal in `world.ts` to store the selection
2. Create setter/getter functions (e.g., `setStartingBiome()`, `getStartingBiome()`)
3. If the option needs resolution (like 'random' -> actual value), add a resolve function
4. Call the resolve function in `worldgenGenerateWorld()` and pass to relevant defaults

Example pattern from starting biome:
```typescript
const _startingBiome = signal<BiomeType | 'random'>('neutral');
export function setStartingBiome(biome: BiomeType | 'random'): void { ... }
export function resolveStartingBiome(): BiomeType { ... }
```

## Default Factories

Functions like `defaultFloor()`, `defaultResources()`, etc. in `defaults.ts` create initial state objects. When adding optional configuration:
- Add parameters with sensible defaults to maintain backwards compatibility
- Example: `defaultFloor(depth = 1, biome: Floor['biome'] = 'neutral')`

## Biome Data

`BIOME_DATA` in `@interfaces/biome` provides display info (name, description, color) for each biome type. Use this for UI rendering rather than hardcoding biome display strings.
