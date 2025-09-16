import { SecurityHeader, AnalysisResult } from '@/types/security';

export interface SmartRecommendation {
  header: string;
  priority: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'xss' | 'clickjacking' | 'transport' | 'content' | 'privacy' | 'permissions';
  issue: string;
  solution: string;
  implementation: {
    complexity: 'easy' | 'medium' | 'hard';
    estimatedTime: string;
    dependencies: string[];
    potentialBreaking: boolean;
  };
  frameworkSpecific?: {
    [framework: string]: {
      config: string;
      notes?: string;
      compatibilityWarning?: string;
    };
  };
  performanceImpact: {
    level: 'none' | 'minimal' | 'moderate' | 'significant';
    description: string;
  };
  complianceStandards: string[];
  learningResources: {
    documentation: string;
    examples: string[];
    tools?: string[];
  };
}

export interface CompatibilityWarning {
  browser: string;
  version: string;
  issue: string;
  workaround?: string;
}

export interface SecurityIntelligence {
  recommendations: SmartRecommendation[];
  priorityMatrix: {
    critical: SmartRecommendation[];
    high: SmartRecommendation[];
    medium: SmartRecommendation[];
    low: SmartRecommendation[];
  };
  compatibilityWarnings: CompatibilityWarning[];
  implementationRoadmap: {
    phase1: SmartRecommendation[];
    phase2: SmartRecommendation[];
    phase3: SmartRecommendation[];
  };
  estimatedSecurityImprovement: number;
}

