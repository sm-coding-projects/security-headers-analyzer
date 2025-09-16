// Security types - stub for testing

export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}

export interface AnalysisResult {
  url: string;
  timestamp: string;
  headers: Record<string, string>;
  analysis: {
    score: number;
    grade: string;
    summary: string;
  };
  cached?: boolean;
  cacheTimestamp?: string;
}

export interface PRResponse {
  success: boolean;
  pr?: {
    number: number;
    url: string;
  };
  error?: string;
}

export interface GitHubPRRequest {
  repoUrl: string;
  headers: any[];
  title?: string;
  branch?: string;
}