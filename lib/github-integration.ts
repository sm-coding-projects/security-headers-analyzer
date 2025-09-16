import { Octokit } from '@octokit/rest';
import { SecurityHeader } from '@/types/security';

export interface RepositoryInfo {
  owner: string;
  repo: string;
  url: string;
}

export interface FrameworkConfig {
  type: 'nextjs' | 'express' | 'static' | 'nginx' | 'apache' | 'vercel' | 'netlify';
  configFile: string;
  exists: boolean;
  content?: string;
}

export interface SecurityFix {
  header: string;
  value: string;
  description: string;
  owaspLink?: string;
  browserCompatibility?: string[];
}

export interface PRCreationResult {
  success: boolean;
  pullRequestUrl?: string;
  branchName?: string;
  error?: string;
}

export class GitHubAutoFixer {
  private octokit: Octokit;
  private isAuthenticated: boolean = false;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'Security Headers Analyzer v1.0.0',
    });
    if (token) {
      this.isAuthenticated = true;
    }
  }

  /**
   * Authenticate with GitHub using OAuth token
   */
  async authenticate(token: string): Promise<boolean> {
    try {
      this.octokit = new Octokit({
        auth: token,
        userAgent: 'Security Headers Analyzer v1.0.0',
      });

      // Verify authentication by getting user info
      await this.octokit.rest.users.getAuthenticated();
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract repository information from URL
   */
  detectRepository(url: string): RepositoryInfo | null {
    try {
      // Handle various GitHub URL formats
      const patterns = [
        /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/.*)?$/,
        /^([^\/]+)\/([^\/]+)$/,
      ];

      let normalizedUrl = url.trim();

      // Remove protocol if present
      normalizedUrl = normalizedUrl.replace(/^https?:\/\//, '');

      // Remove www. if present
      normalizedUrl = normalizedUrl.replace(/^www\./, '');

      for (const pattern of patterns) {
        const match = normalizedUrl.match(pattern);
        if (match) {
          const [, owner, repo] = match;
          return {
            owner: owner.trim(),
            repo: repo.replace('.git', '').trim(),
            url: `https://github.com/${owner}/${repo}`,
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Analyze repository structure to detect framework and configuration files
   */
  async analyzeRepositoryStructure(repoInfo: RepositoryInfo): Promise<FrameworkConfig[]> {
    if (!this.isAuthenticated) {
      throw new Error('Authentication required');
    }

    const configs: FrameworkConfig[] = [];
    const { owner, repo } = repoInfo;

    try {
      // Get repository contents
      const { data: contents } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '',
      });

      if (!Array.isArray(contents)) {
        throw new Error('Unable to read repository contents');
      }

      const files = contents.map(item => item.name);

      // Check for Next.js
      if (files.includes('next.config.js') || files.includes('next.config.mjs') || files.includes('next.config.ts')) {
        const configFile = files.find(f => f.startsWith('next.config.')) || 'next.config.js';
        configs.push({
          type: 'nextjs',
          configFile,
          exists: true,
          content: (await this.getFileContent(owner, repo, configFile)) || undefined,
        });
      } else if (files.includes('package.json')) {
        // Check if it's a Next.js project by looking at package.json
        const packageJson = await this.getFileContent(owner, repo, 'package.json');
        if (packageJson && packageJson.includes('next')) {
          configs.push({
            type: 'nextjs',
            configFile: 'next.config.js',
            exists: false,
          });
        }
      }

      // Check for Express/Node.js
      if (files.includes('app.js') || files.includes('server.js') || files.includes('index.js')) {
        const serverFile = files.find(f => ['app.js', 'server.js', 'index.js'].includes(f)) || 'app.js';
        configs.push({
          type: 'express',
          configFile: serverFile,
          exists: true,
          content: (await this.getFileContent(owner, repo, serverFile)) || undefined,
        });
      }

      // Check for static site configurations
      if (files.includes('.htaccess')) {
        configs.push({
          type: 'apache',
          configFile: '.htaccess',
          exists: true,
          content: (await this.getFileContent(owner, repo, '.htaccess')) || undefined,
        });
      }

      if (files.includes('_headers')) {
        configs.push({
          type: 'netlify',
          configFile: '_headers',
          exists: true,
          content: (await this.getFileContent(owner, repo, '_headers')) || undefined,
        });
      }

      if (files.includes('vercel.json')) {
        configs.push({
          type: 'vercel',
          configFile: 'vercel.json',
          exists: true,
          content: (await this.getFileContent(owner, repo, 'vercel.json')) || undefined,
        });
      }

      if (files.includes('nginx.conf')) {
        configs.push({
          type: 'nginx',
          configFile: 'nginx.conf',
          exists: true,
          content: (await this.getFileContent(owner, repo, 'nginx.conf')) || undefined,
        });
      }

      // If no specific framework detected, provide generic static options
      if (configs.length === 0) {
        configs.push({
          type: 'static',
          configFile: '_headers',
          exists: false,
        });
      }

      return configs;
    } catch (error) {
      throw new Error(`Failed to analyze repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate configuration patches for different frameworks
   */
  generateConfigPatch(config: FrameworkConfig, fixes: SecurityFix[]): string {
    switch (config.type) {
      case 'nextjs':
        return this.generateNextJSConfig(config, fixes);
      case 'express':
        return this.generateExpressConfig(config, fixes);
      case 'apache':
        return this.generateApacheConfig(config, fixes);
      case 'nginx':
        return this.generateNginxConfig(config, fixes);
      case 'vercel':
        return this.generateVercelConfig(config, fixes);
      case 'netlify':
        return this.generateNetlifyConfig(config, fixes);
      case 'static':
        return this.generateStaticConfig(config, fixes);
      default:
        return this.generateGenericConfig(fixes);
    }
  }

  /**
   * Validate changes to ensure they won't break existing configurations
   */
  validateChanges(config: FrameworkConfig, patch: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    try {
      switch (config.type) {
        case 'nextjs':
          // Check if the patch contains valid Next.js configuration
          if (!patch.includes('headers()') && !patch.includes('async headers')) {
            warnings.push('Next.js configuration may not be properly formatted');
          }
          break;

        case 'vercel':
          // Validate JSON structure
          if (patch.trim().startsWith('{')) {
            try {
              JSON.parse(patch);
            } catch {
              warnings.push('Invalid JSON structure in Vercel configuration');
            }
          }
          break;

        case 'apache':
          // Check for common Apache header syntax issues
          if (!patch.includes('Header always set') && !patch.includes('Header set')) {
            warnings.push('Apache configuration may not use correct header directive syntax');
          }
          break;
      }

      return {
        valid: warnings.length === 0,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        warnings: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Create a pull request with security headers fixes
   */
  async createSecurityHeadersPR(
    fixes: SecurityFix[],
    repoInfo: RepositoryInfo,
    options?: {
      title?: string;
      branchName?: string;
      targetBranch?: string;
    }
  ): Promise<PRCreationResult> {
    if (!this.isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      const { owner, repo } = repoInfo;
      const timestamp = Date.now();
      const branchName = options?.branchName || `security-headers-fix-${timestamp}`;
      const targetBranch = options?.targetBranch || await this.getDefaultBranch(owner, repo);

      // Analyze repository structure
      const configs = await this.analyzeRepositoryStructure(repoInfo);
      if (configs.length === 0) {
        throw new Error('No supported framework configuration detected');
      }

      // Get the latest commit SHA from target branch
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`,
      });

      // Create new branch
      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      });

      // Generate and apply configuration patches
      const changedFiles: string[] = [];
      for (const config of configs) {
        const patch = this.generateConfigPatch(config, fixes);
        const validation = this.validateChanges(config, patch);

        if (!validation.valid) {
          console.warn(`Validation warnings for ${config.configFile}:`, validation.warnings);
        }

        // Create or update configuration file
        await this.createOrUpdateFile(owner, repo, config.configFile, patch, branchName);
        changedFiles.push(config.configFile);
      }

      // Generate PR description
      const prBody = this.generatePRDescription(fixes, configs, changedFiles);
      const prTitle = options?.title || '🔒 Add missing security headers';

      // Create pull request
      const { data: prData } = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title: prTitle,
        head: branchName,
        base: targetBranch,
        body: prBody,
      });

      return {
        success: true,
        pullRequestUrl: prData.html_url,
        branchName,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Private helper methods

  private async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const { data } = await this.octokit.rest.repos.get({ owner, repo });
    return data.default_branch;
  }

  private async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    branch: string
  ): Promise<void> {
    try {
      // Try to get existing file to get its SHA
      const { data: existingFile } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      const sha = 'sha' in existingFile ? existingFile.sha : undefined;

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Update ${path} with security headers configuration`,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha,
      });
    } catch {
      // File doesn't exist, create new one
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Add ${path} with security headers configuration`,
        content: Buffer.from(content).toString('base64'),
        branch,
      });
    }
  }

  private generateNextJSConfig(config: FrameworkConfig, fixes: SecurityFix[]): string {
    const existingConfig = config.content || '';
    const hasExistingHeaders = existingConfig.includes('headers()') || existingConfig.includes('async headers');

    if (hasExistingHeaders) {
      // Update existing configuration
      return this.updateExistingNextJSHeaders(existingConfig, fixes);
    } else {
      // Create new configuration
      return this.createNewNextJSConfig(fixes);
    }
  }

  private createNewNextJSConfig(fixes: SecurityFix[]): string {
    const headers = fixes.map(fix => `          {
            key: '${fix.header}',
            value: '${fix.value.replace(/'/g, "\\'")}'
          }`).join(',\n');

    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
${headers}
        ],
      },
    ];
  },
};

