import { NextRequest, NextResponse } from 'next/server';
import { GitHubAutoFixer, convertSecurityHeadersToFixes } from '@/lib/github-integration';
import { PRResponse, GitHubPRRequest } from '@/types/security';
import { isValidGitHubToken, isValidRepositoryURL, withTimeout } from '@/lib/validation';
import { InMemoryRateLimiter, getClientIdentifier } from '@/lib/rate-limiter';

const rateLimiter = new InMemoryRateLimiter({
  windowMs: 300000,
  maxRequests: 5
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const clientId = getClientIdentifier(request);

    const rateLimitResult = rateLimiter.check(clientId);
    if (!rateLimitResult.allowed) {
      const resetInSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);

      const response: PRResponse = {
        success: false,
        error: `Rate limit exceeded. GitHub PR creation is limited to 5 requests per 5 minutes. Try again in ${resetInSeconds} seconds.`,
      };

      return NextResponse.json(response, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': resetInSeconds.toString()
        }
      });
    }

    const body = await request.json().catch(() => ({}));
    const { repoUrl, headers, title, branch, githubToken } = body as GitHubPRRequest & { githubToken: string };

    if (!repoUrl) {
      const response: PRResponse = {
        success: false,
        error: 'Repository URL is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!isValidRepositoryURL(repoUrl)) {
      const response: PRResponse = {
        success: false,
        error: 'Invalid GitHub repository URL format. Must be a valid GitHub repository URL.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!headers || !Array.isArray(headers)) {
      const response: PRResponse = {
        success: false,
        error: 'Headers array is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (headers.length === 0) {
      const response: PRResponse = {
        success: false,
        error: 'At least one security header must be provided',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!githubToken) {
      const response: PRResponse = {
        success: false,
        error: 'GitHub access token is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!isValidGitHubToken(githubToken)) {
      const response: PRResponse = {
        success: false,
        error: 'Invalid GitHub token format. Please provide a valid GitHub personal access token.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Initialize GitHub auto-fixer
    const github = new GitHubAutoFixer(githubToken);

    // Validate GitHub token by attempting to authenticate
    try {
      await withTimeout(github.authenticate(githubToken), 5000, 'GitHub authentication timed out');
    } catch (authError) {
      const response: PRResponse = {
        success: false,
        error: authError instanceof Error && authError.message.includes('Bad credentials')
          ? 'Invalid GitHub token. Please check your personal access token.'
          : 'Failed to authenticate with GitHub. Please verify your token has the required permissions.',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Detect repository information
    const repoInfo = github.detectRepository(repoUrl);
    if (!repoInfo) {
      const response: PRResponse = {
        success: false,
        error: 'Invalid repository URL format',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify repository access
    try {
      await withTimeout(github.verifyRepositoryAccess(repoInfo), 5000, 'Repository verification timed out');
    } catch (accessError) {
      let errorMessage = 'Repository access verification failed';

      if (accessError instanceof Error) {
        if (accessError.message.includes('Not Found')) {
          errorMessage = 'Repository not found. Please check the repository URL and ensure it exists.';
        } else if (accessError.message.includes('rate limit')) {
          errorMessage = 'GitHub API rate limit exceeded. Please try again later.';
        } else if (accessError.message.includes('permission')) {
          errorMessage = 'Insufficient permissions. Your token needs write access to the repository.';
        }
      }

      const response: PRResponse = {
        success: false,
        error: errorMessage,
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Convert security headers to fixes
    const fixes = convertSecurityHeadersToFixes(headers);
    if (fixes.length === 0) {
      const response: PRResponse = {
        success: false,
        error: 'No security header fixes needed',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create PR with security headers fixes
    const result = await withTimeout(
      github.createSecurityHeadersPR(fixes, repoInfo, {
        title: title || '🔒 Add missing security headers',
        branchName: branch,
      }),
      30000,
      'PR creation timed out after 30 seconds'
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });

  } catch (error) {
    console.error('GitHub PR creation error:', error);

    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'GitHub operation timed out. Please try again.';
        statusCode = 408;
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'GitHub API rate limit exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('Merge conflict')) {
        errorMessage = 'Unable to create PR due to merge conflicts. The repository may need manual intervention.';
        statusCode = 409;
      } else {
        errorMessage = error.message;
      }
    }

    const response: PRResponse = {
      success: false,
      error: errorMessage,
    };

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to create a pull request.' },
    { status: 405 }
  );
}