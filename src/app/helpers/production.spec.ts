import { describe, expect, it, vi } from 'vitest';

vi.mock('@helpers/content', () => {
  const rooms = new Map<string, unknown>();
  rooms.set('room-crystal-mine', {
    id: 'room-crystal-mine',
    name: 'Crystal Mine',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { crystals: 1.0 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });
  rooms.set('room-throne', {
    id: 'room-throne',
    name: 'Throne Room',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: { gold: 0.5 },
    requiresWorkers: false,
    adjacencyBonuses: [],
  });
  rooms.set('room-barracks', {
    id: 'room-barracks',
    name: 'Barracks',
    __type: 'room',
    description: '',
    shapeId: 'shape-1',
    cost: {},
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  return {
    getEntry: vi.fn((id: string) => rooms.get(id)),
    getEntries: vi.fn(),
    allIdsByName: vi.fn(() => new Map()),
  };
});

import { getBaseProduction, getRoomDefinition } from '@helpers/production';

describe('getBaseProduction', () => {
  it('should return production for a room type with production', () => {
    const production = getBaseProduction('room-crystal-mine');
    expect(production).toEqual({ crystals: 1.0 });
  });

  it('should return production for throne room', () => {
    const production = getBaseProduction('room-throne');
    expect(production).toEqual({ gold: 0.5 });
  });

  it('should return empty object for room with no production', () => {
    const production = getBaseProduction('room-barracks');
    expect(production).toEqual({});
  });

  it('should return empty object for non-existent room type', () => {
    const production = getBaseProduction('room-nonexistent');
    expect(production).toEqual({});
  });
});

describe('getRoomDefinition', () => {
  it('should return room definition for valid id', () => {
    const room = getRoomDefinition('room-crystal-mine');
    expect(room).toBeDefined();
    expect(room!.name).toBe('Crystal Mine');
    expect(room!.requiresWorkers).toBe(true);
  });

  it('should return undefined for non-existent id', () => {
    const room = getRoomDefinition('room-nonexistent');
    expect(room).toBeUndefined();
  });
});
