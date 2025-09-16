import { Octokit } from '@octokit/rest';
import { SecurityHeader, GitHubPRRequest, PRResponse } from '@/types/security';

export class GitHubIntegration {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }

  private parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
    try {
      const url = new URL(repoUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);

      if (pathParts.length >= 2) {
        return {
          owner: pathParts[0],
          repo: pathParts[1].replace('.git', ''),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private generateSecurityHeadersConfig(headers: SecurityHeader[]): string {

    let config = '# Security Headers Configuration\n\n';
    config += '## Recommended Security Headers\n\n';

    // Generate different configs for different server types
    config += '### For Next.js (next.config.js)\n\n';
    config += '```javascript\n';
    config += '/** @type {import(\'next\').NextConfig} */\n';
    config += 'const nextConfig = {\n';
    config += '  async headers() {\n';
    config += '    return [\n';
    config += '      {\n';
    config += '        source: \'/(.*)\',\n';
    config += '        headers: [\n';

    const nextHeaders = this.generateNextJSHeaders(headers);
    nextHeaders.forEach(header => {
      config += `          {\n`;
      config += `            key: '${header.key}',\n`;
      config += `            value: '${header.value}'\n`;
      config += `          },\n`;
    });

    config += '        ],\n';
    config += '      },\n';
    config += '    ];\n';
    config += '  },\n';
    config += '};\n\n';
    config += 'module.exports = nextConfig;\n';
    config += '```\n\n';

    // Apache configuration
    config += '### For Apache (.htaccess)\n\n';
    config += '```apache\n';
    const apacheHeaders = this.generateApacheHeaders(headers);
    apacheHeaders.forEach(header => {
      config += `Header always set ${header}\n`;
    });
    config += '```\n\n';

    // Nginx configuration
    config += '### For Nginx\n\n';
    config += '```nginx\n';
    const nginxHeaders = this.generateNginxHeaders(headers);
    nginxHeaders.forEach(header => {
      config += `add_header ${header};\n`;
    });
    config += '```\n\n';

    return config;
  }

  private generateNextJSHeaders(headers: SecurityHeader[]): Array<{ key: string; value: string }> {
    const headerConfigs: Array<{ key: string; value: string }> = [];

    headers.forEach(header => {
      if (!header.present || header.score < 100) {
        switch (header.name) {
          case 'Content-Security-Policy':
            headerConfigs.push({
              key: 'Content-Security-Policy',
              value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src 'none';"
            });
            break;
          case 'Strict-Transport-Security':
            headerConfigs.push({
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains; preload'
            });
            break;
          case 'X-Content-Type-Options':
            headerConfigs.push({
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            });
            break;
          case 'X-Frame-Options':
            headerConfigs.push({
              key: 'X-Frame-Options',
              value: 'DENY'
            });
            break;
          case 'Referrer-Policy':
            headerConfigs.push({
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin'
            });
            break;
          case 'Permissions-Policy':
            headerConfigs.push({
              key: 'Permissions-Policy',
              value: 'geolocation=(), microphone=(), camera=()'
            });
            break;
          case 'Cross-Origin-Embedder-Policy':
            headerConfigs.push({
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp'
            });
            break;
          case 'Cross-Origin-Resource-Policy':
            headerConfigs.push({
              key: 'Cross-Origin-Resource-Policy',
              value: 'cross-origin'
            });
            break;
          case 'Cross-Origin-Opener-Policy':
            headerConfigs.push({
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin'
            });
            break;
        }
      }
    });

    return headerConfigs;
  }

  private generateApacheHeaders(headers: SecurityHeader[]): string[] {
    const headerConfigs: string[] = [];

    headers.forEach(header => {
      if (!header.present || header.score < 100) {
        switch (header.name) {
          case 'Content-Security-Policy':
            headerConfigs.push("Content-Security-Policy \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src 'none';\"");
            break;
          case 'Strict-Transport-Security':
            headerConfigs.push('Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"');
            break;
          case 'X-Content-Type-Options':
            headerConfigs.push('X-Content-Type-Options nosniff');
            break;
          case 'X-Frame-Options':
            headerConfigs.push('X-Frame-Options DENY');
            break;
          case 'Referrer-Policy':
            headerConfigs.push('Referrer-Policy strict-origin-when-cross-origin');
            break;
          case 'Permissions-Policy':
            headerConfigs.push('Permissions-Policy "geolocation=(), microphone=(), camera=()"');
            break;
          case 'Cross-Origin-Embedder-Policy':
            headerConfigs.push('Cross-Origin-Embedder-Policy require-corp');
            break;
          case 'Cross-Origin-Resource-Policy':
            headerConfigs.push('Cross-Origin-Resource-Policy cross-origin');
            break;
          case 'Cross-Origin-Opener-Policy':
            headerConfigs.push('Cross-Origin-Opener-Policy same-origin');
            break;
        }
      }
    });

    return headerConfigs;
  }

  private generateNginxHeaders(headers: SecurityHeader[]): string[] {
    const headerConfigs: string[] = [];

    headers.forEach(header => {
      if (!header.present || header.score < 100) {
        switch (header.name) {
          case 'Content-Security-Policy':
            headerConfigs.push("Content-Security-Policy \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src 'none';\" always");
            break;
          case 'Strict-Transport-Security':
            headerConfigs.push('Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always');
            break;
          case 'X-Content-Type-Options':
            headerConfigs.push('X-Content-Type-Options nosniff always');
            break;
          case 'X-Frame-Options':
            headerConfigs.push('X-Frame-Options DENY always');
            break;
          case 'Referrer-Policy':
            headerConfigs.push('Referrer-Policy strict-origin-when-cross-origin always');
            break;
          case 'Permissions-Policy':
            headerConfigs.push('Permissions-Policy "geolocation=(), microphone=(), camera=()" always');
            break;
          case 'Cross-Origin-Embedder-Policy':
            headerConfigs.push('Cross-Origin-Embedder-Policy require-corp always');
            break;
          case 'Cross-Origin-Resource-Policy':
            headerConfigs.push('Cross-Origin-Resource-Policy cross-origin always');
            break;
          case 'Cross-Origin-Opener-Policy':
            headerConfigs.push('Cross-Origin-Opener-Policy same-origin always');
            break;
        }
      }
    });

    return headerConfigs;
  }

  async createSecurityHeadersPR(request: GitHubPRRequest): Promise<PRResponse> {
    try {
      const repoInfo = this.parseRepoUrl(request.repoUrl);
      if (!repoInfo) {
        return {
          success: false,
          error: 'Invalid repository URL format',
        };
      }

      const { owner, repo } = repoInfo;

      // Get the default branch
      const repoData = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      const defaultBranch = repoData.data.default_branch;

      // Get the latest commit SHA from the default branch
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });

      // Create a new branch
      const branchName = request.branch || `security-headers-fix-${Date.now()}`;
      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      });

      // Generate the security headers configuration
      const configContent = this.generateSecurityHeadersConfig(request.headers);

      // Create the configuration file
      const fileName = 'SECURITY_HEADERS_CONFIG.md';
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: fileName,
        message: 'Add security headers configuration recommendations',
        content: Buffer.from(configContent).toString('base64'),
        branch: branchName,
      });

      // Create the pull request
      const { data: prData } = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title: request.title,
        head: branchName,
        base: defaultBranch,
        body: request.body,
      });

      return {
        success: true,
        pullRequestUrl: prData.html_url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async validateRepositoryAccess(repoUrl: string): Promise<boolean> {
    try {
      const repoInfo = this.parseRepoUrl(repoUrl);
      if (!repoInfo) return false;

      const { owner, repo } = repoInfo;
      await this.octokit.rest.repos.get({ owner, repo });
      return true;
    } catch {
      return false;
    }
  }
}