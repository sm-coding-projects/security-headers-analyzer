/**
 * @jest-environment node
 */

// Import our Node.js specific setup before Next.js imports
require('../jest.setup.node.js')

import { NextRequest, NextResponse } from 'next/server'

// Create comprehensive mocks for all dependencies
const mockAnalyzeURL = jest.fn()
const mockCacheGet = jest.fn()
const mockCacheSet = jest.fn()
const mockRateLimiterCheck = jest.fn()
const mockValidateAndNormalizeURL = jest.fn()
const mockWithTimeout = jest.fn()
const mockGetClientIdentifier = jest.fn()
const mockGenerateCacheKey = jest.fn()
const mockIsValidGitHubToken = jest.fn()
const mockIsValidRepositoryURL = jest.fn()
const mockGitHubAuthenticate = jest.fn()
const mockGitHubDetectRepository = jest.fn()
const mockGitHubVerifyRepositoryAccess = jest.fn()
const mockGitHubCreateSecurityHeadersPR = jest.fn()
const mockConvertSecurityHeadersToFixes = jest.fn()

// Mock all modules before any imports
jest.mock('@/lib/security-headers', () => ({
  SecurityHeaderAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeURL: mockAnalyzeURL
  }))
}))

jest.mock('@/lib/cache', () => ({
  InMemoryCache: jest.fn().mockImplementation(() => ({
    get: mockCacheGet,
    set: mockCacheSet
  })),
  generateCacheKey: mockGenerateCacheKey
}))

jest.mock('@/lib/rate-limiter', () => ({
  InMemoryRateLimiter: jest.fn().mockImplementation(() => ({
    check: mockRateLimiterCheck
  })),
  getClientIdentifier: mockGetClientIdentifier
}))

jest.mock('@/lib/validation', () => ({
  validateAndNormalizeURL: mockValidateAndNormalizeURL,
  withTimeout: mockWithTimeout,
  isValidGitHubToken: mockIsValidGitHubToken,
  isValidRepositoryURL: mockIsValidRepositoryURL
}))

jest.mock('@/lib/github-integration', () => ({
  GitHubAutoFixer: jest.fn().mockImplementation(() => ({
    authenticate: mockGitHubAuthenticate,
    detectRepository: mockGitHubDetectRepository,
    verifyRepositoryAccess: mockGitHubVerifyRepositoryAccess,
    createSecurityHeadersPR: mockGitHubCreateSecurityHeadersPR
  })),
  convertSecurityHeadersToFixes: mockConvertSecurityHeadersToFixes
}))

// Mock @octokit modules to avoid ES module issues
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn()
}))

jest.mock('@octokit/auth-token', () => ({
  createTokenAuth: jest.fn()
}))

// Mock types module
jest.mock('@/types/security', () => ({}))

// Import route handlers after mocks are set up
import { POST as analyzePost, GET as analyzeGet } from '@/app/api/analyze/route'
import { POST as githubPost, GET as githubGet } from '@/app/api/github/create-pr/route'

