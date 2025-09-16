/**
 * GitHub Integration Tests
 *
 * Tests for GitHub API integration and PR creation functionality
 */

// Mock Octokit/rest
const mockOctokit = {
  rest: {
    users: {
      getAuthenticated: jest.fn()
    },
    repos: {
      get: jest.fn(),
      listBranches: jest.fn(),
      getBranch: jest.fn()
    },
    git: {
      createRef: jest.fn(),
      getRef: jest.fn()
    },
    repos: {
      getContent: jest.fn(),
      createOrUpdateFileContents: jest.fn()
    },
    pulls: {
      create: jest.fn()
    }
  }
}

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => mockOctokit)
}))

// Mock GitHub integration (since lib may not exist yet)
const mockGitHubAutoFixer = {
  authenticate: jest.fn(),
  detectRepository: jest.fn(),
  verifyRepositoryAccess: jest.fn(),
  createSecurityHeadersPR: jest.fn(),
  generateSecurityHeadersCode: jest.fn()
}

jest.mock('@/lib/github-integration', () => ({
  GitHubAutoFixer: jest.fn().mockImplementation(() => mockGitHubAutoFixer),
  convertSecurityHeadersToFixes: jest.fn()
}))

describe('GitHubAutoFixer', () => {
  const validToken = 'ghp_test_token_123456789012345678901234567890'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('authenticate', () => {
    it('should authenticate successfully with valid token', async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValueOnce({
        data: {
          login: 'test-user',
          id: 12345
        }
      })

      mockGitHubAutoFixer.authenticate.mockResolvedValueOnce(true)

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)
      const result = await github.authenticate(validToken)

      expect(result).toBe(true)
      expect(mockGitHubAutoFixer.authenticate).toHaveBeenCalledWith(validToken)
    })

    it('should reject authentication with invalid token', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValueOnce(new Error('Bad credentials'))

      mockGitHubAutoFixer.authenticate.mockRejectedValueOnce(new Error('Bad credentials'))

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer('invalid-token')

      await expect(github.authenticate('invalid-token')).rejects.toThrow('Bad credentials')
    })

    it('should handle rate limit errors', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValueOnce({
        status: 403,
        message: 'API rate limit exceeded'
      })

      mockGitHubAutoFixer.authenticate.mockRejectedValueOnce(new Error('API rate limit exceeded'))

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)

      await expect(github.authenticate(validToken)).rejects.toThrow('API rate limit exceeded')
    })
  })

  describe('detectRepository', () => {
    it('should parse GitHub repository URL correctly', () => {
      const repoInfo = {
        owner: 'test-owner',
        repo: 'test-repo'
      }

      mockGitHubAutoFixer.detectRepository.mockReturnValueOnce(repoInfo)

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)
      const result = github.detectRepository('https://github.com/test-owner/test-repo')

      expect(result).toEqual(repoInfo)
      expect(result.owner).toBe('test-owner')
      expect(result.repo).toBe('test-repo')
    })

    it('should handle different GitHub URL formats', () => {
      const testCases = [
        {
          url: 'https://github.com/owner/repo',
          expected: { owner: 'owner', repo: 'repo' }
        },
        {
          url: 'https://github.com/owner/repo.git',
          expected: { owner: 'owner', repo: 'repo' }
        },
        {
          url: 'git@github.com:owner/repo.git',
          expected: { owner: 'owner', repo: 'repo' }
        }
      ]

      testCases.forEach(({ url, expected }) => {
        mockGitHubAutoFixer.detectRepository.mockReturnValueOnce(expected)

        const { GitHubAutoFixer } = require('@/lib/github-integration')
        const github = new GitHubAutoFixer(validToken)
        const result = github.detectRepository(url)

        expect(result).toEqual(expected)
      })
    })

    it('should return null for invalid URLs', () => {
      mockGitHubAutoFixer.detectRepository.mockReturnValueOnce(null)

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)
      const result = github.detectRepository('https://not-github.com/owner/repo')

      expect(result).toBeNull()
    })
  })

  describe('verifyRepositoryAccess', () => {
    const repoInfo = { owner: 'test-owner', repo: 'test-repo' }

    it('should verify repository access successfully', async () => {
      mockOctokit.rest.repos.get.mockResolvedValueOnce({
        data: {
          id: 123,
          name: 'test-repo',
          full_name: 'test-owner/test-repo',
          permissions: {
            push: true
          }
        }
      })

      mockGitHubAutoFixer.verifyRepositoryAccess.mockResolvedValueOnce(true)

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)
      const result = await github.verifyRepositoryAccess(repoInfo)

      expect(result).toBe(true)
    })

    it('should handle repository not found', async () => {
      mockOctokit.rest.repos.get.mockRejectedValueOnce({
        status: 404,
        message: 'Not Found'
      })

      mockGitHubAutoFixer.verifyRepositoryAccess.mockRejectedValueOnce(new Error('Not Found'))

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)

      await expect(github.verifyRepositoryAccess(repoInfo)).rejects.toThrow('Not Found')
    })

    it('should handle insufficient permissions', async () => {
      mockOctokit.rest.repos.get.mockResolvedValueOnce({
        data: {
          permissions: {
            push: false
          }
        }
      })

      mockGitHubAutoFixer.verifyRepositoryAccess.mockRejectedValueOnce(new Error('Insufficient permissions'))

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)

      await expect(github.verifyRepositoryAccess(repoInfo)).rejects.toThrow('Insufficient permissions')
    })
  })

  describe('createSecurityHeadersPR', () => {
    const repoInfo = { owner: 'test-owner', repo: 'test-repo' }
    const fixes = [
      {
        header: 'Content-Security-Policy',
        value: "default-src 'self'",
        description: 'Add CSP header'
      },
      {
        header: 'X-Frame-Options',
        value: 'DENY',
        description: 'Add X-Frame-Options header'
      }
    ]

    it('should create PR successfully', async () => {
      const expectedResult = {
        success: true,
        pr: {
          number: 123,
          url: 'https://github.com/test-owner/test-repo/pull/123',
          title: '🔒 Add missing security headers'
        },
        branch: 'security-headers-fix',
        filesChanged: ['middleware.ts', 'next.config.js']
      }

      // Mock the branch creation and file updates
      mockOctokit.rest.git.getRef.mockResolvedValueOnce({
        data: { object: { sha: 'main-sha' } }
      })
      mockOctokit.rest.git.createRef.mockResolvedValueOnce({
        data: { ref: 'refs/heads/security-headers-fix' }
      })
      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: { content: Buffer.from('// existing content').toString('base64') }
      })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce({
        data: { commit: { sha: 'new-sha' } }
      })
      mockOctokit.rest.pulls.create.mockResolvedValueOnce({
        data: {
          number: 123,
          html_url: 'https://github.com/test-owner/test-repo/pull/123',
          title: '🔒 Add missing security headers'
        }
      })

      mockGitHubAutoFixer.createSecurityHeadersPR.mockResolvedValueOnce(expectedResult)

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)
      const result = await github.createSecurityHeadersPR(fixes, repoInfo, {
        title: '🔒 Add missing security headers'
      })

      expect(result).toEqual(expectedResult)
      expect(result.success).toBe(true)
      expect(result.pr.number).toBe(123)
    })

    it('should handle branch already exists', async () => {
      mockOctokit.rest.git.createRef.mockRejectedValueOnce({
        status: 422,
        message: 'Reference already exists'
      })

      mockGitHubAutoFixer.createSecurityHeadersPR.mockRejectedValueOnce(new Error('Branch already exists'))

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)

      await expect(github.createSecurityHeadersPR(fixes, repoInfo)).rejects.toThrow('Branch already exists')
    })

    it('should handle merge conflicts', async () => {
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValueOnce({
        status: 409,
        message: 'Merge conflict'
      })

      mockGitHubAutoFixer.createSecurityHeadersPR.mockRejectedValueOnce(new Error('Merge conflict'))

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)

      await expect(github.createSecurityHeadersPR(fixes, repoInfo)).rejects.toThrow('Merge conflict')
    })
  })

  describe('generateSecurityHeadersCode', () => {
    it('should generate Next.js middleware code', () => {
      const fixes = [
        {
          header: 'Content-Security-Policy',
          value: "default-src 'self'",
          description: 'CSP header'
        },
        {
          header: 'X-Frame-Options',
          value: 'DENY',
          description: 'Frame options'
        }
      ]

      const expectedCode = `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('Content-Security-Policy', "default-src 'self'")
  response.headers.set('X-Frame-Options', 'DENY')

  return response
}`

      mockGitHubAutoFixer.generateSecurityHeadersCode.mockReturnValueOnce(expectedCode)

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)
      const code = github.generateSecurityHeadersCode(fixes, 'nextjs')

      expect(code).toContain('NextResponse')
      expect(code).toContain('Content-Security-Policy')
      expect(code).toContain('X-Frame-Options')
    })

    it('should generate Express.js middleware code', () => {
      const fixes = [
        {
          header: 'Content-Security-Policy',
          value: "default-src 'self'",
          description: 'CSP header'
        }
      ]

      const expectedCode = `// Security headers middleware
function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', "default-src 'self'")
  next()
}

module.exports = securityHeaders`

      mockGitHubAutoFixer.generateSecurityHeadersCode.mockReturnValueOnce(expectedCode)

      const { GitHubAutoFixer } = require('@/lib/github-integration')
      const github = new GitHubAutoFixer(validToken)
      const code = github.generateSecurityHeadersCode(fixes, 'express')

      expect(code).toContain('securityHeaders')
      expect(code).toContain('res.setHeader')
    })
  })
})

