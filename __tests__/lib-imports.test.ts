/**
 * @jest-environment node
 */

describe('Library imports and basic functionality', () => {
  it('should import validation utilities', () => {
    const validation = require('../lib/validation')
    expect(validation).toBeDefined()
    expect(typeof validation.validateAndNormalizeURL).toBe('function')
    expect(typeof validation.isValidGitHubToken).toBe('function')
    expect(typeof validation.isValidRepositoryURL).toBe('function')

    // Test basic validation
    const result = validation.validateAndNormalizeURL('https://example.com')
    expect(result).toHaveProperty('isValid')
  })

  it('should import cache utilities', () => {
    const cache = require('../src/lib/cache')
    expect(cache).toBeDefined()
    expect(typeof cache.InMemoryCache).toBe('function')
    expect(typeof cache.generateCacheKey).toBe('function')

    // Test cache creation
    const cacheInstance = new cache.InMemoryCache({ ttl: 1000, maxSize: 10 })
    expect(cacheInstance).toBeDefined()
    expect(typeof cacheInstance.get).toBe('function')
    expect(typeof cacheInstance.set).toBe('function')

    // Test cache key generation
    const key = cache.generateCacheKey('test-url')
    expect(typeof key).toBe('string')
    expect(key.length).toBeGreaterThan(0)
  })

  it('should import rate limiter utilities', () => {
    const rateLimiter = require('../src/lib/rate-limiter')
    expect(rateLimiter).toBeDefined()
    expect(typeof rateLimiter.InMemoryRateLimiter).toBe('function')
    expect(typeof rateLimiter.getClientIdentifier).toBe('function')

    // Test rate limiter creation
    const limiterInstance = new rateLimiter.InMemoryRateLimiter({
      windowMs: 60000,
      maxRequests: 10
    })
    expect(limiterInstance).toBeDefined()
    expect(typeof limiterInstance.check).toBe('function')
  })

  it('should import security headers utilities', () => {
    const securityHeaders = require('../lib/security-headers')
    expect(securityHeaders).toBeDefined()
    expect(typeof securityHeaders.SecurityHeaderAnalyzer).toBe('function')

    // Test analyzer creation
    const analyzer = new securityHeaders.SecurityHeaderAnalyzer()
    expect(analyzer).toBeDefined()
    expect(typeof analyzer.analyzeURL).toBe('function')
  })
})

describe('Type definitions and metadata', () => {
  it('should load types without errors', () => {
    expect(() => require('../src/types/security')).not.toThrow()
    expect(() => require('../types/security')).not.toThrow()
  })

  it('should load metadata without errors', () => {
    expect(() => require('../src/app/metadata')).not.toThrow()
  })
})