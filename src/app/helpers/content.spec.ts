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
  const mockWeapon: IsContentItem = {
    id: 'sword-1',
    name: 'Iron Sword',
    __type: 'weapon',
  };

  const mockArmor: IsContentItem = {
    id: 'armor-1',
    name: 'Leather Armor',
    __type: 'trinket',
  };

  const mockSkill: IsContentItem = {
    id: 'skill-1',
    name: 'Fireball',
    __type: 'pet',
  };

  const mockSkill2: IsContentItem = {
    id: 'skill-2',
    name: 'Ice Bolt',
    __type: 'pet',
  };

  const mockGuardian: IsContentItem = {
    id: 'guardian-1',
    name: 'Fire Elemental',
    __type: 'monster',
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
        ['Iron Sword', 'sword-1'],
        ['Fireball', 'skill-1'],
      ]);

      contentSetAllIdsByName(nameToIdMap);

      const result = contentAllIdsByName();
      expect(result.get('Iron Sword')).toBe('sword-1');
      expect(result.get('Fireball')).toBe('skill-1');
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
        ['sword-1', mockWeapon],
        ['skill-1', mockSkill],
      ]);

      contentSetAllById(contentMap);

      const result = contentAllById();
      expect(result.get('sword-1')).toEqual(mockWeapon);
      expect(result.get('skill-1')).toEqual(mockSkill);
    });

    it('should create a new Map instance (not reference)', () => {
      const originalMap = new Map([['test-1', mockWeapon]]);

      contentSetAllById(originalMap);

      const storedMap = contentAllById();
      expect(storedMap).not.toBe(originalMap);
      expect(storedMap.get('test-1')).toEqual(mockWeapon);
    });

    it('should handle empty map', () => {
      contentSetAllById(new Map());

      const result = contentAllById();
      expect(result.size).toBe(0);
    });

    it('should replace existing content', () => {
      const firstMap = new Map([['item-1', mockWeapon]]);
      const secondMap = new Map([['item-2', mockArmor]]);

      contentSetAllById(firstMap);
      expect(contentAllById().get('item-1')).toEqual(mockWeapon);

      contentSetAllById(secondMap);
      expect(contentAllById().get('item-1')).toBeUndefined();
      expect(contentAllById().get('item-2')).toEqual(mockArmor);
    });
  });

  describe('contentGetEntriesByType', () => {
    beforeEach(() => {
      // Set up test data
      const contentMap = new Map([
        ['sword-1', mockWeapon],
        ['armor-1', mockArmor],
        ['skill-1', mockSkill],
        ['skill-2', mockSkill2],
        ['guardian-1', mockGuardian],
      ]);
      contentSetAllById(contentMap);
    });

    it('should return all entries of a specific type', () => {
      const skills = contentGetEntriesByType<IsContentItem>('pet');

      expect(skills).toHaveLength(2);
      expect(skills).toContain(mockSkill);
      expect(skills).toContain(mockSkill2);
    });

    it('should return empty array for non-existent type', () => {
      const currency = contentGetEntriesByType<IsContentItem>('currency');

      expect(currency).toHaveLength(0);
      expect(Array.isArray(currency)).toBe(true);
    });

    it('should return only weapons when filtering by weapon type', () => {
      const weapons = contentGetEntriesByType<IsContentItem>('weapon');

      expect(weapons).toHaveLength(1);
      expect(weapons[0]).toEqual(mockWeapon);
    });

    it('should return only armor when filtering by armor type', () => {
      const armor = contentGetEntriesByType<IsContentItem>('trinket');

      expect(armor).toHaveLength(1);
      expect(armor[0]).toEqual(mockArmor);
    });

    it('should return only guardians when filtering by guardian type', () => {
      const guardians = contentGetEntriesByType<IsContentItem>('monster');

      expect(guardians).toHaveLength(1);
      expect(guardians[0]).toEqual(mockGuardian);
    });

    it('should handle all content types', () => {
      const allTypes: ContentType[] = [
        'hero',
        'inhabitant',
        'item',
        'monster',
        'pet',
        'reputationaction',
        'research',
        'room',
        'roomshape',
        'stage',
        'trinket',
        'weapon',
      ];

      // Should not throw for any content type
      allTypes.forEach((type) => {
        expect(() => contentGetEntriesByType<IsContentItem>(type)).not.toThrow();
      });
    });

    it('should return empty array when no content is loaded', () => {
      contentSetAllById(new Map());

      const skills = contentGetEntriesByType<IsContentItem>('pet');
      expect(skills).toHaveLength(0);
    });
  });

  describe('contentGetEntry', () => {
    beforeEach(() => {
      // Set up test data
      const nameToIdMap = new Map([
        ['Iron Sword', 'sword-1'],
        ['Fireball', 'skill-1'],
        ['Leather Armor', 'armor-1'],
      ]);

      const contentMap = new Map([
        ['sword-1', mockWeapon],
        ['armor-1', mockArmor],
        ['skill-1', mockSkill],
        ['guardian-1', mockGuardian],
      ]);

      contentSetAllIdsByName(nameToIdMap);
      contentSetAllById(contentMap);
    });

    it('should return entry when queried by id', () => {
      const result = contentGetEntry<IsContentItem>('sword-1');
      expect(result).toEqual(mockWeapon);
    });

    it('should return entry when queried by name', () => {
      const result = contentGetEntry<IsContentItem>('Iron Sword');
      expect(result).toEqual(mockWeapon);
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
      const result = contentGetEntry<IsContentItem>(undefined as unknown as string);
      expect(result).toBeUndefined();
    });

    it('should prioritize name lookup over direct id lookup', () => {
      // Add a content item with id that matches another item's name
      const conflictItem: IsContentItem = {
        id: 'Iron Sword',
        name: 'Conflicting Item',
        __type: 'trinket',
      };

      const contentMap = new Map([
        ['sword-1', mockWeapon],
        ['Iron Sword', conflictItem],
      ]);
      contentSetAllById(contentMap);

      const result = contentGetEntry<IsContentItem>('Iron Sword');
      expect(result).toEqual(mockWeapon); // Should return the name lookup result, not direct id
    });

    it('should handle name lookup when id lookup fails', () => {
      const result = contentGetEntry<IsContentItem>('Fireball');
      expect(result).toEqual(mockSkill);
    });

    it('should handle multiple entries of same type correctly', () => {
      const skillResult = contentGetEntry<IsContentItem>('skill-1');
      expect(skillResult).toEqual(mockSkill);
      expect(skillResult?.__type).toBe('pet');
    });

    it('should handle case-sensitive lookups', () => {
      const lowerCase = contentGetEntry<IsContentItem>('iron sword');
      const upperCase = contentGetEntry<IsContentItem>('IRON SWORD');
      const correctCase = contentGetEntry<IsContentItem>('Iron Sword');

      expect(lowerCase).toBeUndefined();
      expect(upperCase).toBeUndefined();
      expect(correctCase).toEqual(mockWeapon);
    });

    it('should work with generic type parameter', () => {
      interface MockWeaponItem extends IsContentItem {
        damage: number;
      }

      const typedWeapon: MockWeaponItem = {
        ...mockWeapon,
        damage: 10,
      };

      const contentMap = new Map([['sword-1', typedWeapon]]);
      contentSetAllById(contentMap);

      const result = contentGetEntry<MockWeaponItem>('sword-1');
      expect(result).toEqual(typedWeapon);
      expect(result?.damage).toBe(10);
    });
  });

  describe('Integration tests', () => {
    it('should work with complete content workflow', () => {
      // Set up both mappings
      const nameToIdMap = new Map([
        ['Magic Sword', 'magic-sword-1'],
        ['Lightning Bolt', 'lightning-skill-1'],
      ]);

      const magicSword: IsContentItem = {
        id: 'magic-sword-1',
        name: 'Magic Sword',
        __type: 'weapon',
      };

      const lightningBolt: IsContentItem = {
        id: 'lightning-skill-1',
        name: 'Lightning Bolt',
        __type: 'pet',
      };

      const contentMap = new Map([
        ['magic-sword-1', magicSword],
        ['lightning-skill-1', lightningBolt],
      ]);

      contentSetAllIdsByName(nameToIdMap);
      contentSetAllById(contentMap);

      // Test filtering by type
      const weapons = contentGetEntriesByType<IsContentItem>('weapon');
      const skills = contentGetEntriesByType<IsContentItem>('pet');

      expect(weapons).toHaveLength(1);
      expect(weapons[0]).toEqual(magicSword);
      expect(skills).toHaveLength(1);
      expect(skills[0]).toEqual(lightningBolt);

      // Test getting by name and id
      expect(contentGetEntry<IsContentItem>('Magic Sword')).toEqual(magicSword);
      expect(contentGetEntry<IsContentItem>('magic-sword-1')).toEqual(magicSword);
      expect(contentGetEntry<IsContentItem>('Lightning Bolt')).toEqual(lightningBolt);
      expect(contentGetEntry<IsContentItem>('lightning-skill-1')).toEqual(
        lightningBolt,
      );
    });

    it('should handle content updates correctly', () => {
      // Initial setup
      const initialNameMap = new Map([['Item A', 'item-1']]);
      const initialContentMap = new Map([['item-1', mockWeapon]]);

      contentSetAllIdsByName(initialNameMap);
      contentSetAllById(initialContentMap);

      expect(contentGetEntry<IsContentItem>('Item A')).toEqual(mockWeapon);

      // Update content
      const updatedNameMap = new Map([['Item B', 'item-2']]);
      const updatedContentMap = new Map([['item-2', mockArmor]]);

      contentSetAllIdsByName(updatedNameMap);
      contentSetAllById(updatedContentMap);

      expect(contentGetEntry<IsContentItem>('Item A')).toBeUndefined();
      expect(contentGetEntry<IsContentItem>('Item B')).toEqual(mockArmor);
    });

    it('should maintain data integrity across multiple operations', () => {
      const largeNameMap = new Map();
      const largeContentMap = new Map();

      // Create a larger dataset
      for (let i = 1; i <= 100; i++) {
        const item: IsContentItem = {
          id: `item-${i}`,
          name: `Item ${i}`,
          __type: i % 2 === 0 ? 'weapon' : 'trinket',
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
      const weapons = contentGetEntriesByType<IsContentItem>('weapon');
      const armor = contentGetEntriesByType<IsContentItem>('trinket');

      expect(weapons.length).toBe(50);
      expect(armor.length).toBe(50);
      expect(weapons.length + armor.length).toBe(100);
    });
  });
});