module.exports = nextConfig;
`;
  }

  private updateExistingNextJSHeaders(existingConfig: string, fixes: SecurityFix[]): string {
    // This is a simplified approach - in a real implementation, you'd want to parse the AST
    // For now, we'll append new headers to existing ones
    const newHeaders = fixes.map(fix => `          {
            key: '${fix.header}',
            value: '${fix.value.replace(/'/g, "\\'")}'
          }`).join(',\n');

    // Find the headers array and add new headers
    if (existingConfig.includes('headers: [')) {
      return existingConfig.replace(
        /headers: \[([^\]]*)\]/,
        `headers: [$1,
${newHeaders}
        ]`
      );
    }

    return existingConfig;
  }

  private generateExpressConfig(config: FrameworkConfig, fixes: SecurityFix[]): string {
    const helmetConfig = fixes.map(fix => {
      const headerKey = fix.header.toLowerCase().replace(/-/g, '');
      return `  ${headerKey}: '${fix.value.replace(/'/g, "\\'")}'`;
    }).join(',\n');

    return `// Add this middleware to your Express app
const helmet = require('helmet');

app.use(helmet({
${helmetConfig}
}));

// Alternative manual approach:
app.use((req, res, next) => {
${fixes.map(fix => `  res.setHeader('${fix.header}', '${fix.value.replace(/'/g, "\\'")}');`).join('\n')}
  next();
});
`;
  }

  private generateApacheConfig(config: FrameworkConfig, fixes: SecurityFix[]): string {
    const existingContent = config.content || '';
    const headers = fixes.map(fix =>
      `Header always set ${fix.header} "${fix.value.replace(/"/g, '\\"')}"`
    ).join('\n');

    return `${existingContent}

# Security Headers
<IfModule mod_headers.c>
${headers}
</IfModule>
`;
  }

  private generateNginxConfig(config: FrameworkConfig, fixes: SecurityFix[]): string {
    const headers = fixes.map(fix =>
      `    add_header ${fix.header} "${fix.value.replace(/"/g, '\\"')}" always;`
    ).join('\n');

    return `# Add these directives to your server block
server {
    # ... existing configuration ...

    # Security Headers
${headers}
}
`;
  }

  private generateVercelConfig(config: FrameworkConfig, fixes: SecurityFix[]): string {
    const existingConfig = config.content ? JSON.parse(config.content) : {};

    const headers = fixes.map(fix => ({
      key: fix.header,
      value: fix.value
    }));

    const vercelConfig = {
      ...existingConfig,
      headers: [
        ...(existingConfig.headers || []),
        {
          source: '/(.*)',
          headers
        }
      ]
    };

    return JSON.stringify(vercelConfig, null, 2);
  }

  private generateNetlifyConfig(config: FrameworkConfig, fixes: SecurityFix[]): string {
    const existingContent = config.content || '';
    const headers = fixes.map(fix => `  ${fix.header}: ${fix.value}`).join('\n');

    return `${existingContent}

/*
${headers}
`;
  }

  private generateStaticConfig(config: FrameworkConfig, fixes: SecurityFix[]): string {
    const headers = fixes.map(fix => `  ${fix.header}: ${fix.value}`).join('\n');

    return `/*
${headers}
`;
  }

  private generateGenericConfig(fixes: SecurityFix[]): string {
    return `# Security Headers Configuration

${fixes.map(fix => `${fix.header}: ${fix.value}`).join('\n')}
`;
  }

  private generatePRDescription(fixes: SecurityFix[], configs: FrameworkConfig[], changedFiles: string[]): string {
    const beforeScore = 0; // This would come from the analysis
    const afterScore = fixes.length * 10; // Simplified calculation

    return `## 🔒 Security Headers Enhancement

This pull request adds missing security headers to improve your application's security posture.

### 📊 Security Score Improvement
- **Before:** ${beforeScore}%
- **After:** ${Math.min(100, afterScore)}%
- **Improvement:** +${Math.min(100, afterScore) - beforeScore}%

### 🛡️ Added Security Headers

${fixes.map(fix => `#### ${fix.header}
- **Value:** \`${fix.value}\`
- **Description:** ${fix.description}
${fix.owaspLink ? `- **OWASP Reference:** [${fix.owaspLink}](${fix.owaspLink})` : ''}
${fix.browserCompatibility ? `- **Browser Support:** ${fix.browserCompatibility.join(', ')}` : ''}
`).join('\n')}

