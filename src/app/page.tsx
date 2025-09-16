'use client';

import { useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import URLInput from '@/components/URLInput';
import HeadersReport from '@/components/HeadersReport';
import { AnalysisResult, AnalysisResponse, PRResponse } from '@/types/security';
import { generateFixRecommendations } from '@/lib/security-headers';

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);

  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data: AnalysisResponse = await response.json();

      if (data.success && data.data) {
        setAnalysis(data.data);
        toast.success('Analysis completed successfully!');
      } else {
        toast.error(data.error || 'Analysis failed');
      }
    } catch (error) {
      toast.error('Failed to analyze the URL. Please try again.');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreatePR = async () => {
    if (!analysis) return;

    const githubToken = prompt(
      'Enter your GitHub Personal Access Token:\n\n' +
      'To create this token:\n' +
      '1. Go to GitHub Settings > Developer settings > Personal access tokens\n' +
      '2. Generate a new token with "repo" permissions\n' +
      '3. Copy and paste it here'
    );

    if (!githubToken) {
      toast.error('GitHub token is required to create a PR');
      return;
    }

    const repoUrl = prompt(
      'Enter the GitHub repository URL where you want to create the PR:\n' +
      'Example: https://github.com/username/repository'
    );

    if (!repoUrl) {
      toast.error('Repository URL is required');
      return;
    }

    setIsCreatingPR(true);

    try {
      const response = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl,
          headers: [...analysis.headers.found, ...analysis.headers.missing, ...analysis.headers.misconfigured],
          title: `Security Headers Fix - Improve security score from ${analysis.score}/100`,
          githubToken,
        }),
      });

      const data: PRResponse = await response.json();

      if (data.success && data.pullRequestUrl) {
        toast.success('Pull request created successfully!');
        window.open(data.pullRequestUrl, '_blank');
      } else {
        toast.error(data.error || 'Failed to create pull request');
      }
    } catch (error) {
      toast.error('Failed to create pull request. Please try again.');
      console.error('PR creation error:', error);
    } finally {
      setIsCreatingPR(false);
    }
  };

  const handleDownloadReport = () => {
    if (!analysis) return;

    const report = generateFixRecommendations(analysis);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-headers-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Security Headers Analyzer
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Analyze your website&apos;s security headers, get detailed recommendations,
            and automatically generate fix configurations for your servers.
          </p>
        </div>

        {/* URL Input Section */}
        <div className="mb-12">
          <URLInput onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
        </div>

        {/* Results Section */}
        {analysis && (
          <div className="mb-12">
            <HeadersReport
              analysis={analysis}
              onCreatePR={!isCreatingPR ? handleCreatePR : undefined}
              onDownloadReport={handleDownloadReport}
            />
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 border-t border-gray-200 mt-16">
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-600 mb-4">
              Built with Next.js 14, TypeScript, and Tailwind CSS
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-500">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Security Headers Checked</h3>
                <ul className="space-y-1">
                  <li>Content-Security-Policy</li>
                  <li>Strict-Transport-Security</li>
                  <li>X-Content-Type-Options</li>
                  <li>X-Frame-Options</li>
                  <li>And 6 more...</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Features</h3>
                <ul className="space-y-1">
                  <li>Comprehensive analysis</li>
                  <li>Visual scoring system</li>
                  <li>Detailed recommendations</li>
                  <li>Auto-generated configurations</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Export Options</h3>
                <ul className="space-y-1">
                  <li>Download detailed reports</li>
                  <li>Create GitHub pull requests</li>
                  <li>Multiple server configurations</li>
                  <li>Implementation guides</li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Loading Overlay */}
      {isCreatingPR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-lg font-medium">Creating pull request...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}