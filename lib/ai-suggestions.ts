import { AnalysisResult, SecurityHeader } from '@/types/security';

export interface AISuggestion {
  id: string;
  type: 'csp_generation' | 'security_recommendation' | 'documentation' | 'optimization';
  title: string;
  description: string;
  confidence: number; // 0-100
  content: string;
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: string;
    steps: string[];
    code?: string;
    warnings?: string[];
  };
  context: {
    url: string;
    detectedTech: string[];
    securityRisk: 'low' | 'medium' | 'high' | 'critical';
  };
  metadata: {
    generatedAt: string;
    version: string;
    tags: string[];
  };
}

export interface ContentSecurityPolicyBuilder {
  generatePolicy(analysis: AnalysisResult, options?: CSPOptions): AISuggestion;
  analyzeExistingPolicy(policy: string): PolicyAnalysis;
  suggestPolicyImprovements(currentPolicy: string, siteContext: SiteContext): AISuggestion[];
}

export interface CSPOptions {
  strictness: 'lenient' | 'balanced' | 'strict';
  allowInlineStyles: boolean;
  allowInlineScripts: boolean;
  allowEval: boolean;
  reportOnly: boolean;
  customDirectives?: Record<string, string[]>;
}

export interface PolicyAnalysis {
  score: number;
  issues: PolicyIssue[];
  recommendations: string[];
  securityLevel: 'low' | 'medium' | 'high';
}

export interface PolicyIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  directive: string;
  issue: string;
  solution: string;
  cveReferences?: string[];
}

export interface SiteContext {
  url: string;
  framework?: string;
  technologies: string[];
  thirdPartyServices: string[];
  hasInlineScripts: boolean;
  hasInlineStyles: boolean;
  usesEval: boolean;
  externalResources: {
    scripts: string[];
    styles: string[];
    images: string[];
    fonts: string[];
  };
}

export interface SecurityDocumentation {
  generateImplementationGuide(headers: SecurityHeader[], framework?: string): AISuggestion;
  generateBestPracticesGuide(analysis: AnalysisResult): AISuggestion;
  generateComplianceReport(analysis: AnalysisResult, standards: string[]): AISuggestion;
}

