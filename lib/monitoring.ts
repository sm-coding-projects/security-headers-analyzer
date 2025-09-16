import { AnalysisResult } from '@/types/security';

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
  averageTimeToFix: number; // in minutes
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

export class SecurityMonitoringService {
  private storage: Storage;
  private readonly STORAGE_KEYS = {
    ANALYSES: 'security_analyses_history',
    USAGE_STATS: 'usage_statistics',
    FIX_METRICS: 'fix_success_metrics',
    USER_PREFERENCES: 'user_preferences',
    SESSION_DATA: 'session_data'
  };

  constructor() {
    this.storage = typeof window !== 'undefined' ? localStorage : {} as Storage;
  }

  public recordAnalysis(analysis: AnalysisResult): void {
    try {
      const analyses = this.getStoredAnalyses();
      const newAnalysis = {
        ...analysis,
        recordedAt: new Date().toISOString(),
        sessionId: this.getSessionId()
      };

      analyses.push(newAnalysis);

      // Keep only last 1000 analyses to prevent storage bloat
      const trimmedAnalyses = analyses.slice(-1000);

      this.storage.setItem(this.STORAGE_KEYS.ANALYSES, JSON.stringify(trimmedAnalyses));
      this.updateUsageStatistics(newAnalysis);
      this.generateInsights();

    } catch (error) {
      console.error('Failed to record analysis:', error);
    }
  }

