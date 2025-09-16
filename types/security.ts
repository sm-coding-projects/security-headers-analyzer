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
  cached?: boolean;
  cacheTimestamp?: string;
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

// Additional types for advanced features

export interface TrendData {
  date: string;
  score: number;
  grade: string;
  url: string;
  missingHeaders: number;
  foundHeaders: number;
  framework?: string;
}

export interface IndustryAverage {
  sector: string;
  averageScore: number;
  commonMissing: string[];
}

export interface BatchAnalysisResult {
  id: string;
  url: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  score?: number;
  grade?: string;
  timestamp?: string;
  error?: string;
  headers?: {
    found: number;
    missing: number;
    misconfigured: number;
  };
  framework?: string;
}

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

export interface CSPDirectiveConfig {
  name: string;
  sources: string[];
  enabled: boolean;
}

export interface HSTSConfiguration {
  maxAge: number;
  includeSubDomains: boolean;
  preload: boolean;
}

export interface PermissionsPolicyDirective {
  feature: string;
  allowlist: string[];
  enabled: boolean;
}

export interface PlaygroundConfig {
  csp: CSPDirectiveConfig[];
  hsts: HSTSConfiguration;
  permissionsPolicy: PermissionsPolicyDirective[];
}

export interface UsageStatistics {
  totalAnalyses: number;
  uniqueUrls: number;
  averageScore: number;
  mostCommonIssues: { header: string; count: number; percentage: number }[];
  frameworkDistribution: { framework: string; count: number; percentage: number }[];
  timeSeriesData: { date: string; analyses: number; averageScore: number }[];
  userEngagement: {
    returningUsers: number;
    avgSessionTime: number;
    bounceRate: number;
    featuresUsed: { feature: string; usage: number }[];
  };
}

export interface SecurityInsight {
  id: string;
  type: 'trend' | 'alert' | 'recommendation' | 'achievement';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  actionable: boolean;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface FixSuccessMetrics {
  header: string;
  attemptedFixes: number;
  successfulFixes: number;
  successRate: number;
  averageTimeToFix: number;
  commonFailureReasons: string[];
}

export interface DashboardMetrics {
  overview: {
    totalAnalyses: number;
    avgSecurityScore: number;
    trendsDirection: 'up' | 'down' | 'stable';
    criticalIssuesFound: number;
  };
  recentActivity: {
    analysesLast24h: number;
    newUniqueUrls: number;
    improvementRate: number;
  };
  topIssues: Array<{
    header: string;
    frequency: number;
    impact: 'high' | 'medium' | 'low';
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  performanceMetrics: {
    avgAnalysisTime: number;
    successRate: number;
    errorRate: number;
  };
}

export interface IntegrationConfig {
  slack?: {
    webhookUrl: string;
    channel: string;
    username: string;
    thresholds: {
      criticalScore: number;
      notifyOnImprovement: boolean;
      notifyOnDegradation: boolean;
    };
  };
  webhook?: {
    url: string;
    events: string[];
    secret?: string;
    headers: Record<string, string>;
    active: boolean;
  };
  github?: {
    token: string;
    repository: string;
    enablePRs: boolean;
    enableIssues: boolean;
  };
}

export interface AISuggestion {
  id: string;
  type: 'csp_generation' | 'security_recommendation' | 'documentation' | 'optimization';
  title: string;
  description: string;
  confidence: number;
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

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  isDarkMode?: boolean;
}

export interface AnalysisContextType {
  currentAnalysis: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  analyzeUrl: (url: string) => Promise<void>;
  clearError: () => void;
}

// Utility types
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';
export type SecurityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export type FrameworkType = 'nginx' | 'apache' | 'express.js' | 'next.js' | 'cloudflare' | string;
export type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'error';

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | string;
}

export interface FormValidation {
  [key: string]: ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Event types for analytics
export interface AnalyticsEvent {
  type: 'analysis_start' | 'analysis_complete' | 'feature_usage' | 'error' | 'export';
  data: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
  userId?: string;
}