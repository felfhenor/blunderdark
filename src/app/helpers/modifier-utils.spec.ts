import { describe, expect, it } from 'vitest';
import { findModifierMultiplier } from '@helpers/modifier-utils';

type TestModifier = { name: string; multiplier: number };

describe('findModifierMultiplier', () => {
  it('should return 1.0 for empty array', () => {
    expect(findModifierMultiplier([] as TestModifier[], () => true)).toBe(1.0);
  });

  it('should return 1.0 when no match found', () => {
    const items: TestModifier[] = [{ name: 'a', multiplier: 1.5 }];
    expect(findModifierMultiplier(items, (i) => i.name === 'b')).toBe(1.0);
  });

  it('should return multiplier of matching item', () => {
    const items: TestModifier[] = [
      { name: 'a', multiplier: 1.5 },
      { name: 'b', multiplier: 2.0 },
    ];
    expect(findModifierMultiplier(items, (i) => i.name === 'b')).toBe(2.0);
  });

  it('should return first match when multiple items match', () => {
    const items: TestModifier[] = [
      { name: 'a', multiplier: 1.5 },
      { name: 'a', multiplier: 2.0 },
    ];
    expect(findModifierMultiplier(items, (i) => i.name === 'a')).toBe(1.5);
  });

  it('should work with readonly arrays', () => {
    const items: readonly TestModifier[] = [
      { name: 'x', multiplier: 0.75 },
    ];
    expect(findModifierMultiplier(items, (i) => i.name === 'x')).toBe(0.75);
  });
});
