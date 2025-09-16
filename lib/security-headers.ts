import axios from 'axios';
import { SecurityHeader, SecurityAnalysis, HeaderRule, URLValidationResult } from '@/types/security';

export const SECURITY_HEADER_RULES: HeaderRule[] = [
  {
    name: 'Content-Security-Policy',
    required: true,
    weight: 20,
    severity: 'critical',
    description: 'Prevents XSS attacks by controlling which resources can be loaded',
    recommendation: 'Implement a strict CSP policy: "default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'"',
    validator: (value: string) => value.includes('default-src') && !value.includes('unsafe-eval'),
  },
  {
    name: 'Strict-Transport-Security',
    required: true,
    weight: 15,
    severity: 'high',
    description: 'Forces HTTPS connections and prevents downgrade attacks',
    recommendation: 'Set HSTS header: "max-age=31536000; includeSubDomains; preload"',
    validator: (value: string) => /max-age=\d+/.test(value) && parseInt(value.match(/max-age=(\d+)/)?.[1] || '0') >= 86400,
  },
  {
    name: 'X-Content-Type-Options',
    required: true,
    weight: 10,
    severity: 'medium',
    description: 'Prevents MIME type sniffing attacks',
    recommendation: 'Set header to "nosniff"',
    expectedValue: 'nosniff',
  },
  {
    name: 'X-Frame-Options',
    required: true,
    weight: 10,
    severity: 'medium',
    description: 'Prevents clickjacking attacks by controlling frame embedding',
    recommendation: 'Set to "DENY" or "SAMEORIGIN"',
    validator: (value: string) => ['DENY', 'SAMEORIGIN'].includes(value.toUpperCase()),
  },
  {
    name: 'X-XSS-Protection',
    required: false,
    weight: 5,
    severity: 'low',
    description: 'Legacy XSS protection (deprecated in favor of CSP)',
    recommendation: 'Set to "1; mode=block" or remove in favor of strong CSP',
    validator: (value: string) => value === '1; mode=block' || value === '0',
  },
  {
    name: 'Referrer-Policy',
    required: true,
    weight: 8,
    severity: 'medium',
    description: 'Controls how much referrer information is sent with requests',
    recommendation: 'Set to "strict-origin-when-cross-origin" or "no-referrer"',
    validator: (value: string) => ['strict-origin-when-cross-origin', 'no-referrer', 'same-origin'].includes(value),
  },
  {
    name: 'Permissions-Policy',
    required: false,
    weight: 7,
    severity: 'medium',
    description: 'Controls which browser features and APIs can be used',
    recommendation: 'Define explicit permissions: "geolocation=(), microphone=(), camera=()"',
  },
  {
    name: 'Cross-Origin-Embedder-Policy',
    required: false,
    weight: 6,
    severity: 'medium',
    description: 'Prevents cross-origin resource embedding',
    recommendation: 'Set to "require-corp" for enhanced isolation',
    expectedValue: 'require-corp',
  },
  {
    name: 'Cross-Origin-Resource-Policy',
    required: false,
    weight: 6,
    severity: 'medium',
    description: 'Controls cross-origin resource sharing',
    recommendation: 'Set to "cross-origin" or "same-origin" based on your needs',
    validator: (value: string) => ['cross-origin', 'same-origin', 'same-site'].includes(value),
  },
  {
    name: 'Cross-Origin-Opener-Policy',
    required: false,
    weight: 6,
    severity: 'medium',
    description: 'Prevents cross-origin window references',
    recommendation: 'Set to "same-origin" for enhanced security',
    validator: (value: string) => ['same-origin', 'same-origin-allow-popups', 'unsafe-none'].includes(value),
  },
];

export function validateUrl(url: string): URLValidationResult {
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

export async function fetchHeaders(url: string): Promise<Record<string, string>> {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true, // Accept any status code
    });

    // Convert headers to lowercase for case-insensitive comparison
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

export function analyzeHeader(rule: HeaderRule, headers: Record<string, string>): SecurityHeader {
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
        score = rule.weight * 0.5; // Partial credit for present but incorrect value
        recommendation = `${rule.recommendation} (Current value may be insecure: "${headerValue}")`;
      }
    } else if (rule.expectedValue) {
      if (typeof rule.expectedValue === 'string') {
        score = headerValue === rule.expectedValue ? rule.weight : rule.weight * 0.5;
      } else if (rule.expectedValue instanceof RegExp) {
        score = rule.expectedValue.test(headerValue) ? rule.weight : rule.weight * 0.5;
      }
    } else {
      score = rule.weight; // Present and no specific validation
    }
  } else if (!rule.required) {
    score = rule.weight * 0.3; // Small bonus for optional headers being absent
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

export function calculateGrade(score: number): SecurityAnalysis['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export async function analyzeSecurityHeaders(url: string): Promise<SecurityAnalysis> {
  const validation = validateUrl(url);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const headers = await fetchHeaders(validation.normalizedUrl!);
  const analyzedHeaders = SECURITY_HEADER_RULES.map(rule => analyzeHeader(rule, headers));

  const totalPossibleScore = SECURITY_HEADER_RULES.reduce((sum, rule) => sum + rule.weight, 0);
  const actualScore = analyzedHeaders.reduce((sum, header) => sum + header.score, 0);
  const overallScore = Math.round((actualScore / totalPossibleScore) * 100);

  const passed = analyzedHeaders.filter(h => h.score === SECURITY_HEADER_RULES.find(r => r.name === h.name)?.weight).length;
  const failed = analyzedHeaders.length - passed;

  return {
    url: validation.normalizedUrl!,
    timestamp: new Date().toISOString(),
    overallScore,
    grade: calculateGrade(overallScore),
    headers: analyzedHeaders,
    summary: {
      passed,
      failed,
      total: analyzedHeaders.length,
    },
  };
}

export function generateFixRecommendations(analysis: SecurityAnalysis): string {
  const failedHeaders = analysis.headers.filter(h => !h.present || h.score < (SECURITY_HEADER_RULES.find(r => r.name === h.name)?.weight || 0));

  if (failedHeaders.length === 0) {
    return 'All security headers are properly configured!';
  }

  let recommendations = '# Security Headers Fix Recommendations\n\n';
  recommendations += `Analysis for: ${analysis.url}\n`;
  recommendations += `Overall Score: ${analysis.overallScore}/100 (${analysis.grade})\n\n`;

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