// Cache implementation - stub for testing

export class InMemoryCache<T> {
  constructor(private options: { ttl: number; maxSize: number }) {}

  get(key: string): T | null {
    // Implementation would go here
    return null;
  }

  set(key: string, value: T): void {
    // Implementation would go here
  }
}

export function generateCacheKey(url: string): string {
  // Implementation would go here
  return `cache-${url}`;
}