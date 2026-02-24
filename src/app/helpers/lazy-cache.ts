/**
 * Create a lazily-initialized, resettable cache.
 * The builder function is called on first access and the result is cached
 * until reset() is called.
 */
export function createLazyCache<T>(builder: () => T): {
  get: () => T;
  reset: () => void;
} {
  let cache: T | undefined;
  return {
    get(): T {
      if (cache === undefined) {
        cache = builder();
      }
      return cache;
    },
    reset(): void {
      cache = undefined;
    },
  };
}