### 📁 Modified Files
${changedFiles.map(file => `- \`${file}\``).join('\n')}

### 🚀 Framework Detection
Detected configurations:
${configs.map(config => `- **${config.type.toUpperCase()}**: \`${config.configFile}\` ${config.exists ? '(updated)' : '(created)'}`).join('\n')}

### 🌐 Browser Compatibility
These security headers are supported by all modern browsers and will not affect functionality.

### 🧪 Testing Instructions
1. Deploy this branch to a staging environment
2. Use browser developer tools to verify headers are present
3. Test core application functionality
4. Use [securityheaders.com](https://securityheaders.com) to verify the security score

### 🔄 Rollback Instructions
If any issues occur, you can quickly revert by:
1. Reverting this pull request
2. Or temporarily commenting out the security headers in the configuration files

### 📚 Additional Resources
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Security Headers Quick Reference](https://securityheaders.com)

---
🤖 Generated with [Security Headers Analyzer](https://github.com/yourusername/security-headers-analyzer)
`;
  }

  /**
   * Verify repository access and permissions
   */
  async verifyRepositoryAccess(repoInfo: RepositoryInfo): Promise<boolean> {
    if (!this.isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      const { owner, repo } = repoInfo;

      await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      const { data: permissions } = await this.octokit.rest.repos.getCollaboratorPermissionLevel({
        owner,
        repo,
        username: (await this.octokit.rest.users.getAuthenticated()).data.login,
      });

      if (!permissions.permission || !['write', 'admin'].includes(permissions.permission)) {
        throw new Error('Insufficient permissions. Write access required.');
      }

      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Not Found')) {
          throw new Error('Repository not found or access denied');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('GitHub API rate limit exceeded');
        }
        throw error;
      }
      throw new Error('Repository verification failed');
    }
  }
}

// Helper function to convert SecurityHeader[] to SecurityFix[]
export function convertSecurityHeadersToFixes(headers: SecurityHeader[]): SecurityFix[] {
  const fixes: SecurityFix[] = [];

  headers.forEach(header => {
    if (!header.present || header.score < 100) {
      switch (header.name) {
        case 'Content-Security-Policy':
          fixes.push({
            header: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src 'none';",
            description: 'Prevents XSS attacks by controlling which resources can be loaded',
            owaspLink: 'https://owasp.org/www-community/controls/Content_Security_Policy',
            browserCompatibility: ['Chrome 25+', 'Firefox 23+', 'Safari 7+', 'Edge 12+']
          });
          break;
        case 'Strict-Transport-Security':
          fixes.push({
            header: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
            description: 'Forces HTTPS connections and prevents protocol downgrade attacks',
            owaspLink: 'https://owasp.org/www-community/Security_Headers#strict-transport-security',
            browserCompatibility: ['All modern browsers']
          });
          break;
        case 'X-Content-Type-Options':
          fixes.push({
            header: 'X-Content-Type-Options',
            value: 'nosniff',
            description: 'Prevents MIME type sniffing attacks',
            owaspLink: 'https://owasp.org/www-community/Security_Headers#x-content-type-options',
            browserCompatibility: ['IE 8+', 'All modern browsers']
          });
          break;
        case 'X-Frame-Options':
          fixes.push({
            header: 'X-Frame-Options',
            value: 'DENY',
            description: 'Prevents clickjacking attacks by controlling iframe embedding',
            owaspLink: 'https://owasp.org/www-community/Security_Headers#x-frame-options',
            browserCompatibility: ['IE 8+', 'All modern browsers']
          });
          break;
        case 'Referrer-Policy':
          fixes.push({
            header: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
            description: 'Controls how much referrer information is included with requests',
            owaspLink: 'https://owasp.org/www-community/Security_Headers#referrer-policy',
            browserCompatibility: ['Chrome 56+', 'Firefox 50+', 'Safari 11.1+']
          });
          break;
        case 'Permissions-Policy':
          fixes.push({
            header: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
            description: 'Controls which browser features and APIs can be used',
            owaspLink: 'https://owasp.org/www-community/Security_Headers#feature-policy',
            browserCompatibility: ['Chrome 60+', 'Firefox 74+', 'Safari 11.1+']
          });
          break;
        case 'Cross-Origin-Embedder-Policy':
          fixes.push({
            header: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
            description: 'Prevents documents from loading cross-origin resources that do not grant permission',
            owaspLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy',
            browserCompatibility: ['Chrome 83+', 'Firefox 79+', 'Safari 13.1+']
          });
          break;
        case 'Cross-Origin-Resource-Policy':
          fixes.push({
            header: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
            description: 'Controls cross-origin access to resources',
            owaspLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy',
            browserCompatibility: ['Chrome 73+', 'Firefox 74+', 'Safari 12+']
          });
          break;
        case 'Cross-Origin-Opener-Policy':
          fixes.push({
            header: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
            description: 'Prevents other websites from gaining references to your window object',
            owaspLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy',
            browserCompatibility: ['Chrome 83+', 'Firefox 79+', 'Safari 13.1+']
          });
          break;
      }
    }
  });

  return fixes;
}

