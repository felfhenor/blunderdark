import { describe, expect, it, vi } from 'vitest';
import { createLazyCache } from '@helpers/lazy-cache';

describe('createLazyCache', () => {
  it('should call builder on first get()', () => {
    const builder = vi.fn(() => 42);
    const cache = createLazyCache(builder);

    expect(cache.get()).toBe(42);
    expect(builder).toHaveBeenCalledOnce();
  });

  it('should return cached value on subsequent get() calls', () => {
    const builder = vi.fn(() => ({ key: 'value' }));
    const cache = createLazyCache(builder);

    const first = cache.get();
    const second = cache.get();

    expect(first).toBe(second); // same reference
    expect(builder).toHaveBeenCalledOnce();
  });

  it('should rebuild after reset()', () => {
    let counter = 0;
    const builder = vi.fn(() => ++counter);
    const cache = createLazyCache(builder);

    expect(cache.get()).toBe(1);
    cache.reset();
    expect(cache.get()).toBe(2);
    expect(builder).toHaveBeenCalledTimes(2);
  });

  it('should not call builder on reset()', () => {
    const builder = vi.fn(() => 'data');
    const cache = createLazyCache(builder);

    cache.get(); // trigger build
    cache.reset();

    expect(builder).toHaveBeenCalledOnce();
  });

  it('should work with Map builder', () => {
    const cache = createLazyCache(() => new Map([['a', 1], ['b', 2]]));
    expect(cache.get().get('a')).toBe(1);
    expect(cache.get().size).toBe(2);
  });
});