export class SecurityIntelligenceEngine {
  private knowledgeBase: Map<string, SmartRecommendation> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase() {
    const recommendations: SmartRecommendation[] = [
      {
        header: 'Content-Security-Policy',
        priority: 100,
        severity: 'critical',
        category: 'xss',
        issue: 'Missing Content Security Policy leaves application vulnerable to XSS attacks',
        solution: 'Implement a strict CSP policy that defines allowed sources for scripts, styles, and other resources',
        implementation: {
          complexity: 'hard',
          estimatedTime: '2-4 hours',
          dependencies: ['Content audit', 'Testing in staging'],
          potentialBreaking: true
        },
        frameworkSpecific: {
          'next.js': {
            config: `// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
          }
        ]
      }
    ];
  }
};`,
            notes: 'Next.js requires unsafe-eval for development. Use environment-specific policies.',
            compatibilityWarning: 'Ensure all external scripts and styles are properly whitelisted'
          },
          'nginx': {
            config: `add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self'; frame-ancestors 'none';" always;`,
            notes: 'Test thoroughly before production deployment'
          },
          'apache': {
            config: `Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self'; frame-ancestors 'none';"`
          },
          'express.js': {
            config: `app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self'; frame-ancestors 'none';");
  next();
});`
          }
        },
        performanceImpact: {
          level: 'minimal',
          description: 'CSP adds minimal overhead but may require browser to parse policy on each request'
        },
        complianceStandards: ['OWASP Top 10', 'PCI DSS', 'ISO 27001'],
        learningResources: {
          documentation: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
          examples: [
            'https://csp-evaluator.withgoogle.com/',
            'https://content-security-policy.com/'
          ],
          tools: ['CSP Evaluator', 'CSP Builder']
        }
      },
      {
        header: 'Strict-Transport-Security',
        priority: 90,
        severity: 'high',
        category: 'transport',
        issue: 'Missing HSTS header allows man-in-the-middle attacks and protocol downgrade attacks',
        solution: 'Implement HSTS with long max-age, includeSubDomains, and preload directives',
        implementation: {
          complexity: 'easy',
          estimatedTime: '15-30 minutes',
          dependencies: ['HTTPS certificate'],
          potentialBreaking: false
        },
        frameworkSpecific: {
          'nginx': {
            config: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;`,
            notes: 'Only add over HTTPS connections'
          },
          'apache': {
            config: `Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"`
          },
          'next.js': {
            config: `// next.config.js
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains; preload'
}`
          },
          'express.js': {
            config: `app.use((req, res, next) => {
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});`
          }
        },
        performanceImpact: {
          level: 'none',
          description: 'No performance impact, actually improves performance by preventing HTTP requests'
        },
        complianceStandards: ['OWASP Top 10', 'PCI DSS'],
        learningResources: {
          documentation: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
          examples: ['https://hstspreload.org/']
        }
      },
      {
        header: 'X-Frame-Options',
        priority: 80,
        severity: 'medium',
        category: 'clickjacking',
        issue: 'Missing X-Frame-Options allows clickjacking attacks through iframe embedding',
        solution: 'Set X-Frame-Options to DENY or SAMEORIGIN to prevent clickjacking',
        implementation: {
          complexity: 'easy',
          estimatedTime: '10 minutes',
          dependencies: [],
          potentialBreaking: false
        },
        frameworkSpecific: {
          'nginx': {
            config: `add_header X-Frame-Options "DENY" always;`
          },
          'apache': {
            config: `Header always set X-Frame-Options "DENY"`
          },
          'next.js': {
            config: `{
  key: 'X-Frame-Options',
  value: 'DENY'
}`
          },
          'express.js': {
            config: `app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});`
          }
        },
        performanceImpact: {
          level: 'none',
          description: 'No performance impact'
        },
        complianceStandards: ['OWASP Top 10'],
        learningResources: {
          documentation: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
          examples: []
        }
      },
      {
        header: 'X-Content-Type-Options',
        priority: 70,
        severity: 'medium',
        category: 'content',
        issue: 'Missing X-Content-Type-Options allows MIME sniffing attacks',
        solution: 'Set X-Content-Type-Options to nosniff to prevent MIME type sniffing',
        implementation: {
          complexity: 'easy',
          estimatedTime: '5 minutes',
          dependencies: [],
          potentialBreaking: false
        },
        frameworkSpecific: {
          'nginx': {
            config: `add_header X-Content-Type-Options "nosniff" always;`
          },
          'apache': {
            config: `Header always set X-Content-Type-Options "nosniff"`
          },
          'next.js': {
            config: `{
  key: 'X-Content-Type-Options',
  value: 'nosniff'
}`
          },
          'express.js': {
            config: `app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});`
          }
        },
        performanceImpact: {
          level: 'none',
          description: 'No performance impact'
        },
        complianceStandards: ['OWASP Top 10'],
        learningResources: {
          documentation: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options',
          examples: []
        }
      },
      {
        header: 'Referrer-Policy',
        priority: 60,
        severity: 'medium',
        category: 'privacy',
        issue: 'Missing Referrer Policy may leak sensitive information in referrer headers',
        solution: 'Set Referrer-Policy to control how much referrer information is sent',
        implementation: {
          complexity: 'easy',
          estimatedTime: '10 minutes',
          dependencies: [],
          potentialBreaking: false
        },
        frameworkSpecific: {
          'nginx': {
            config: `add_header Referrer-Policy "strict-origin-when-cross-origin" always;`
          },
          'apache': {
            config: `Header always set Referrer-Policy "strict-origin-when-cross-origin"`
          },
          'next.js': {
            config: `{
  key: 'Referrer-Policy',
  value: 'strict-origin-when-cross-origin'
}`
          },
          'express.js': {
            config: `app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});`
          }
        },
        performanceImpact: {
          level: 'none',
          description: 'No performance impact'
        },
        complianceStandards: ['GDPR (Privacy)', 'ISO 27001'],
        learningResources: {
          documentation: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy',
          examples: []
        }
      },
      {
        header: 'Permissions-Policy',
        priority: 50,
        severity: 'medium',
        category: 'permissions',
        issue: 'Missing Permissions Policy allows unrestricted access to browser APIs',
        solution: 'Implement Permissions Policy to control which browser features can be used',
        implementation: {
          complexity: 'medium',
          estimatedTime: '30-60 minutes',
          dependencies: ['Feature audit'],
          potentialBreaking: true
        },
        frameworkSpecific: {
          'nginx': {
            config: `add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), fullscreen=(self), payment=()" always;`,
            notes: 'Adjust permissions based on your application needs'
          },
          'apache': {
            config: `Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), fullscreen=(self), payment=()"`
          },
          'next.js': {
            config: `{
  key: 'Permissions-Policy',
  value: 'geolocation=(), microphone=(), camera=(), fullscreen=(self), payment=()'
}`
          },
          'express.js': {
            config: `app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), fullscreen=(self), payment=()');
  next();
});`
          }
        },
        performanceImpact: {
          level: 'minimal',
          description: 'Minimal impact, may improve performance by preventing unnecessary API access'
        },
        complianceStandards: ['Privacy Standards'],
        learningResources: {
          documentation: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy',
          examples: ['https://permissions-policy-demo.glitch.me/']
        }
      }
    ];

    recommendations.forEach(rec => {
      this.knowledgeBase.set(rec.header, rec);
    });
  }