  public recordFixAttempt(header: string, success: boolean, timeSpent: number, failureReason?: string): void {
    try {
      const metrics = this.getFixSuccessMetrics();
      const headerMetric = metrics.find(m => m.header === header) || {
        header,
        attemptedFixes: 0,
        successfulFixes: 0,
        successRate: 0,
        averageTimeToFix: 0,
        commonFailureReasons: []
      };

      headerMetric.attemptedFixes++;
      if (success) {
        headerMetric.successfulFixes++;
      } else if (failureReason) {
        headerMetric.commonFailureReasons.push(failureReason);
      }

      headerMetric.successRate = (headerMetric.successfulFixes / headerMetric.attemptedFixes) * 100;
      headerMetric.averageTimeToFix = success
        ? (headerMetric.averageTimeToFix + timeSpent) / 2
        : headerMetric.averageTimeToFix;

      // Update or add the metric
      const existingIndex = metrics.findIndex(m => m.header === header);
      if (existingIndex >= 0) {
        metrics[existingIndex] = headerMetric;
      } else {
        metrics.push(headerMetric);
      }

      this.storage.setItem(this.STORAGE_KEYS.FIX_METRICS, JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to record fix attempt:', error);
    }
  }

  public getUsageStatistics(): UsageStatistics {
    try {
      const stored = this.storage.getItem(this.STORAGE_KEYS.USAGE_STATS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to get usage statistics:', error);
    }

    return this.generateEmptyStatistics();
  }

  public getDashboardMetrics(): DashboardMetrics {
    const analyses = this.getStoredAnalyses();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentAnalyses = analyses.filter(a => new Date(a.recordedAt || a.timestamp) >= last24h);
    const weekAnalyses = analyses.filter(a => new Date(a.recordedAt || a.timestamp) >= lastWeek);

    const totalAnalyses = analyses.length;
    const avgScore = totalAnalyses > 0
      ? analyses.reduce((sum, a) => sum + a.score, 0) / totalAnalyses
      : 0;

    // Calculate trend direction
    const recentAvgScore = recentAnalyses.length > 0
      ? recentAnalyses.reduce((sum, a) => sum + a.score, 0) / recentAnalyses.length
      : avgScore;

    const trendsDirection: 'up' | 'down' | 'stable' =
      recentAvgScore > avgScore + 5 ? 'up' :
      recentAvgScore < avgScore - 5 ? 'down' : 'stable';

    // Count critical issues
    const criticalIssuesFound = analyses.reduce((count, analysis) => {
      const criticalHeaders = ['Content-Security-Policy', 'Strict-Transport-Security'];
      const missingCritical = analysis.headers.missing.filter(h =>
        criticalHeaders.includes(h.name)
      ).length;
      return count + missingCritical;
    }, 0);

    // Get top issues
    const issueFrequency = new Map<string, number>();
    analyses.forEach(analysis => {
      [...analysis.headers.missing, ...analysis.headers.misconfigured].forEach(header => {
        issueFrequency.set(header.name, (issueFrequency.get(header.name) || 0) + 1);
      });
    });

    const topIssues = Array.from(issueFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([header, frequency]) => ({
        header,
        frequency,
        impact: this.getHeaderImpact(header),
        trend: 'stable' as const // Would need historical data to determine actual trend
      }));

    return {
      overview: {
        totalAnalyses,
        avgSecurityScore: Math.round(avgScore),
        trendsDirection,
        criticalIssuesFound
      },
      recentActivity: {
        analysesLast24h: recentAnalyses.length,
        newUniqueUrls: new Set(recentAnalyses.map(a => a.url)).size,
        improvementRate: this.calculateImprovementRate(weekAnalyses)
      },
      topIssues,
      performanceMetrics: {
        avgAnalysisTime: 2.5, // Would be measured in real implementation
        successRate: 95.2,
        errorRate: 4.8
      }
    };
  }

  public getSecurityInsights(): SecurityInsight[] {
    const insights: SecurityInsight[] = [];
    const _analyses = this.getStoredAnalyses();
    const stats = this.getUsageStatistics();

    // Trend insights
    if (stats.timeSeriesData.length >= 2) {
      const recent = stats.timeSeriesData.slice(-7);
      const trend = this.calculateTrend(recent.map(d => d.averageScore));

      if (trend > 0.1) {
        insights.push({
          id: 'security-improvement-trend',
          type: 'trend',
          severity: 'success',
          title: 'Security Scores Improving',
          description: `Your average security score has increased by ${(trend * 100).toFixed(1)}% over the last week.`,
          actionable: false,
          data: { trend, timeframe: '7 days' },
          timestamp: new Date().toISOString()
        });
      } else if (trend < -0.1) {
        insights.push({
          id: 'security-decline-alert',
          type: 'alert',
          severity: 'warning',
          title: 'Security Scores Declining',
          description: `Your average security score has decreased by ${Math.abs(trend * 100).toFixed(1)}% over the last week.`,
          actionable: true,
          data: { trend, timeframe: '7 days' },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Common issue insights
    const topIssue = stats.mostCommonIssues[0];
    if (topIssue && topIssue.percentage > 50) {
      insights.push({
        id: 'common-issue-alert',
        type: 'recommendation',
        severity: 'warning',
        title: `${topIssue.header} Issues Are Common`,
        description: `${topIssue.header} issues appear in ${topIssue.percentage}% of your analyses. Consider implementing a standard fix.`,
        actionable: true,
        data: topIssue,
        timestamp: new Date().toISOString()
      });
    }

    // Achievement insights
    const avgScore = stats.averageScore;
    if (avgScore >= 90) {
      insights.push({
        id: 'high-security-achievement',
        type: 'achievement',
        severity: 'success',
        title: 'Excellent Security Standards',
        description: `Your average security score is ${avgScore}/100. You\'re maintaining excellent security standards!`,
        actionable: false,
        data: { score: avgScore },
        timestamp: new Date().toISOString()
      });
    }

    return insights.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public trackFeatureUsage(feature: string): void {
    try {
      const sessionData = this.getSessionData();
      sessionData.featuresUsed = sessionData.featuresUsed || {};
      sessionData.featuresUsed[feature] = (sessionData.featuresUsed[feature] || 0) + 1;
      sessionData.lastActivity = new Date().toISOString();

      this.storage.setItem(this.STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to track feature usage:', error);
    }
  }

  public getTopSecurityRecommendations(): Array<{
    header: string;
    priority: number;
    frequency: number;
    estimatedImpact: number;
    implementationDifficulty: 'easy' | 'medium' | 'hard';
  }> {
    const analyses = this.getStoredAnalyses();
    const headerFrequency = new Map<string, number>();
    const headerSeverity = new Map<string, number>();

    analyses.forEach(analysis => {
      [...analysis.headers.missing, ...analysis.headers.misconfigured].forEach(header => {
        headerFrequency.set(header.name, (headerFrequency.get(header.name) || 0) + 1);

        const severityScore = {
          'critical': 100,
          'high': 75,
          'medium': 50,
          'low': 25
        }[header.severity] || 25;

        headerSeverity.set(header.name, Math.max(headerSeverity.get(header.name) || 0, severityScore));
      });
    });

    return Array.from(headerFrequency.entries())
      .map(([header, frequency]) => ({
        header,
        priority: (headerSeverity.get(header) || 25) + (frequency / analyses.length) * 25,
        frequency,
        estimatedImpact: this.estimateSecurityImpact(header),
        implementationDifficulty: this.getImplementationDifficulty(header)
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);
  }

  public exportAnalyticsData(): string {
    const data = {
      usageStatistics: this.getUsageStatistics(),
      dashboardMetrics: this.getDashboardMetrics(),
      fixSuccessMetrics: this.getFixSuccessMetrics(),
      securityInsights: this.getSecurityInsights(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(data, null, 2);
  }

  private updateUsageStatistics(analysis: AnalysisResult): void {
    try {
      const stats = this.getUsageStatistics();

      stats.totalAnalyses++;

      // Update unique URLs
      const analyses = this.getStoredAnalyses();
      const uniqueUrls = new Set(analyses.map(a => a.url));
      stats.uniqueUrls = uniqueUrls.size;

      // Update average score
      const totalScore = analyses.reduce((sum, a) => sum + a.score, 0);
      stats.averageScore = Math.round(totalScore / analyses.length);

      // Update most common issues
      const issueCount = new Map<string, number>();
      analyses.forEach(a => {
        [...a.headers.missing, ...a.headers.misconfigured].forEach(h => {
          issueCount.set(h.name, (issueCount.get(h.name) || 0) + 1);
        });
      });

      stats.mostCommonIssues = Array.from(issueCount.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([header, count]) => ({
          header,
          count,
          percentage: Math.round((count / stats.totalAnalyses) * 100)
        }));

      // Update framework distribution
      const frameworkCount = new Map<string, number>();
      analyses.forEach(a => {
        if (a.framework) {
          frameworkCount.set(a.framework, (frameworkCount.get(a.framework) || 0) + 1);
        }
      });

      stats.frameworkDistribution = Array.from(frameworkCount.entries())
        .map(([framework, count]) => ({
          framework,
          count,
          percentage: Math.round((count / stats.totalAnalyses) * 100)
        }))
        .sort((a, b) => b.count - a.count);

      // Update time series data
      const today = new Date().toISOString().split('T')[0];
      const todayData = stats.timeSeriesData.find(d => d.date === today);

      if (todayData) {
        todayData.analyses++;
        const todayAnalyses = analyses.filter(a =>
          a.recordedAt?.split('T')[0] === today || a.timestamp.split('T')[0] === today
        );
        todayData.averageScore = Math.round(
          todayAnalyses.reduce((sum, a) => sum + a.score, 0) / todayAnalyses.length
        );
      } else {
        stats.timeSeriesData.push({
          date: today,
          analyses: 1,
          averageScore: analysis.score
        });
      }

      // Keep only last 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      stats.timeSeriesData = stats.timeSeriesData.filter(d =>
        new Date(d.date) >= cutoffDate
      );

      this.storage.setItem(this.STORAGE_KEYS.USAGE_STATS, JSON.stringify(stats));
    } catch (error) {
      console.error('Failed to update usage statistics:', error);
    }
  }

  private generateInsights(): void {
    // This would trigger insight generation based on new data
    // Implementation would depend on specific insight rules
  }

  private getStoredAnalyses(): Array<AnalysisResult & { recordedAt?: string; sessionId?: string }> {
    try {
      const stored = this.storage.getItem(this.STORAGE_KEYS.ANALYSES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored analyses:', error);
      return [];
    }
  }

  private getFixSuccessMetrics(): FixSuccessMetrics[] {
    try {
      const stored = this.storage.getItem(this.STORAGE_KEYS.FIX_METRICS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get fix success metrics:', error);
      return [];
    }
  }

  private getSessionData(): {
    sessionId: string;
    startTime: string;
    featuresUsed: Record<string, number>;
    lastActivity: string;
  } {
    try {
      const stored = this.storage.getItem(this.STORAGE_KEYS.SESSION_DATA);
      return stored ? JSON.parse(stored) : {
        sessionId: this.generateSessionId(),
        startTime: new Date().toISOString(),
        featuresUsed: {},
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get session data:', error);
      return {
        sessionId: this.generateSessionId(),
        startTime: new Date().toISOString(),
        featuresUsed: {},
        lastActivity: new Date().toISOString()
      };
    }
  }

  private getSessionId(): string {
    const sessionData = this.getSessionData();
    return sessionData.sessionId || this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateEmptyStatistics(): UsageStatistics {
    return {
      totalAnalyses: 0,
      uniqueUrls: 0,
      averageScore: 0,
      mostCommonIssues: [],
      frameworkDistribution: [],
      timeSeriesData: [],
      userEngagement: {
        returningUsers: 0,
        avgSessionTime: 0,
        bounceRate: 0,
        featuresUsed: []
      }
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return (secondAvg - firstAvg) / firstAvg;
  }

  private calculateImprovementRate(analyses: Array<AnalysisResult & { recordedAt?: string; sessionId?: string }>): number {
    if (analyses.length < 2) return 0;

    const sorted = analyses.sort((a, b) =>
      new Date(a.recordedAt || a.timestamp).getTime() -
      new Date(b.recordedAt || b.timestamp).getTime()
    );

    const improved = sorted.filter((analysis, index) => {
      if (index === 0) return false;
      return analysis.score > sorted[index - 1].score;
    });

    return Math.round((improved.length / (sorted.length - 1)) * 100);
  }

  private getHeaderImpact(header: string): 'high' | 'medium' | 'low' {
    const highImpactHeaders = ['Content-Security-Policy', 'Strict-Transport-Security'];
    const mediumImpactHeaders = ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'];

    if (highImpactHeaders.includes(header)) return 'high';
    if (mediumImpactHeaders.includes(header)) return 'medium';
    return 'low';
  }

  private estimateSecurityImpact(header: string): number {
    const impacts: Record<string, number> = {
      'Content-Security-Policy': 90,
      'Strict-Transport-Security': 85,
      'X-Frame-Options': 70,
      'X-Content-Type-Options': 60,
      'Referrer-Policy': 50,
      'Permissions-Policy': 45,
      'X-XSS-Protection': 30
    };

    return impacts[header] || 25;
  }

  private getImplementationDifficulty(header: string): 'easy' | 'medium' | 'hard' {
    const easyHeaders = ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'];
    const hardHeaders = ['Content-Security-Policy'];

    if (easyHeaders.includes(header)) return 'easy';
    if (hardHeaders.includes(header)) return 'hard';
    return 'medium';
  }
}

export const monitoringService = new SecurityMonitoringService();