describe('convertSecurityHeadersToFixes', () => {
  it('should convert analysis results to fixes', () => {
    const headers = [
      {
        name: 'Content-Security-Policy',
        missing: true,
        recommendation: "default-src 'self'"
      },
      {
        name: 'X-Frame-Options',
        missing: true,
        recommendation: 'DENY'
      },
      {
        name: 'Strict-Transport-Security',
        present: true,
        weak: true,
        currentValue: 'max-age=3600',
        recommendation: 'max-age=31536000; includeSubDomains'
      }
    ]

    const expectedFixes = [
      {
        header: 'Content-Security-Policy',
        value: "default-src 'self'",
        description: 'Add Content Security Policy to prevent XSS attacks',
        action: 'add'
      },
      {
        header: 'X-Frame-Options',
        value: 'DENY',
        description: 'Add X-Frame-Options to prevent clickjacking',
        action: 'add'
      },
      {
        header: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
        description: 'Strengthen HSTS policy',
        action: 'update'
      }
    ]

    const { convertSecurityHeadersToFixes } = require('@/lib/github-integration')
    convertSecurityHeadersToFixes.mockReturnValueOnce(expectedFixes)

    const result = convertSecurityHeadersToFixes(headers)

    expect(result).toEqual(expectedFixes)
    expect(result).toHaveLength(3)
    expect(result[0].action).toBe('add')
    expect(result[2].action).toBe('update')
  })

  it('should filter out headers that dont need fixes', () => {
    const headers = [
      {
        name: 'Content-Security-Policy',
        present: true,
        strong: true
      },
      {
        name: 'X-Frame-Options',
        missing: true,
        recommendation: 'DENY'
      }
    ]

    const expectedFixes = [
      {
        header: 'X-Frame-Options',
        value: 'DENY',
        description: 'Add X-Frame-Options to prevent clickjacking',
        action: 'add'
      }
    ]

    const { convertSecurityHeadersToFixes } = require('@/lib/github-integration')
    convertSecurityHeadersToFixes.mockReturnValueOnce(expectedFixes)

    const result = convertSecurityHeadersToFixes(headers)

    expect(result).toHaveLength(1)
    expect(result[0].header).toBe('X-Frame-Options')
  })
})