  public generateIntelligence(analysis: AnalysisResult): SecurityIntelligence {
    const missingHeaders = analysis.headers.missing;
    const misconfiguredHeaders = analysis.headers.misconfigured;
    const framework = analysis.framework;

    const recommendations = this.generateSmartRecommendations(missingHeaders, misconfiguredHeaders, framework);
    const priorityMatrix = this.createPriorityMatrix(recommendations);
    const compatibilityWarnings = this.generateCompatibilityWarnings(recommendations, framework);
    const implementationRoadmap = this.createImplementationRoadmap(recommendations);
    const estimatedSecurityImprovement = this.calculateSecurityImprovement(recommendations, analysis.score);

    return {
      recommendations,
      priorityMatrix,
      compatibilityWarnings,
      implementationRoadmap,
      estimatedSecurityImprovement
    };
  }

  private generateSmartRecommendations(
    missingHeaders: SecurityHeader[],
    misconfiguredHeaders: SecurityHeader[],
    framework?: string
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];

    // Process missing headers
    missingHeaders.forEach(header => {
      const knowledgeItem = this.knowledgeBase.get(header.name);
      if (knowledgeItem) {
        recommendations.push(this.customizeRecommendation(knowledgeItem, framework, 'missing'));
      }
    });

    // Process misconfigured headers
    misconfiguredHeaders.forEach(header => {
      const knowledgeItem = this.knowledgeBase.get(header.name);
      if (knowledgeItem) {
        const customized = this.customizeRecommendation(knowledgeItem, framework, 'misconfigured');
        customized.issue = `${header.name} is present but misconfigured: ${header.value}`;
        customized.priority *= 0.8; // Slightly lower priority than missing
        recommendations.push(customized);
      }
    });

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private customizeRecommendation(
    base: SmartRecommendation,
    framework?: string,
    _type: 'missing' | 'misconfigured' = 'missing'
  ): SmartRecommendation {
    const customized = { ...base };

    // Adjust based on framework
    if (framework && base.frameworkSpecific?.[framework]) {
      customized.solution += ` For ${framework}, use the following configuration.`;
    }

    // Adjust priority based on framework capabilities
    if (framework === 'next.js' && base.header === 'Content-Security-Policy') {
      customized.implementation.complexity = 'medium'; // Next.js has built-in support
      customized.implementation.estimatedTime = '1-2 hours';
    }

    return customized;
  }

  private createPriorityMatrix(recommendations: SmartRecommendation[]) {
    return {
      critical: recommendations.filter(r => r.severity === 'critical'),
      high: recommendations.filter(r => r.severity === 'high'),
      medium: recommendations.filter(r => r.severity === 'medium'),
      low: recommendations.filter(r => r.severity === 'low')
    };
  }

  private generateCompatibilityWarnings(
    recommendations: SmartRecommendation[],
    framework?: string
  ): CompatibilityWarning[] {
    const warnings: CompatibilityWarning[] = [];

    recommendations.forEach(rec => {
      // Add framework-specific warnings
      if (framework && rec.frameworkSpecific?.[framework]?.compatibilityWarning) {
        warnings.push({
          browser: 'All',
          version: 'N/A',
          issue: rec.frameworkSpecific[framework].compatibilityWarning || '',
          workaround: 'Test thoroughly in staging environment'
        });
      }

      // Add general compatibility warnings
      if (rec.header === 'Content-Security-Policy') {
        warnings.push({
          browser: 'Internet Explorer',
          version: '< 11',
          issue: 'CSP not supported in IE < 11',
          workaround: 'Use X-Content-Security-Policy for IE 10'
        });
      }

      if (rec.header === 'Permissions-Policy') {
        warnings.push({
          browser: 'Safari',
          version: '< 14',
          issue: 'Permissions Policy not fully supported',
          workaround: 'Feature detection recommended'
        });
      }
    });

    return warnings;
  }

