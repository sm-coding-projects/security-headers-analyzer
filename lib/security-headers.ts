import axios from 'axios';
import {
  SecurityHeader,
  AnalysisResult,
  Recommendation,
  CSPDirective,
  HSTSConfig,
  URLValidationResult
} from '@/types/security';

export class SecurityHeaderAnalyzer {
  private rateLimitMap = new Map<string, number>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_WINDOW = 10;

  async analyzeURL(url: string): Promise<AnalysisResult> {
    this.checkRateLimit(url);

    const validation = this.validateUrl(url);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const headers = await this.fetchHeaders(validation.normalizedUrl!);
    const analyzedHeaders = this.analyzeAllHeaders(headers);
    const score = this.calculateSecurityScore(analyzedHeaders);
    const grade = this.calculateGrade(score);
    const framework = this.detectFrameworkFromHeaders(headers);

    return {
      url: validation.normalizedUrl!,
      score,
      grade,
      headers: this.categorizeHeaders(analyzedHeaders),
      recommendations: this.generateRecommendations(analyzedHeaders),
      fixes: this.generateFixes(analyzedHeaders, framework),
      framework,
      timestamp: new Date().toISOString()
    };
  }


  generateReport(result: AnalysisResult): string {
    let report = `# Security Headers Analysis Report\n\n`;
    report += `**URL:** ${result.url}\n`;
    report += `**Score:** ${result.score}/100 (${result.grade})\n`;
    report += `**Analyzed:** ${new Date(result.timestamp).toLocaleString()}\n`;
    if (result.framework) {
      report += `**Detected Framework:** ${result.framework}\n`;
    }
    report += `\n## Summary\n\n`;
    report += `- ✅ **Found:** ${result.headers.found.length} headers\n`;
    report += `- ❌ **Missing:** ${result.headers.missing.length} headers\n`;
    report += `- ⚠️ **Misconfigured:** ${result.headers.misconfigured.length} headers\n\n`;

    if (result.headers.missing.length > 0) {
      report += `## Missing Headers\n\n`;
      result.headers.missing.forEach(header => {
        report += `### ${header.name}\n`;
        report += `**Severity:** ${header.severity.toUpperCase()}\n`;
        report += `**Description:** ${header.description}\n`;
        report += `**Recommendation:** ${header.recommendation}\n\n`;
      });
    }

    if (result.headers.misconfigured.length > 0) {
      report += `## Misconfigured Headers\n\n`;
      result.headers.misconfigured.forEach(header => {
        report += `### ${header.name}\n`;
        report += `**Current Value:** \`${header.value}\`\n`;
        report += `**Severity:** ${header.severity.toUpperCase()}\n`;
        report += `**Issue:** ${header.recommendation}\n\n`;
      });
    }

    if (result.recommendations.length > 0) {
      report += `## Priority Recommendations\n\n`;
      const sortedRecs = result.recommendations.sort((a, b) => b.priority - a.priority);
      sortedRecs.slice(0, 5).forEach((rec, index) => {
        report += `${index + 1}. **${rec.header}** (${rec.severity}): ${rec.issue}\n`;
        report += `   Solution: ${rec.solution}\n\n`;
      });
    }

    return report;
  }

  generateFixes(headers: SecurityHeader[], _framework?: string): AnalysisResult['fixes'] {
    const missingHeaders = headers.filter(h => !h.present);
    const misconfiguredHeaders = headers.filter(h => h.present && h.score < this.getMaxScore(h.name));
    const problematicHeaders = [...missingHeaders, ...misconfiguredHeaders];

    return {
      nginx: this.generateNginxConfig(problematicHeaders),
      apache: this.generateApacheConfig(problematicHeaders),
      expressjs: this.generateExpressConfig(problematicHeaders),
      nextjs: this.generateNextJSConfig(problematicHeaders),
      cloudflare: this.generateCloudflareConfig(problematicHeaders)
    };
  }

