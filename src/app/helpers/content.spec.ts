import {
  contentAllById,
  contentAllIdsByName,
  contentGetEntriesByType,
  contentGetEntry,
  contentSetAllById,
  contentSetAllIdsByName,
} from '@helpers/content';
import type { ContentType, IsContentItem } from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Angular core to avoid dependencies
vi.mock('@angular/core', () => ({
  signal: vi.fn((initialValue) => {
    let value = initialValue;
    const signalFn = vi.fn(() => value) as unknown as {
      (): typeof initialValue;
      set: (newValue: typeof initialValue) => void;
      asReadonly: () => unknown;
    };
    signalFn.set = vi.fn((newValue: typeof initialValue) => {
      value = newValue;
    });
    signalFn.asReadonly = vi.fn(() => signalFn);
    return signalFn;
  }),
}));

describe('Content Functions', () => {
  // Mock content data for testing
  const mockAbilityEffect: IsContentItem = {
    id: 'effect-1',
    name: 'Fireball Effect',
    __type: 'abilityeffect',
  };

  const mockAbilityEffect2: IsContentItem = {
    id: 'effect-2',
    name: 'Ice Bolt Effect',
    __type: 'abilityeffect',
  };

  const mockCombatAbility: IsContentItem = {
    id: 'combat-1',
    name: 'Attack',
    __type: 'combatability',
  };

  const mockInhabitant: IsContentItem = {
    id: 'inhabitant-1',
    name: 'Worker',
    __type: 'inhabitant',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the content state before each test
    contentSetAllIdsByName(new Map());
    contentSetAllById(new Map());
  });

  describe('contentSetAllIdsByName', () => {
    it('should set the name-to-id mapping', () => {
      const nameToIdMap = new Map([
        ['Fireball Effect', 'effect-1'],
        ['Attack', 'combat-1'],
      ]);

      contentSetAllIdsByName(nameToIdMap);

      const result = contentAllIdsByName();
      expect(result.get('Fireball Effect')).toBe('effect-1');
      expect(result.get('Attack')).toBe('combat-1');
    });

    it('should create a new Map instance (not reference)', () => {
      const originalMap = new Map([['Test Item', 'test-1']]);

      contentSetAllIdsByName(originalMap);

      const storedMap = contentAllIdsByName();
      expect(storedMap).not.toBe(originalMap);
      expect(storedMap.get('Test Item')).toBe('test-1');
    });

    it('should handle empty map', () => {
      contentSetAllIdsByName(new Map());

      const result = contentAllIdsByName();
      expect(result.size).toBe(0);
    });

    it('should replace existing mapping', () => {
      const firstMap = new Map([['Item A', 'id-1']]);
      const secondMap = new Map([['Item B', 'id-2']]);

      contentSetAllIdsByName(firstMap);
      expect(contentAllIdsByName().get('Item A')).toBe('id-1');

      contentSetAllIdsByName(secondMap);
      expect(contentAllIdsByName().get('Item A')).toBeUndefined();
      expect(contentAllIdsByName().get('Item B')).toBe('id-2');
    });
  });

  describe('contentSetAllById', () => {
    it('should set the id-to-content mapping', () => {
      const contentMap = new Map([
        ['effect-1', mockAbilityEffect],
        ['combat-1', mockCombatAbility],
      ]);

      contentSetAllById(contentMap);

      const result = contentAllById();
      expect(result.get('effect-1')).toEqual(mockAbilityEffect);
      expect(result.get('combat-1')).toEqual(mockCombatAbility);
    });

    it('should create a new Map instance (not reference)', () => {
      const originalMap = new Map([['test-1', mockAbilityEffect]]);

      contentSetAllById(originalMap);

      const storedMap = contentAllById();
      expect(storedMap).not.toBe(originalMap);
      expect(storedMap.get('test-1')).toEqual(mockAbilityEffect);
    });

    it('should handle empty map', () => {
      contentSetAllById(new Map());

      const result = contentAllById();
      expect(result.size).toBe(0);
    });

    it('should replace existing content', () => {
      const firstMap = new Map([['item-1', mockAbilityEffect]]);
      const secondMap = new Map([['item-2', mockAbilityEffect2]]);

      contentSetAllById(firstMap);
      expect(contentAllById().get('item-1')).toEqual(mockAbilityEffect);

      contentSetAllById(secondMap);
      expect(contentAllById().get('item-1')).toBeUndefined();
      expect(contentAllById().get('item-2')).toEqual(mockAbilityEffect2);
    });
  });

  describe('contentGetEntriesByType', () => {
    beforeEach(() => {
      // Set up test data
      const contentMap = new Map([
        ['effect-1', mockAbilityEffect],
        ['effect-2', mockAbilityEffect2],
        ['combat-1', mockCombatAbility],
        ['inhabitant-1', mockInhabitant],
      ]);
      contentSetAllById(contentMap);
    });

    it('should return all entries of a specific type', () => {
      const effects = contentGetEntriesByType<IsContentItem>('abilityeffect');

      expect(effects).toHaveLength(2);
      expect(effects).toContain(mockAbilityEffect);
      expect(effects).toContain(mockAbilityEffect2);
    });

    it('should return only ability effects when filtering by abilityeffect type', () => {
      const effects = contentGetEntriesByType<IsContentItem>('abilityeffect');

      expect(effects).toHaveLength(2);
      expect(effects[0]).toEqual(mockAbilityEffect);
    });

    it('should return only combat abilities when filtering by combatability type', () => {
      const combatAbilities =
        contentGetEntriesByType<IsContentItem>('combatability');

      expect(combatAbilities).toHaveLength(1);
      expect(combatAbilities[0]).toEqual(mockCombatAbility);
    });

    it('should return only inhabitants when filtering by inhabitant type', () => {
      const inhabitants = contentGetEntriesByType<IsContentItem>('inhabitant');

      expect(inhabitants).toHaveLength(1);
      expect(inhabitants[0]).toEqual(mockInhabitant);
    });

    it('should handle all content types', () => {
      const allTypes: ContentType[] = [
        'abilityeffect',
        'combatability',
        'inhabitant',
        'invader',
        'invasion',
        'reputationaction',
        'research',
        'room',
        'roomshape',
        'seasonbonus',
        'synergy',
        'trap',
      ];

      // Should not throw for any content type
      allTypes.forEach((type) => {
        expect(() =>
          contentGetEntriesByType<IsContentItem>(type),
        ).not.toThrow();
      });
    });

    it('should return empty array when no content is loaded', () => {
      contentSetAllById(new Map());

      const effects = contentGetEntriesByType<IsContentItem>('abilityeffect');
      expect(effects).toHaveLength(0);
    });
  });

  describe('contentGetEntry', () => {
    beforeEach(() => {
      // Set up test data
      const nameToIdMap = new Map([
        ['Fireball Effect', 'effect-1'],
        ['Attack', 'combat-1'],
        ['Worker', 'inhabitant-1'],
      ]);

      const contentMap = new Map([
        ['effect-1', mockAbilityEffect],
        ['combat-1', mockCombatAbility],
        ['inhabitant-1', mockInhabitant],
      ]);

      contentSetAllIdsByName(nameToIdMap);
      contentSetAllById(contentMap);
    });

    it('should return entry when queried by id', () => {
      const result = contentGetEntry<IsContentItem>('effect-1');
      expect(result).toEqual(mockAbilityEffect);
    });

    it('should return entry when queried by name', () => {
      const result = contentGetEntry<IsContentItem>('Fireball Effect');
      expect(result).toEqual(mockAbilityEffect);
    });

    it('should return undefined for non-existent id', () => {
      const result = contentGetEntry<IsContentItem>('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent name', () => {
      const result = contentGetEntry<IsContentItem>('Non-existent Item');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = contentGetEntry<IsContentItem>('');
      expect(result).toBeUndefined();
    });

    it('should return undefined for null input', () => {
      const result = contentGetEntry<IsContentItem>(null as unknown as string);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      const result = contentGetEntry<IsContentItem>(
        undefined as unknown as string,
      );
      expect(result).toBeUndefined();
    });

    it('should prioritize name lookup over direct id lookup', () => {
      // Add a content item with id that matches another item's name
      const conflictItem: IsContentItem = {
        id: 'Fireball Effect',
        name: 'Conflicting Item',
        __type: 'combatability',
      };

      const contentMap = new Map([
        ['effect-1', mockAbilityEffect],
        ['Fireball Effect', conflictItem],
      ]);
      contentSetAllById(contentMap);

      const result = contentGetEntry<IsContentItem>('Fireball Effect');
      expect(result).toEqual(mockAbilityEffect); // Should return the name lookup result, not direct id
    });

    it('should handle name lookup when id lookup fails', () => {
      const result = contentGetEntry<IsContentItem>('Fireball Effect');
      expect(result).toEqual(mockAbilityEffect);
    });

    it('should handle multiple entries of same type correctly', () => {
      const effectResult = contentGetEntry<IsContentItem>('effect-1');
      expect(effectResult).toEqual(mockAbilityEffect);
      expect(effectResult?.__type).toBe('abilityeffect');
    });

    it('should handle case-sensitive lookups', () => {
      const lowerCase = contentGetEntry<IsContentItem>('fireball effect');
      const upperCase = contentGetEntry<IsContentItem>('FIREBALL EFFECT');
      const correctCase = contentGetEntry<IsContentItem>('Fireball Effect');

      expect(lowerCase).toBeUndefined();
      expect(upperCase).toBeUndefined();
      expect(correctCase).toEqual(mockAbilityEffect);
    });

    it('should work with generic type parameter', () => {
      interface MockAbilityItem extends IsContentItem {
        power: number;
      }

      const typedAbility: MockAbilityItem = {
        ...mockAbilityEffect,
        power: 10,
      };

      const contentMap = new Map([['effect-1', typedAbility]]);
      contentSetAllById(contentMap);

      const result = contentGetEntry<MockAbilityItem>('effect-1');
      expect(result).toEqual(typedAbility);
      expect(result?.power).toBe(10);
    });
  });

  describe('Integration tests', () => {
    it('should work with complete content workflow', () => {
      // Set up both mappings
      const nameToIdMap = new Map([
        ['Thunder Effect', 'thunder-effect-1'],
        ['Lightning Ability', 'lightning-ability-1'],
      ]);

      const thunderEffect: IsContentItem = {
        id: 'thunder-effect-1',
        name: 'Thunder Effect',
        __type: 'abilityeffect',
      };

      const lightningAbility: IsContentItem = {
        id: 'lightning-ability-1',
        name: 'Lightning Ability',
        __type: 'combatability',
      };

      const contentMap = new Map([
        ['thunder-effect-1', thunderEffect],
        ['lightning-ability-1', lightningAbility],
      ]);

      contentSetAllIdsByName(nameToIdMap);
      contentSetAllById(contentMap);

      // Test filtering by type
      const effects = contentGetEntriesByType<IsContentItem>('abilityeffect');
      const abilities = contentGetEntriesByType<IsContentItem>('combatability');

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual(thunderEffect);
      expect(abilities).toHaveLength(1);
      expect(abilities[0]).toEqual(lightningAbility);

      // Test getting by name and id
      expect(contentGetEntry<IsContentItem>('Thunder Effect')).toEqual(
        thunderEffect,
      );
      expect(contentGetEntry<IsContentItem>('thunder-effect-1')).toEqual(
        thunderEffect,
      );
      expect(contentGetEntry<IsContentItem>('Lightning Ability')).toEqual(
        lightningAbility,
      );
      expect(contentGetEntry<IsContentItem>('lightning-ability-1')).toEqual(
        lightningAbility,
      );
    });

    it('should handle ability effect content updates correctly', () => {
      // Initial setup
      const initialNameMap = new Map([
        ['Fireball Effect', 'effect-1'],
        ['Ice Bolt Effect', 'effect-2'],
      ]);
      const initialContentMap = new Map([
        ['effect-1', mockAbilityEffect],
        ['effect-2', mockAbilityEffect2],
      ]);

      contentSetAllIdsByName(initialNameMap);
      contentSetAllById(initialContentMap);

      expect(contentGetEntry<IsContentItem>('Fireball Effect')).toEqual(
        mockAbilityEffect,
      );
      expect(contentGetEntry<IsContentItem>('Ice Bolt Effect')).toEqual(
        mockAbilityEffect2,
      );
    });

    it('should handle content updates correctly', () => {
      // Initial setup
      const initialNameMap = new Map([['Effect A', 'effect-1']]);
      const initialContentMap = new Map([['effect-1', mockAbilityEffect]]);

      contentSetAllIdsByName(initialNameMap);
      contentSetAllById(initialContentMap);

      expect(contentGetEntry<IsContentItem>('Effect A')).toEqual(
        mockAbilityEffect,
      );

      // Update content
      const updatedNameMap = new Map([['Effect B', 'effect-2']]);
      const updatedContentMap = new Map([['effect-2', mockAbilityEffect2]]);

      contentSetAllIdsByName(updatedNameMap);
      contentSetAllById(updatedContentMap);

      expect(contentGetEntry<IsContentItem>('Effect A')).toBeUndefined();
      expect(contentGetEntry<IsContentItem>('Effect B')).toEqual(
        mockAbilityEffect2,
      );
    });

    it('should maintain data integrity across multiple operations', () => {
      const largeNameMap = new Map();
      const largeContentMap = new Map();

      // Create a larger dataset
      for (let i = 1; i <= 100; i++) {
        const item: IsContentItem = {
          id: `item-${i}`,
          name: `Item ${i}`,
          __type: i % 2 === 0 ? 'abilityeffect' : 'combatability',
        };
        largeNameMap.set(`Item ${i}`, `item-${i}`);
        largeContentMap.set(`item-${i}`, item);
      }

      contentSetAllIdsByName(largeNameMap);
      contentSetAllById(largeContentMap);

      // Test random access
      expect(contentGetEntry<IsContentItem>('Item 50')).toBeDefined();
      expect(contentGetEntry<IsContentItem>('item-75')).toBeDefined();

      // Test filtering
      const effects = contentGetEntriesByType<IsContentItem>('abilityeffect');
      const abilities = contentGetEntriesByType<IsContentItem>('combatability');

      expect(effects.length).toBe(50);
      expect(abilities.length).toBe(50);
      expect(effects.length + abilities.length).toBe(100);
    });
  });
});