describe('/api/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default successful responses
    mockValidateAndNormalizeURL.mockReturnValue({
      isValid: true,
      normalizedUrl: 'https://example.com'
    })

    mockWithTimeout.mockImplementation((promise) => promise)
    mockGetClientIdentifier.mockReturnValue('test-client-id')
    mockGenerateCacheKey.mockReturnValue('test-cache-key')

    mockRateLimiterCheck.mockReturnValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000
    })

    mockCacheGet.mockReturnValue(null)

    mockAnalyzeURL.mockResolvedValue({
      url: 'https://example.com',
      timestamp: new Date().toISOString(),
      headers: {},
      analysis: {
        score: 85,
        grade: 'B',
        summary: 'Good security posture'
      }
    })
  })

  describe('POST', () => {
    it('should analyze a URL successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.url).toBe('https://example.com')
      expect(mockAnalyzeURL).toHaveBeenCalledWith('https://example.com')
      expect(mockCacheSet).toHaveBeenCalled()
    })

    it('should return 400 for invalid URL', async () => {
      mockValidateAndNormalizeURL.mockReturnValueOnce({
        isValid: false,
        error: 'Invalid URL format'
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'invalid-url' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid URL format')
      expect(mockAnalyzeURL).not.toHaveBeenCalled()
    })

    it('should return 429 when rate limited', async () => {
      mockRateLimiterCheck.mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000
      })

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Rate limit exceeded')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('should return cached result when available', async () => {
      const cachedResult = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        analysis: { score: 90 }
      }
      mockCacheGet.mockReturnValueOnce(cachedResult)

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cached).toBe(true)
      expect(response.headers.get('X-Cache')).toBe('HIT')
      expect(mockAnalyzeURL).not.toHaveBeenCalled() // Should not call analyzer when cached
    })

    it('should handle analyzer timeout errors', async () => {
      mockWithTimeout.mockRejectedValueOnce(new Error('Analysis timed out after 10 seconds'))

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(408)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Request timed out')
    })

    it('should handle network errors', async () => {
      mockAnalyzeURL.mockRejectedValueOnce(new Error('ENOTFOUND example.com'))

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await analyzePost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Website not accessible')
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

    // Setup default successful responses for GitHub tests
    mockGetClientIdentifier.mockReturnValue('test-client-id')
    mockIsValidGitHubToken.mockReturnValue(true)
    mockIsValidRepositoryURL.mockReturnValue(true)
    mockWithTimeout.mockImplementation((promise) => promise)

    mockRateLimiterCheck.mockReturnValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 300000
    })

    mockGitHubAuthenticate.mockResolvedValue(true)
    mockGitHubDetectRepository.mockReturnValue({
      owner: 'test-owner',
      repo: 'test-repo'
    })
    mockGitHubVerifyRepositoryAccess.mockResolvedValue(true)
    mockConvertSecurityHeadersToFixes.mockReturnValue([
      {
        header: 'Content-Security-Policy',
        value: "default-src 'self'",
        description: 'CSP header fix'
      }
    ])
    mockGitHubCreateSecurityHeadersPR.mockResolvedValue({
      success: true,
      pr: {
        number: 123,
        url: 'https://github.com/test-owner/test-repo/pull/123'
      }
    })
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
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.pr).toBeDefined()
      expect(mockGitHubAuthenticate).toHaveBeenCalled()
      expect(mockGitHubCreateSecurityHeadersPR).toHaveBeenCalled()
    })

    it('should return 400 for missing repository URL', async () => {
      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          headers: [{ name: 'Content-Security-Policy', missing: true }],
          githubToken: 'ghp_test_token_123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Repository URL is required')
    })

    it('should return 400 for invalid GitHub token', async () => {
      mockIsValidGitHubToken.mockReturnValueOnce(false)

      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/test-owner/test-repo',
          headers: [{ name: 'Content-Security-Policy', missing: true }],
          githubToken: 'invalid-token'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid GitHub token format')
    })

    it('should return 401 for authentication failure', async () => {
      mockGitHubAuthenticate.mockRejectedValueOnce(new Error('Bad credentials'))

      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/test-owner/test-repo',
          headers: [{ name: 'Content-Security-Policy', missing: true }],
          githubToken: 'ghp_invalid_token'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid GitHub token')
    })

    it('should return 429 when rate limited', async () => {
      mockRateLimiterCheck.mockReturnValueOnce({
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
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Rate limit exceeded')
    })

    it('should return 400 for empty headers array', async () => {
      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/test-owner/test-repo',
          headers: [],
          githubToken: 'ghp_test_token_123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('At least one security header must be provided')
    })

    it('should return 403 for repository access denied', async () => {
      mockGitHubVerifyRepositoryAccess.mockRejectedValueOnce(new Error('Not Found'))

      const request = new NextRequest('http://localhost:3000/api/github/create-pr', {
        method: 'POST',
        body: JSON.stringify({
          repoUrl: 'https://github.com/test-owner/test-repo',
          headers: [{ name: 'Content-Security-Policy', missing: true }],
          githubToken: 'ghp_test_token_123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await githubPost(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Repository not found')
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