  validateCSP(policy: string): { isValid: boolean; directives: CSPDirective[]; issues: string[] } {
    const directives: CSPDirective[] = [];
    const issues: string[] = [];

    if (!policy) {
      return { isValid: false, directives: [], issues: ['CSP policy is empty'] };
    }

    const directivePairs = policy.split(';').map(d => d.trim()).filter(d => d);

    for (const pair of directivePairs) {
      const [directive, ...sourceParts] = pair.split(/\s+/);
      const sources = sourceParts;

      const isUnsafe = sources.some(source =>
        source.includes('unsafe-inline') ||
        source.includes('unsafe-eval') ||
        source === '*'
      );

      if (isUnsafe) {
        if (sources.includes('unsafe-inline')) {
          issues.push(`${directive}: 'unsafe-inline' allows inline scripts/styles, reducing XSS protection`);
        }
        if (sources.includes('unsafe-eval')) {
          issues.push(`${directive}: 'unsafe-eval' allows eval(), reducing XSS protection`);
        }
        if (sources.includes('*')) {
          issues.push(`${directive}: wildcard (*) allows any source, reducing security`);
        }
      }

      directives.push({
        directive: directive.toLowerCase(),
        sources,
        isUnsafe
      });
    }

    if (!directives.find(d => d.directive === 'default-src')) {
      issues.push('Missing default-src directive - required as fallback');
    }

    return {
      isValid: issues.length === 0,
      directives,
      issues
    };
  }

  checkHSTSPreload(header: string): HSTSConfig {
    const maxAgeMatch = header.match(/max-age=(\d+)/i);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;
    const includeSubDomains = /includesubdomains/i.test(header);
    const preload = /preload/i.test(header);

    const isEligible = maxAge >= 31536000 && includeSubDomains && preload;

    return {
      maxAge,
      includeSubDomains,
      preload,
      isEligible
    };
  }

  detectFrameworkFromHeaders(headers: Record<string, string>): string | undefined {
    const serverHeader = headers['server']?.toLowerCase();
    const poweredByHeader = headers['x-powered-by']?.toLowerCase();

    if (serverHeader?.includes('nginx')) return 'nginx';
    if (serverHeader?.includes('apache')) return 'apache';
    if (serverHeader?.includes('iis')) return 'iis';
    if (serverHeader?.includes('cloudflare')) return 'cloudflare';

    if (poweredByHeader?.includes('express')) return 'express.js';
    if (poweredByHeader?.includes('next.js')) return 'next.js';
    if (poweredByHeader?.includes('php')) return 'php';
    if (poweredByHeader?.includes('asp.net')) return 'asp.net';

    if (headers['x-vercel-id']) return 'vercel';
    if (headers['x-netlify-id']) return 'netlify';
    if (headers['x-amz-cf-id']) return 'aws-cloudfront';

    return undefined;
  }

  private checkRateLimit(url: string): void {
    const now = Date.now();
    const key = new URL(url).hostname;
    const lastRequest = this.rateLimitMap.get(key) || 0;

    if (now - lastRequest < this.RATE_LIMIT_WINDOW) {
      const requestCount = this.rateLimitMap.get(`${key}_count`) || 0;
      if (requestCount >= this.MAX_REQUESTS_PER_WINDOW) {
        throw new Error(`Rate limit exceeded for ${key}. Please wait before making more requests.`);
      }
      this.rateLimitMap.set(`${key}_count`, requestCount + 1);
    } else {
      this.rateLimitMap.set(key, now);
      this.rateLimitMap.set(`${key}_count`, 1);
    }
  }