class AISecurityAdvisor {
  private knowledgeBase: Map<string, Record<string, unknown>> = new Map();
  private policyTemplates: Map<string, Record<string, unknown>> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
    this.initializePolicyTemplates();
  }

  private initializeKnowledgeBase() {
    // Security header knowledge base with AI-driven insights
    const securityKnowledge = {
      'Content-Security-Policy': {
        commonPatterns: [
          { pattern: 'e-commerce', policy: "default-src 'self'; script-src 'self' https://js.stripe.com https://checkout.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com;" },
          { pattern: 'blog', policy: "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;" },
          { pattern: 'spa', policy: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:;" },
          { pattern: 'landing', policy: "default-src 'self'; script-src 'self' https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" }
        ],
        riskFactors: {
          'unsafe-inline': { risk: 90, description: 'Allows inline scripts/styles, major XSS risk' },
          'unsafe-eval': { risk: 95, description: 'Allows eval(), extremely dangerous for XSS' },
          '*': { risk: 80, description: 'Wildcard allows any source, reduces security' },
          'data:': { risk: 30, description: 'Data URIs can be used for XSS in some contexts' }
        }
      }
    };

    this.knowledgeBase.set('security', securityKnowledge);
  }

  private initializePolicyTemplates() {
    const templates = {
      'next.js': {
        development: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';",
        production: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self';"
      },
      'react': {
        development: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:;",
        production: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self';"
      },
      'wordpress': {
        default: "default-src 'self'; script-src 'self' 'unsafe-inline' https://wordpress.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;"
      }
    };

    this.policyTemplates.set('frameworks', templates);
  }

  public generateIntelligentCSP(analysis: AnalysisResult, options: CSPOptions = {
    strictness: 'balanced',
    allowInlineStyles: true,
    allowInlineScripts: false,
    allowEval: false,
    reportOnly: false
  }): AISuggestion {
    const framework = analysis.framework?.toLowerCase() || 'generic';
    const detectedTech = this.detectTechnologies(analysis.url);
    const siteType = this.classifySiteType(analysis.url, detectedTech);

    const basePolicy = this.generateBasePolicyForSite(siteType, framework, options);
    const _optimizations = this.optimizePolicyForContext(basePolicy, detectedTech);

    const steps = this.generateImplementationSteps(basePolicy, framework);
    const warnings = this.generateWarnings(basePolicy, options);

    return {
      id: `csp-suggestion-${Date.now()}`,
      type: 'csp_generation',
      title: 'AI-Generated Content Security Policy',
      description: `Customized CSP policy for ${siteType} site using ${framework}`,
      confidence: this.calculateConfidence(detectedTech, framework),
      content: basePolicy,
      implementation: {
        difficulty: this.assessImplementationDifficulty(basePolicy, framework),
        estimatedTime: this.estimateImplementationTime(basePolicy, framework),
        steps,
        code: this.generateImplementationCode(basePolicy, framework),
        warnings
      },
      context: {
        url: analysis.url,
        detectedTech,
        securityRisk: this.assessSecurityRisk(analysis)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        tags: ['csp', 'ai-generated', siteType, framework]
      }
    };
  }

  public analyzeExistingCSP(policy: string): PolicyAnalysis {
    const directives = this.parseCSPPolicy(policy);
    const issues: PolicyIssue[] = [];
    let score = 100;

    // Analyze each directive
    directives.forEach(({ directive, sources }) => {
      const directiveIssues = this.analyzeDirective(directive, sources);
      issues.push(...directiveIssues);
      score -= directiveIssues.reduce((sum, issue) => sum + this.getIssueScoreImpact(issue), 0);
    });

    // Check for missing critical directives
    const criticalDirectives = ['default-src', 'script-src'];
    criticalDirectives.forEach(directive => {
      if (!directives.find(d => d.directive === directive)) {
        issues.push({
          severity: 'high',
          directive,
          issue: `Missing critical directive: ${directive}`,
          solution: `Add ${directive} directive to improve security`
        });
        score -= 20;
      }
    });

    return {
      score: Math.max(0, score),
      issues,
      recommendations: this.generateCSPRecommendations(issues),
      securityLevel: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
    };
  }

  public generateSecurityRecommendation(analysis: AnalysisResult): AISuggestion {
    const criticalIssues = [...analysis.headers.missing, ...analysis.headers.misconfigured]
      .filter(header => header.severity === 'critical' || header.severity === 'high')
      .sort((a, b) => this.getHeaderPriority(b.name) - this.getHeaderPriority(a.name));

    const topIssue = criticalIssues[0];
    if (!topIssue) {
      return this.generateMaintenanceRecommendation(analysis);
    }

    const recommendation = this.generateHeaderRecommendation(topIssue, analysis);

    return {
      id: `security-rec-${Date.now()}`,
      type: 'security_recommendation',
      title: `Priority Fix: ${topIssue.name}`,
      description: `Implement ${topIssue.name} to address ${topIssue.severity} security risk`,
      confidence: 95,
      content: recommendation.content,
      implementation: recommendation.implementation,
      context: {
        url: analysis.url,
        detectedTech: this.detectTechnologies(analysis.url),
        securityRisk: topIssue.severity as 'low' | 'medium' | 'high' | 'critical'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        tags: ['security', 'priority', topIssue.name.toLowerCase()]
      }
    };
  }

  public generateImplementationDocumentation(headers: SecurityHeader[], framework?: string): AISuggestion {
    const missingHeaders = headers.filter(h => !h.present);
    const documentationSections = this.generateDocumentationSections(missingHeaders, framework);

    return {
      id: `docs-${Date.now()}`,
      type: 'documentation',
      title: 'Security Headers Implementation Guide',
      description: `Complete implementation guide for ${missingHeaders.length} security headers`,
      confidence: 90,
      content: documentationSections.join('\n\n'),
      implementation: {
        difficulty: 'medium',
        estimatedTime: '2-4 hours',
        steps: [
          'Review the implementation guide',
          'Test configurations in staging',
          'Implement headers incrementally',
          'Monitor for issues',
          'Deploy to production'
        ]
      },
      context: {
        url: 'documentation',
        detectedTech: framework ? [framework] : [],
        securityRisk: 'medium'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        tags: ['documentation', 'implementation', 'guide']
      }
    };
  }

  public generateOptimizationSuggestion(analysis: AnalysisResult): AISuggestion {
    const optimizations = this.identifyOptimizationOpportunities(analysis);

    return {
      id: `optimization-${Date.now()}`,
      type: 'optimization',
      title: 'Security Headers Optimization',
      description: 'Performance and security optimizations for your current headers',
      confidence: 85,
      content: this.formatOptimizations(optimizations),
      implementation: {
        difficulty: 'easy',
        estimatedTime: '30-60 minutes',
        steps: optimizations.map(opt => opt.action)
      },
      context: {
        url: analysis.url,
        detectedTech: this.detectTechnologies(analysis.url),
        securityRisk: 'low'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        tags: ['optimization', 'performance']
      }
    };
  }

  private detectTechnologies(url: string): string[] {
    // In a real implementation, this would analyze the website
    // For now, return common technologies based on patterns
    const technologies: string[] = [];

    if (url.includes('vercel.app') || url.includes('netlify.app')) {
      technologies.push('jamstack');
    }

    // This would normally use actual detection
    return ['html5', 'css3', 'javascript'];
  }

  private classifySiteType(url: string, technologies: string[]): string {
    // AI classification based on URL and technologies
    if (url.includes('shop') || url.includes('store') || url.includes('cart')) {
      return 'e-commerce';
    }
    if (url.includes('blog') || url.includes('news')) {
      return 'blog';
    }
    if (technologies.includes('react') || technologies.includes('vue') || technologies.includes('angular')) {
      return 'spa';
    }
    return 'landing';
  }

  private generateBasePolicyForSite(siteType: string, framework: string, options: CSPOptions): string {
    const templates = this.policyTemplates.get('frameworks') as Record<string, Record<string, unknown>>;
    const frameworkTemplate = templates[framework] as Record<string, string>;

    if (frameworkTemplate) {
      return frameworkTemplate.production || frameworkTemplate.default;
    }

    // Generate based on site type
    const securityKnowledge = this.knowledgeBase.get('security') as Record<string, Record<string, unknown>>;
    const pattern = (securityKnowledge['Content-Security-Policy'] as Record<string, unknown>).commonPatterns as Array<{ pattern: string; policy: string }>;
    const foundPattern = pattern.find((p: { pattern: string; policy: string }) => p.pattern === siteType);

    if (foundPattern) {
      return this.customizePolicyForOptions(foundPattern.policy, options);
    }

    // Fallback to safe default
    return this.generateSafeDefaultPolicy(options);
  }

  private customizePolicyForOptions(basePolicy: string, options: CSPOptions): string {
    let policy = basePolicy;

    if (!options.allowInlineStyles) {
      policy = policy.replace("'unsafe-inline'", "'self'");
    }

    if (!options.allowInlineScripts) {
      policy = policy.replace(/'unsafe-inline'/g, "'self'");
    }

    if (!options.allowEval) {
      policy = policy.replace(/'unsafe-eval'/g, "'self'");
    }

    if (options.strictness === 'strict') {
      policy = policy.replace(/https:/g, "'self'");
    }

    return policy;
  }

  private generateSafeDefaultPolicy(options: CSPOptions): string {
    const directives = [
      "default-src 'self'",
      `script-src 'self'${options.allowEval ? " 'unsafe-eval'" : ''}`,
      `style-src 'self'${options.allowInlineStyles ? " 'unsafe-inline'" : ''}`,
      "img-src 'self' data: https:",
      "font-src 'self' https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    return directives.join('; ');
  }

  private optimizePolicyForContext(policy: string, technologies: string[]): string {
    // Optimize based on detected technologies
    let optimizedPolicy = policy;

    if (technologies.includes('google-analytics')) {
      optimizedPolicy = optimizedPolicy.replace(
        'script-src',
        'script-src \'self\' https://www.google-analytics.com https://ssl.google-analytics.com'
      );
    }

    if (technologies.includes('stripe')) {
      optimizedPolicy = optimizedPolicy.replace(
        'script-src',
        'script-src \'self\' https://js.stripe.com'
      );
    }

    return optimizedPolicy;
  }

  private generateImplementationSteps(policy: string, framework: string): string[] {
    const baseSteps = [
      'Start with Content-Security-Policy-Report-Only header for testing',
      'Monitor CSP violation reports',
      'Adjust policy based on legitimate violations',
      'Switch to enforcing mode'
    ];

    const frameworkSteps: Record<string, string[]> = {
      'next.js': [
        'Add CSP configuration to next.config.js',
        'Test in development environment',
        'Configure for production builds',
        'Deploy with monitoring'
      ],
      'nginx': [
        'Add header directive to nginx configuration',
        'Test configuration syntax',
        'Reload nginx configuration',
        'Monitor access logs for violations'
      ],
      'apache': [
        'Add Header directive to .htaccess or virtual host',
        'Test configuration',
        'Restart Apache if needed',
        'Monitor error logs'
      ]
    };

    return frameworkSteps[framework] || baseSteps;
  }

  private generateWarnings(policy: string, options: CSPOptions): string[] {
    const warnings: string[] = [];

    if (policy.includes('unsafe-inline')) {
      warnings.push('Policy includes unsafe-inline which reduces XSS protection');
    }

    if (policy.includes('unsafe-eval')) {
      warnings.push('Policy includes unsafe-eval which is a security risk');
    }

    if (options.reportOnly) {
      warnings.push('Policy is in report-only mode - violations will not be blocked');
    }

    return warnings;
  }

  private calculateConfidence(technologies: string[], framework: string): number {
    let confidence = 80; // Base confidence

    if (framework && this.policyTemplates.get('frameworks')?.[framework]) {
      confidence += 15; // Higher confidence for known frameworks
    }

    if (technologies.length > 0) {
      confidence += 5; // Slightly higher for detected technologies
    }

    return Math.min(100, confidence);
  }

  private assessImplementationDifficulty(policy: string, framework: string): 'easy' | 'medium' | 'hard' {
    const complexDirectives = ['script-src', 'style-src', 'connect-src'];
    const policyDirectives = policy.split(';').map(d => d.trim().split(' ')[0]);

    const hasComplexDirectives = complexDirectives.some(d => policyDirectives.includes(d));
    const hasUnsafeKeywords = policy.includes('unsafe-');

    if (framework === 'next.js' && !hasUnsafeKeywords) return 'easy';
    if (hasComplexDirectives && hasUnsafeKeywords) return 'hard';
    return 'medium';
  }

  private estimateImplementationTime(policy: string, framework: string): string {
    const difficulty = this.assessImplementationDifficulty(policy, framework);

    const timeEstimates = {
      'easy': '15-30 minutes',
      'medium': '1-2 hours',
      'hard': '2-4 hours'
    };

    return timeEstimates[difficulty];
  }

  private generateImplementationCode(policy: string, framework: string): string {
    const codeTemplates: Record<string, string> = {
      'next.js': `// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: '${policy}'
          }
        ]
      }
    ];
  }
};`,
      'nginx': `# Add to nginx server block
add_header Content-Security-Policy "${policy}" always;`,
      'apache': `# Add to .htaccess or virtual host
Header always set Content-Security-Policy "${policy}"`,
      'express.js': `// Express.js middleware
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', '${policy}');
  next();
});`
    };

    return codeTemplates[framework] || codeTemplates['nginx'];
  }

  private assessSecurityRisk(analysis: AnalysisResult): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = analysis.headers.missing.filter(h => h.severity === 'critical').length;
    const highCount = analysis.headers.missing.filter(h => h.severity === 'high').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 1) return 'high';
    if (analysis.score < 60) return 'medium';
    return 'low';
  }

  private parseCSPPolicy(policy: string): Array<{ directive: string; sources: string[] }> {
    return policy.split(';').map(part => {
      const [directive, ...sources] = part.trim().split(/\s+/);
      return { directive, sources };
    });
  }

  private analyzeDirective(directive: string, sources: string[]): PolicyIssue[] {
    const issues: PolicyIssue[] = [];
    const securityKnowledge = this.knowledgeBase.get('security') as Record<string, Record<string, unknown>>;
    const riskFactors = (securityKnowledge['Content-Security-Policy'] as Record<string, unknown>).riskFactors as Record<string, { risk: number; description: string }>;

    sources.forEach(source => {
      if (riskFactors[source]) {
        const risk = riskFactors[source];
        issues.push({
          severity: risk.risk > 80 ? 'critical' : risk.risk > 60 ? 'high' : 'medium',
          directive,
          issue: `Unsafe source '${source}': ${risk.description}`,
          solution: `Consider removing '${source}' or using safer alternatives`
        });
      }
    });

    return issues;
  }

  private getIssueScoreImpact(issue: PolicyIssue): number {
    const impacts = { critical: 25, high: 15, medium: 10, low: 5 };
    return impacts[issue.severity];
  }

  private generateCSPRecommendations(issues: PolicyIssue[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.issue.includes('unsafe-inline'))) {
      recommendations.push('Replace unsafe-inline with nonces or hashes for better security');
    }

    if (issues.some(i => i.issue.includes('unsafe-eval'))) {
      recommendations.push('Remove unsafe-eval and refactor code to avoid eval()');
    }

    if (issues.some(i => i.directive === 'default-src')) {
      recommendations.push('Add specific directives instead of relying only on default-src');
    }

    return recommendations;
  }

  private getHeaderPriority(headerName: string): number {
    const priorities: Record<string, number> = {
      'Content-Security-Policy': 100,
      'Strict-Transport-Security': 90,
      'X-Frame-Options': 80,
      'X-Content-Type-Options': 70,
      'Referrer-Policy': 60
    };

    return priorities[headerName] || 50;
  }

  private generateHeaderRecommendation(header: SecurityHeader, analysis: AnalysisResult): {
    content: string;
    implementation: {
      difficulty: 'easy' | 'medium' | 'hard';
      estimatedTime: string;
      steps: string[];
      code: string;
      warnings: string[];
    };
  } {
    // Generate AI-powered recommendation for specific header
    return {
      content: `To implement ${header.name}, ${header.recommendation}`,
      implementation: {
        difficulty: 'medium' as const,
        estimatedTime: '30-60 minutes',
        steps: [
          `Research ${header.name} best practices`,
          'Configure header value',
          'Test in staging environment',
          'Deploy to production',
          'Monitor for issues'
        ],
        code: this.generateHeaderCode(header.name, analysis.framework),
        warnings: []
      }
    };
  }

  private generateHeaderCode(headerName: string, framework?: string): string {
    // Generate implementation code for specific header
    const headerValues: Record<string, string> = {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    const value = headerValues[headerName];
    if (!value) return '';

    if (framework === 'next.js') {
      return `{
  key: '${headerName}',
  value: '${value}'
}`;
    }

    return `add_header ${headerName} "${value}" always;`;
  }

  private generateMaintenanceRecommendation(analysis: AnalysisResult): AISuggestion {
    return {
      id: `maintenance-${Date.now()}`,
      type: 'optimization',
      title: 'Security Maintenance Recommendations',
      description: 'Your security headers are well configured. Here are maintenance suggestions.',
      confidence: 80,
      content: 'Regular security audits and header reviews are recommended to maintain security standards.',
      implementation: {
        difficulty: 'easy',
        estimatedTime: '15-30 minutes',
        steps: [
          'Schedule monthly security reviews',
          'Monitor for new security headers',
          'Update policies as needed',
          'Keep up with security best practices'
        ]
      },
      context: {
        url: analysis.url,
        detectedTech: [],
        securityRisk: 'low'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        tags: ['maintenance', 'monitoring']
      }
    };
  }

  private generateDocumentationSections(headers: SecurityHeader[], framework?: string): string[] {
    return headers.map(header => `
## ${header.name}

**Severity:** ${header.severity.toUpperCase()}

**Description:** ${header.description}

**Recommendation:** ${header.recommendation}

**Implementation:**
\`\`\`
${this.generateHeaderCode(header.name, framework)}
\`\`\`

**Testing:** Use browser developer tools to verify the header is present.
    `.trim());
  }

  private identifyOptimizationOpportunities(analysis: AnalysisResult): Array<{ issue: string; action: string; impact: string }> {
    const optimizations: Array<{ issue: string; action: string; impact: string }> = [];

    // Check for redundant headers
    const foundHeaders = analysis.headers.found.map(h => h.name);
    if (foundHeaders.includes('X-XSS-Protection') && foundHeaders.includes('Content-Security-Policy')) {
      optimizations.push({
        issue: 'X-XSS-Protection is redundant when CSP is present',
        action: 'Remove X-XSS-Protection header',
        impact: 'Reduces header bloat without security impact'
      });
    }

    // Check for optimization opportunities
    if (analysis.score > 90) {
      optimizations.push({
        issue: 'Headers are well configured',
        action: 'Consider enabling HSTS preload',
        impact: 'Further improves HTTPS enforcement'
      });
    }

    return optimizations;
  }

  private formatOptimizations(optimizations: Array<{ issue: string; action: string; impact: string }>): string {
    return optimizations.map(opt => `
**Issue:** ${opt.issue}
**Action:** ${opt.action}
**Impact:** ${opt.impact}
    `.trim()).join('\n\n');
  }
}

export const aiSecurityAdvisor = new AISecurityAdvisor();