  private createImplementationRoadmap(recommendations: SmartRecommendation[]) {
    const sorted = [...recommendations].sort((a, b) => {
      // Sort by priority and complexity
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;

      const complexityOrder = { easy: 1, medium: 2, hard: 3 };
      return complexityOrder[a.implementation.complexity] - complexityOrder[b.implementation.complexity];
    });

    // Distribute into phases
    const phase1: SmartRecommendation[] = [];
    const phase2: SmartRecommendation[] = [];
    const phase3: SmartRecommendation[] = [];

    sorted.forEach((rec, index) => {
      if (rec.implementation.complexity === 'easy' || rec.severity === 'critical') {
        phase1.push(rec);
      } else if (rec.implementation.complexity === 'medium' || index < sorted.length / 2) {
        phase2.push(rec);
      } else {
        phase3.push(rec);
      }
    });

    return { phase1, phase2, phase3 };
  }

  private calculateSecurityImprovement(recommendations: SmartRecommendation[], currentScore: number): number {
    const maxPossibleImprovement = 100 - currentScore;
    const totalPriority = recommendations.reduce((sum, rec) => sum + rec.priority, 0);
    const maxPriority = recommendations.length * 100;

    if (maxPriority === 0) return 0;

    const improvementRatio = totalPriority / maxPriority;
    return Math.round(maxPossibleImprovement * improvementRatio * 0.8); // Conservative estimate
  }

  public getFrameworkSpecificGuidance(framework: string, headers: string[]): string[] {
    const guidance: string[] = [];

    headers.forEach(headerName => {
      const knowledge = this.knowledgeBase.get(headerName);
      if (knowledge?.frameworkSpecific?.[framework]) {
        guidance.push(`${headerName}: ${knowledge.frameworkSpecific[framework].notes || 'Standard implementation applies'}`);
      }
    });

    return guidance;
  }

  public estimateImplementationTime(recommendations: SmartRecommendation[]): string {
    const totalMinutes = recommendations.reduce((sum, rec) => {
      const timeStr = rec.implementation.estimatedTime;
      const matches = timeStr.match(/(\d+)-?(\d+)?\s*(minutes?|hours?)/);

      if (matches) {
        const min = parseInt(matches[1]);
        const max = matches[2] ? parseInt(matches[2]) : min;
        const unit = matches[3];
        const avgTime = (min + max) / 2;

        return sum + (unit.includes('hour') ? avgTime * 60 : avgTime);
      }

      return sum + 30; // Default fallback
    }, 0);

    if (totalMinutes < 60) {
      return `${Math.round(totalMinutes)} minutes`;
    } else {
      const hours = Math.round(totalMinutes / 60 * 10) / 10;
      return `${hours} hours`;
    }
  }

  public generateSecurityScore(headers: SecurityHeader[]): number {
    const weights = {
      'Content-Security-Policy': 25,
      'Strict-Transport-Security': 20,
      'X-Frame-Options': 15,
      'X-Content-Type-Options': 10,
      'Referrer-Policy': 10,
      'Permissions-Policy': 10,
      'X-XSS-Protection': 5,
      'Cross-Origin-Embedder-Policy': 3,
      'Cross-Origin-Resource-Policy': 2
    };

    let totalScore = 0;
    let maxPossibleScore = 0;

    headers.forEach(header => {
      const weight = weights[header.name as keyof typeof weights] || 1;
      maxPossibleScore += weight;

      if (header.present && header.score > 0) {
        totalScore += (header.score / 10) * weight;
      }
    });

    return maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
  }
}

export const securityIntelligence = new SecurityIntelligenceEngine();