  private validateUrl(url: string): URLValidationResult {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: 'URL must use HTTP or HTTPS protocol',
        };
      }
      return {
        isValid: true,
        normalizedUrl: urlObj.toString(),
      };
    } catch {
      return {
        isValid: false,
        error: 'Invalid URL format',
      };
    }
  }

  private async fetchHeaders(url: string): Promise<Record<string, string>> {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
      });

      const headers: Record<string, string> = {};
      Object.entries(response.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        }
      });

      return headers;
    } catch (error) {
      throw new Error(`Failed to fetch headers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private analyzeAllHeaders(headers: Record<string, string>): SecurityHeader[] {
    const headerRules = this.getSecurityHeaderRules();
    return headerRules.map(rule => this.analyzeHeader(rule, headers));
  }

  private analyzeHeader(rule: { name: string; required: boolean; weight: number; severity: 'low' | 'medium' | 'high' | 'critical'; description: string; recommendation: string; validator?: (value: string) => boolean; expectedValue?: string | RegExp; }, headers: Record<string, string>): SecurityHeader {
    const headerKey = rule.name.toLowerCase();
    const headerValue = headers[headerKey];
    const present = !!headerValue;

    let score = 0;
    let recommendation = rule.recommendation;

    if (present) {
      if (rule.validator) {
        if (rule.validator(headerValue)) {
          score = rule.weight;
        } else {
          score = rule.weight * 0.5;
          recommendation = `${rule.recommendation} (Current value may be insecure: "${headerValue}")`;
        }
      } else if (rule.expectedValue) {
        if (typeof rule.expectedValue === 'string') {
          score = headerValue === rule.expectedValue ? rule.weight : rule.weight * 0.5;
        } else if (rule.expectedValue instanceof RegExp) {
          score = rule.expectedValue.test(headerValue) ? rule.weight : rule.weight * 0.5;
        }
      } else {
        score = rule.weight;
      }
    } else if (!rule.required) {
      score = rule.weight * 0.3;
      recommendation = `Optional: ${rule.recommendation}`;
    }

    return {
      name: rule.name,
      present,
      value: headerValue,
      score,
      severity: rule.severity,
      recommendation,
      description: rule.description,
    };
  }

  calculateSecurityScore(headers: SecurityHeader[]): number {
    const rules = this.getSecurityHeaderRules();
    const totalPossibleScore = rules.reduce((sum, rule) => sum + rule.weight, 0);
    const actualScore = headers.reduce((sum, header) => sum + header.score, 0);
    return Math.round((actualScore / totalPossibleScore) * 100);
  }

  private calculateGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  private categorizeHeaders(headers: SecurityHeader[]): AnalysisResult['headers'] {
    const found: SecurityHeader[] = [];
    const missing: SecurityHeader[] = [];
    const misconfigured: SecurityHeader[] = [];

    headers.forEach(header => {
      if (!header.present) {
        missing.push(header);
      } else if (header.score < this.getMaxScore(header.name)) {
        misconfigured.push(header);
      } else {
        found.push(header);
      }
    });

    return { found, missing, misconfigured };
  }

  private generateRecommendations(headers: SecurityHeader[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    headers.forEach(header => {
      if (!header.present || header.score < this.getMaxScore(header.name)) {
        let priority = 0;
        switch (header.severity) {
          case 'critical': priority = 100; break;
          case 'high': priority = 75; break;
          case 'medium': priority = 50; break;
          case 'low': priority = 25; break;
        }

        recommendations.push({
          header: header.name,
          severity: header.severity,
          issue: header.present ? 'Misconfigured' : 'Missing',
          solution: header.recommendation,
          priority
        });
      }
    });

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private getMaxScore(headerName: string): number {
    const rule = this.getSecurityHeaderRules().find(r => r.name === headerName);
    return rule?.weight || 0;
  }

  private generateNginxConfig(_headers: SecurityHeader[]): string {
    let config = "# Add these lines to your nginx server block\n";
    config += "add_header X-Content-Type-Options nosniff;\n";
    config += "add_header X-Frame-Options DENY;\n";
    config += "add_header X-XSS-Protection \"1; mode=block\";\n";
    config += "add_header Referrer-Policy strict-origin-when-cross-origin;\n";
    config += "add_header Content-Security-Policy \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'\";\n";
    config += "add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\";\n";
    config += "add_header Permissions-Policy \"geolocation=(), microphone=(), camera=()\";\n";
    return config;
  }

  private generateApacheConfig(_headers: SecurityHeader[]): string {
    let config = "# Add these lines to your .htaccess file\n";
    config += "Header always set X-Content-Type-Options nosniff\n";
    config += "Header always set X-Frame-Options DENY\n";
    config += "Header always set X-XSS-Protection \"1; mode=block\"\n";
    config += "Header always set Referrer-Policy strict-origin-when-cross-origin\n";
    config += "Header always set Content-Security-Policy \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'\"\n";
    config += "Header always set Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\"\n";
    config += "Header always set Permissions-Policy \"geolocation=(), microphone=(), camera=()\"\n";
    return config;
  }

  private generateExpressConfig(_headers: SecurityHeader[]): string {
    return `// Add this middleware to your Express.js app
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Or manually:
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});`;
  }

  private generateNextJSConfig(_headers: SecurityHeader[]): string {
    return `// Add this to your next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ];
  }
};`;
  }

  private generateCloudflareConfig(_headers: SecurityHeader[]): string {
    return `// Cloudflare Workers script
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const response = await fetch(request);
  const newResponse = new Response(response.body, response);

  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('X-Frame-Options', 'DENY');
  newResponse.headers.set('X-XSS-Protection', '1; mode=block');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newResponse.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
  newResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  return newResponse;
}`;
  }

  getSecurityHeaderRules() {
    return [
      {
        name: 'Content-Security-Policy',
        required: true,
        weight: 25,
        severity: 'critical' as const,
        description: 'Prevents XSS attacks by controlling which resources can be loaded',
        recommendation: 'Implement a strict CSP policy without unsafe-inline or unsafe-eval',
        validator: (value: string) => {
          const cspAnalysis = this.validateCSP(value);
          return cspAnalysis.isValid;
        },
      },
      {
        name: 'Strict-Transport-Security',
        required: true,
        weight: 20,
        severity: 'high' as const,
        description: 'Forces HTTPS connections and prevents downgrade attacks',
        recommendation: 'Set HSTS header with max-age >= 31536000, includeSubDomains, and preload',
        validator: (value: string) => {
          const hstsConfig = this.checkHSTSPreload(value);
          return hstsConfig.maxAge >= 31536000;
        },
      },
      {
        name: 'X-Frame-Options',
        required: true,
        weight: 10,
        severity: 'medium' as const,
        description: 'Prevents clickjacking attacks by controlling frame embedding',
        recommendation: 'Set to "DENY" or "SAMEORIGIN"',
        validator: (value: string) => ['DENY', 'SAMEORIGIN'].includes(value.toUpperCase()),
      },
      {
        name: 'X-Content-Type-Options',
        required: true,
        weight: 10,
        severity: 'medium' as const,
        description: 'Prevents MIME type sniffing attacks',
        recommendation: 'Set header to "nosniff"',
        expectedValue: 'nosniff',
      },
      {
        name: 'Referrer-Policy',
        required: true,
        weight: 10,
        severity: 'medium' as const,
        description: 'Controls how much referrer information is sent with requests',
        recommendation: 'Set to "strict-origin-when-cross-origin" or "no-referrer"',
        validator: (value: string) => ['strict-origin-when-cross-origin', 'no-referrer', 'same-origin'].includes(value),
      },
      {
        name: 'Permissions-Policy',
        required: false,
        weight: 15,
        severity: 'medium' as const,
        description: 'Controls which browser features and APIs can be used',
        recommendation: 'Define explicit permissions for geolocation, microphone, camera, etc.',
      },
      {
        name: 'X-XSS-Protection',
        required: false,
        weight: 5,
        severity: 'low' as const,
        description: 'Legacy XSS protection (deprecated in favor of CSP)',
        recommendation: 'Set to "1; mode=block" or remove in favor of strong CSP',
        validator: (value: string) => value === '1; mode=block' || value === '0',
      },
      {
        name: 'Cross-Origin-Embedder-Policy',
        required: false,
        weight: 3,
        severity: 'low' as const,
        description: 'Prevents cross-origin resource embedding',
        recommendation: 'Set to "require-corp" for enhanced isolation',
        expectedValue: 'require-corp',
      },
      {
        name: 'Cross-Origin-Resource-Policy',
        required: false,
        weight: 2,
        severity: 'low' as const,
        description: 'Controls cross-origin resource sharing',
        recommendation: 'Set to "cross-origin" or "same-origin" based on your needs',
        validator: (value: string) => ['cross-origin', 'same-origin', 'same-site'].includes(value),
      }
    ];
  }
}

// Export backward compatibility functions
export const analyzer = new SecurityHeaderAnalyzer();

export async function analyzeSecurityHeaders(url: string) {
  return analyzer.analyzeURL(url);
}

export function validateUrl(url: string) {
  return new SecurityHeaderAnalyzer()['validateUrl'](url);
}

export async function fetchHeaders(url: string) {
  return new SecurityHeaderAnalyzer()['fetchHeaders'](url);
}

export function generateFixRecommendations(analysis: { url: string; timestamp: string; score: number; grade: string; headers: { found: SecurityHeader[]; missing: SecurityHeader[]; misconfigured: SecurityHeader[]; }; }): string {
  const analyzer = new SecurityHeaderAnalyzer();
  const rules = analyzer.getSecurityHeaderRules();

  const allHeaders = [...analysis.headers.found, ...analysis.headers.missing, ...analysis.headers.misconfigured];
  const failedHeaders = [...analysis.headers.missing, ...analysis.headers.misconfigured];

  if (failedHeaders.length === 0) {
    return 'All security headers are properly configured!';
  }

  let recommendations = '# Security Headers Fix Recommendations\n\n';
  recommendations += `Analysis for: ${analysis.url}\n`;
  recommendations += `Overall Score: ${analysis.score}/100 (${analysis.grade})\n\n`;

  failedHeaders.forEach(header => {
    recommendations += `## ${header.name}\n`;
    recommendations += `**Status**: ${header.present ? 'Present but needs improvement' : 'Missing'}\n`;
    recommendations += `**Severity**: ${header.severity.toUpperCase()}\n`;
    recommendations += `**Description**: ${header.description}\n`;
    recommendations += `**Recommendation**: ${header.recommendation}\n\n`;

    if (header.present && header.value) {
      recommendations += `**Current Value**: \`${header.value}\`\n\n`;
    }
  });

  return recommendations;
}