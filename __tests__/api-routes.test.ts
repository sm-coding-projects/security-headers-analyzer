import { NextRequest } from 'next/server'
import { POST as analyzePost, GET as analyzeGet } from '@/app/api/analyze/route'
import { POST as githubPost, GET as githubGet } from '@/app/api/github/create-pr/route'

// Mock modules that may not exist yet
jest.mock('@/lib/security-headers', () => ({
  SecurityHeaderAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeURL: jest.fn().mockResolvedValue({
      url: 'https://example.com',
      timestamp: new Date().toISOString(),
      headers: {},
      analysis: {
        score: 85,
        grade: 'B',
        summary: 'Good security posture'
      }
    })
  }))
}))

jest.mock('@/lib/cache', () => ({
  InMemoryCache: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(null),
    set: jest.fn()
  })),
  generateCacheKey: jest.fn().mockReturnValue('test-cache-key')
}))

jest.mock('@/lib/rate-limiter', () => ({
  InMemoryRateLimiter: jest.fn().mockImplementation(() => ({
    check: jest.fn().mockReturnValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000
    })
  })),
  getClientIdentifier: jest.fn().mockReturnValue('test-client-id')
}))

jest.mock('@/lib/validation', () => ({
  validateAndNormalizeURL: jest.fn().mockReturnValue({
    isValid: true,
    normalizedUrl: 'https://example.com'
  }),
  withTimeout: jest.fn().mockImplementation((promise) => promise),
  isValidGitHubToken: jest.fn().mockReturnValue(true),
  isValidRepositoryURL: jest.fn().mockReturnValue(true)
}))

jest.mock('@/lib/github-integration', () => ({
  GitHubAutoFixer: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn().mockResolvedValue(true),
    detectRepository: jest.fn().mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo'
    }),
    verifyRepositoryAccess: jest.fn().mockResolvedValue(true),
    createSecurityHeadersPR: jest.fn().mockResolvedValue({
      success: true,
      pr: {
        number: 123,
        url: 'https://github.com/test-owner/test-repo/pull/123'
      }
    })
  })),
  convertSecurityHeadersToFixes: jest.fn().mockReturnValue([
    {
      header: 'Content-Security-Policy',
      value: "default-src 'self'",
      description: 'CSP header fix'
    }
  ])
}))

jest.mock('@/types/security', () => ({}))

describe('/api/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should analyze a URL successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' })
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.url).toBe('https://example.com')
    })

    it('should return 400 for invalid URL', async () => {
      const { validateAndNormalizeURL } = require('@/lib/validation')
      validateAndNormalizeURL.mockReturnValueOnce({
        isValid: false,
        error: 'Invalid URL format'
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'invalid-url' })
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid URL format')
    })

    it('should return 429 when rate limited', async () => {
      const { InMemoryRateLimiter } = require('@/lib/rate-limiter')
      const mockRateLimiter = InMemoryRateLimiter.mock.instances[0]
      mockRateLimiter.check.mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' })
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Rate limit exceeded')
    })

    it('should return cached result when available', async () => {
      const { InMemoryCache } = require('@/lib/cache')
      const mockCache = InMemoryCache.mock.instances[0]
      const cachedResult = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        analysis: { score: 90 }
      }
      mockCache.get.mockReturnValueOnce(cachedResult)

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' })
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cached).toBe(true)
      expect(response.headers.get('X-Cache')).toBe('HIT')
    })
  })

  describe('GET', () => {
    it('should return 405 for GET requests', async () => {
      const response = await analyzeGet()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed. Use POST to analyze a URL.')
    })
  })
})

describe('/api/github/create-pr', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should create PR successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/test-owner/test-repo',
          headers: [{ name: 'Content-Security-Policy', missing: true }],
          title: 'Add security headers',
          githubToken: 'ghp_test_token_123'
        })
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.pr).toBeDefined()
    })

    it('should return 400 for missing repository URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          headers: [{ name: 'Content-Security-Policy', missing: true }],
          githubToken: 'ghp_test_token_123'
        })
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Repository URL is required')
    })

    it('should return 400 for invalid GitHub token', async () => {
      const { isValidGitHubToken } = require('@/lib/validation')
      isValidGitHubToken.mockReturnValueOnce(false)

      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/test-owner/test-repo',
          headers: [{ name: 'Content-Security-Policy', missing: true }],
          githubToken: 'invalid-token'
        })
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid GitHub token format')
    })

    it('should return 401 for authentication failure', async () => {
      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const mockGitHub = GitHubAutoFixer.mock.instances[0]
      mockGitHub.authenticate.mockRejectedValueOnce(new Error('Bad credentials'))

      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/test-owner/test-repo',
          headers: [{ name: 'Content-Security-Policy', missing: true }],
          githubToken: 'ghp_invalid_token'
        })
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid GitHub token')
    })

    it('should return 429 when rate limited', async () => {
      const { InMemoryRateLimiter } = require('@/lib/rate-limiter')
      const mockRateLimiter = InMemoryRateLimiter.mock.instances[0]
      mockRateLimiter.check.mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 300000
      })

      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/test-owner/test-repo',
          headers: [{ name: 'Content-Security-Policy', missing: true }],
          githubToken: 'ghp_test_token_123'
        })
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Rate limit exceeded')
    })
  })

  describe('GET', () => {
    it('should return 405 for GET requests', async () => {
      const response = await githubGet()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed. Use POST to create a pull request.')
    })
  })
})