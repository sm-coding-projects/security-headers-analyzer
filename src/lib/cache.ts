// Cache implementation - stub for testing

export class InMemoryCache<T> {
  constructor(private options: { ttl: number; maxSize: number }) {}

  get(_key: string): T | null {
    // Implementation would go here
    return null;
  }

  set(_key: string, _value: T): void {
    // Implementation would go here
  }
}

export function generateCacheKey(url: string): string {
  // Implementation would go here
  return `cache-${url}`;
}