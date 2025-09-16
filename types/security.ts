export interface SecurityHeader {
  name: string;
  present: boolean;
  value?: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  description: string;
}

export interface SecurityAnalysis {
  url: string;
  timestamp: string;
  overallScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  headers: SecurityHeader[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}

export interface AnalysisResult {
  url: string;
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  headers: {
    found: SecurityHeader[];
    missing: SecurityHeader[];
    misconfigured: SecurityHeader[];
  };
  recommendations: Recommendation[];
  fixes: {
    nginx: string;
    apache: string;
    expressjs: string;
    nextjs: string;
    cloudflare: string;
  };
  framework?: string;
  timestamp: string;
}

export interface Recommendation {
  header: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  issue: string;
  solution: string;
  priority: number;
}

export interface CSPDirective {
  directive: string;
  sources: string[];
  isUnsafe: boolean;
}

export interface HSTSConfig {
  maxAge: number;
  includeSubDomains: boolean;
  preload: boolean;
  isEligible: boolean;
}

export interface HeaderRule {
  name: string;
  required: boolean;
  weight: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  validator?: (value: string) => boolean;
  expectedValue?: string | RegExp;
}

export interface GitHubPRRequest {
  repoUrl: string;
  headers: SecurityHeader[];
  title: string;
  body: string;
  branch: string;
}

export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}

export interface PRResponse {
  success: boolean;
  pullRequestUrl?: string;
  error?: string;
}

export interface URLValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
}