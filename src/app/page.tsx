'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import {
  Shield,
  Search,
  Github,
  ExternalLink,
  Copy,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  // XCircle unused - status shown via dots
  Share2,
  History,
  Lightbulb,
  TrendingUp,
  FileText,
  Code2,
  Lock,
  Globe,
  Eye,
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Activity
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Collapsible from '@radix-ui/react-collapsible';
import { AnalysisResult, AnalysisResponse, PRResponse } from '@/types/security';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Header icon mapping for bento cards
const headerIconMap: Record<string, React.ElementType> = {
  'Content-Security-Policy': ShieldCheck,
  'Strict-Transport-Security': Lock,
  'X-Frame-Options': Eye,
  'X-Content-Type-Options': Fingerprint,
  'Referrer-Policy': Globe,
  'Permissions-Policy': ShieldAlert,
  'X-XSS-Protection': ShieldX,
  'Cross-Origin-Embedder-Policy': Shield,
  'Cross-Origin-Resource-Policy': Shield,
};

// Priority headers for featured bento cards
const FEATURED_HEADERS = ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options'];

export default function SecurityDashboard() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<Array<{url: string, score: number, timestamp: string}>>([]);
  const [showEducational, setShowEducational] = useState(false);
  const [selectedTab, setSelectedTab] = useState('nginx');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recentAnalyses');
    if (saved) {
      setRecentAnalyses(JSON.parse(saved));
    }
    document.documentElement.classList.add('dark');
  }, []);

  const saveToHistory = (result: AnalysisResult) => {
    const newEntry = {
      url: result.url,
      score: result.score,
      timestamp: new Date().toISOString()
    };
    const updated = [newEntry, ...recentAnalyses.slice(0, 4)];
    setRecentAnalyses(updated);
    localStorage.setItem('recentAnalyses', JSON.stringify(updated));
  };

  const validateUrl = (urlString: string): boolean => {
    try {
      const u = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
      return ['http:', 'https:'].includes(u.protocol);
    } catch {
      return false;
    }
  };

  const handleAnalyze = async (inputUrl?: string) => {
    const targetUrl = inputUrl || url;
    if (!targetUrl.trim()) {
      setUrlError('Please enter a URL');
      return;
    }
    if (!validateUrl(targetUrl)) {
      setUrlError('Please enter a valid URL');
      return;
    }
    setUrlError(null);
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data: AnalysisResponse = await response.json();
      if (data.success && data.data) {
        setAnalysis(data.data);
        saveToHistory(data.data);
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const exportAsPDFServer = async () => {
    if (!analysis) {
      toast.error('No analysis data found');
      return;
    }
    const loadingToast = toast.loading('Generating PDF using server...');
    try {
      const encodedData = btoa(JSON.stringify(analysis));
      const urlSafeData = encodeURIComponent(encodedData);
      const response = await fetch(`/api/report/export?format=pdf&data=${urlSafeData}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `security-headers-report-${analysis.url.replace(/https?:\/\//, '').replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.dismiss(loadingToast);
      toast.success('PDF report downloaded!');
    } catch (error) {
      console.error('Server PDF generation error:', error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const exportAsPDF = async () => {
    if (!analysis || !reportRef.current) {
      toast.error('No analysis data or report element found');
      return;
    }
    let loadingToast: string | undefined;
    try {
      if (!html2canvas) {
        return exportAsPDFServer();
      }
      if (!jsPDF) {
        return exportAsPDFServer();
      }
      loadingToast = toast.loading('Generating PDF...');
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0B0F19'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`security-headers-report-${analysis.url.replace(/https?:\/\//, '').replace(/\//g, '-')}.pdf`);
      if (loadingToast) toast.dismiss(loadingToast);
      toast.success('PDF report downloaded!');
    } catch (error) {
      console.error('Client PDF generation error:', error);
      if (loadingToast) toast.dismiss(loadingToast);
      toast('Trying alternative PDF generation method...');
      return exportAsPDFServer();
    }
  };

  const exportAsJSON = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `security-headers-${analysis.url.replace(/https?:\/\//, '').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    toast.success('JSON report downloaded!');
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
        headers: { 'Content-Type': 'application/json' },
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10B981';
    if (score >= 70) return '#06B6D4';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreTextClass = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-cyan-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getGradeGlow = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'glow-emerald bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'B': return 'glow-cyan bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'C': return 'glow-amber bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'D':
      case 'F': return 'glow-ruby bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const exampleUrls = [
    'https://github.com',
    'https://stackoverflow.com',
    'https://developer.mozilla.org',
    'https://security.gov'
  ];

  const allHeaders = analysis ? [
    ...analysis.headers.found,
    ...analysis.headers.missing,
    ...analysis.headers.misconfigured
  ] : [];

  const featuredHeaders = FEATURED_HEADERS.map(name => {
    const found = analysis?.headers.found.find(h => h.name === name);
    if (found) return { ...found, _status: 'found' as const };
    const missing = analysis?.headers.missing.find(h => h.name === name);
    if (missing) return { ...missing, _status: 'missing' as const };
    const misc = analysis?.headers.misconfigured.find(h => h.name === name);
    if (misc) return { ...misc, _status: 'misconfigured' as const };
    return null;
  }).filter(Boolean);

  const otherHeaders = allHeaders.filter(h => !FEATURED_HEADERS.includes(h.name));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-[#1A1F2E] !text-slate-100 !border !border-slate-700/50',
          style: { background: '#1A1F2E', color: '#F1F5F9', border: '1px solid rgba(51,65,85,0.5)' },
        }}
      />

      {/* Navigation */}
      <nav className="glass-strong border-b border-slate-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 glow-cyan">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-100">
              SecHeaders
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/advanced"
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
            >
              Advanced Tools
            </a>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Activity className="h-3 w-3" />
              <span>v2.0</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-2">
            Security Header Analysis
          </h1>
          <p className="text-slate-500 text-sm">
            Analyze, score, and auto-fix HTTP security headers for any website
          </p>
        </motion.div>

        {/* URL Input Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div className="glass rounded-2xl p-6">
            <form onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setUrlError(null);
                  }}
                  placeholder="Enter website URL to analyze..."
                  className={`w-full px-5 py-3.5 pl-12 text-sm rounded-xl bg-slate-900/60 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 text-slate-100 placeholder-slate-500 ${
                    urlError ? 'border-red-500/50' : 'border-slate-700/50'
                  }`}
                  disabled={isAnalyzing}
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              </div>
              {urlError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center text-red-400 text-xs"
                >
                  <AlertTriangle className="h-3 w-3 mr-1.5" />
                  {urlError}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isAnalyzing || !url.trim()}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center text-sm"
              >
                {isAnalyzing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                    Analyzing Headers...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Analyze Security Headers
                  </>
                )}
              </motion.button>
            </form>

            {/* Example URLs */}
            <div className="mt-5 pt-5 border-t border-slate-800/50">
              <p className="text-xs text-slate-600 mb-2.5">Quick scan:</p>
              <div className="flex flex-wrap gap-2">
                {exampleUrls.map((exampleUrl) => (
                  <button
                    key={exampleUrl}
                    onClick={() => setUrl(exampleUrl)}
                    disabled={isAnalyzing}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors border border-slate-700/30"
                  >
                    {exampleUrl.replace('https://', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Analyses */}
            {recentAnalyses.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-800/50">
                <div className="flex items-center mb-2.5">
                  <History className="h-3 w-3 mr-1.5 text-slate-600" />
                  <span className="text-xs text-slate-600">Recent</span>
                </div>
                <div className="space-y-1.5">
                  {recentAnalyses.slice(0, 3).map((recent, index) => (
                    <button
                      key={index}
                      onClick={() => setUrl(recent.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-slate-800/20 hover:bg-slate-800/40 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-300 group-hover:text-slate-100">{recent.url}</div>
                        <div className="text-[10px] text-slate-600">
                          {new Date(recent.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`text-xs font-bold tabular-nums ${getScoreTextClass(recent.score)}`}>
                        {recent.score}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Analysis Results - Bento Box Grid */}
        <AnimatePresence>
          {analysis && (
            <motion.section
              ref={reportRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Row 1: Score Gauge + Grade Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Security Score Gauge - Central Focus */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-2 glass rounded-2xl p-8 animate-pulse-glow relative overflow-hidden"
                >
                  {/* Subtle radial gradient behind gauge */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${getScoreColor(analysis.score)}15 0%, transparent 70%)`
                    }}
                  />
                  <div className="relative flex items-center justify-center gap-10">
                    {/* SVG Gauge */}
                    <div className="relative">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                      >
                        <svg className="w-44 h-44 transform -rotate-90 gauge-ring" viewBox="0 0 140 140">
                          {/* Background ring */}
                          <circle
                            cx="70"
                            cy="70"
                            r="60"
                            fill="none"
                            stroke="#1E293B"
                            strokeWidth="8"
                          />
                          {/* Score ring */}
                          <motion.circle
                            cx="70"
                            cy="70"
                            r="60"
                            fill="none"
                            strokeWidth="8"
                            strokeLinecap="round"
                            stroke={getScoreColor(analysis.score)}
                            strokeDasharray={`${2 * Math.PI * 60}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - analysis.score / 100) }}
                            transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                            style={{
                              filter: `drop-shadow(0 0 8px ${getScoreColor(analysis.score)}40)`
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 1 }}
                              className={`text-5xl font-bold tabular-nums ${getScoreTextClass(analysis.score)}`}
                            >
                              {analysis.score}
                            </motion.div>
                            <div className="text-xs text-slate-500 mt-1">out of 100</div>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Score Details */}
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Security Score</div>
                        <div className="text-lg font-semibold text-slate-200">
                          {analysis.score >= 90 ? 'Excellent' : analysis.score >= 70 ? 'Good' : analysis.score >= 50 ? 'Needs Work' : 'Critical'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="status-dot status-dot-emerald" />
                          <span className="text-xs text-slate-400">{analysis.headers.found.length} Found</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="status-dot status-dot-ruby" />
                          <span className="text-xs text-slate-400">{analysis.headers.missing.length} Missing</span>
                        </div>
                        {analysis.headers.misconfigured.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="status-dot status-dot-amber" />
                            <span className="text-xs text-slate-400">{analysis.headers.misconfigured.length} Misc.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Grade & Summary Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="glass rounded-2xl p-8 flex flex-col items-center justify-center"
                >
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">Grade</div>
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold border ${getGradeGlow(analysis.grade)}`}
                  >
                    {analysis.grade}
                  </motion.div>
                  <div className="mt-4 text-center">
                    <div className="text-xs text-slate-400 truncate max-w-[200px]" title={analysis.url}>
                      {analysis.url}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1">
                      {new Date(analysis.timestamp).toLocaleString()}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Row 2: Featured Header Cards (CSP, HSTS, X-Frame-Options) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {featuredHeaders.map((item, index) => {
                  if (!item) return null;
                  const Icon = headerIconMap[item.name] || Shield;
                  const isFound = item._status === 'found';
                  const isMissing = item._status === 'missing';

                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className={`glass rounded-2xl p-5 border-l-2 ${
                        isFound ? 'border-l-emerald-500 glow-emerald' :
                        isMissing ? 'border-l-red-500 glow-ruby' :
                        'border-l-amber-500 glow-amber'
                      }`}
                    >
                      <Collapsible.Root>
                        <Collapsible.Trigger className="w-full text-left">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${
                                isFound ? 'bg-emerald-500/10' :
                                isMissing ? 'bg-red-500/10' :
                                'bg-amber-500/10'
                              }`}>
                                <Icon className={`h-4 w-4 ${
                                  isFound ? 'text-emerald-400' :
                                  isMissing ? 'text-red-400' :
                                  'text-amber-400'
                                }`} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-200">{item.name}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                                  {item.severity}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`status-dot ${
                                isFound ? 'status-dot-emerald' :
                                isMissing ? 'status-dot-ruby' :
                                'status-dot-amber'
                              }`} />
                              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                          </div>

                          {/* Score bar */}
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.score / 25) * 100}%` }}
                              transition={{ delay: 0.8, duration: 0.8 }}
                              className={`h-full rounded-full ${
                                isFound ? 'bg-emerald-500' :
                                isMissing ? 'bg-red-500' :
                                'bg-amber-500'
                              }`}
                            />
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-slate-500">
                              {isFound ? 'Configured' : isMissing ? 'Not Found' : 'Needs Fix'}
                            </span>
                            <span className={`text-[10px] font-medium tabular-nums ${
                              isFound ? 'text-emerald-400' :
                              isMissing ? 'text-red-400' :
                              'text-amber-400'
                            }`}>
                              {item.score} pts
                            </span>
                          </div>
                        </Collapsible.Trigger>

                        <Collapsible.Content>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 pt-4 border-t border-slate-800/50 space-y-3"
                          >
                            {item.value && (
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Value</span>
                                <div className="mt-1 p-2 rounded-lg bg-slate-900/60 font-mono text-[11px] text-slate-300 break-all">
                                  {item.value}
                                </div>
                              </div>
                            )}
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Description</span>
                              <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Recommendation</span>
                              <p className="mt-1 text-xs text-slate-400">{item.recommendation}</p>
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                              {item.value && (
                                <button
                                  onClick={() => copyToClipboard(item.value || '', `${item.name} value`)}
                                  className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </button>
                              )}
                              <a
                                href={`https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${item.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                MDN Docs
                              </a>
                            </div>
                          </motion.div>
                        </Collapsible.Content>
                      </Collapsible.Root>
                    </motion.div>
                  );
                })}
              </div>

              {/* Row 3: Other Headers - 2-column grid */}
              {otherHeaders.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-1">Other Headers</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {otherHeaders.map((header, index) => {
                      const isFound = analysis.headers.found.includes(header);
                      const isMissing = analysis.headers.missing.includes(header);
                      const Icon = headerIconMap[header.name] || Shield;

                      return (
                        <motion.div
                          key={header.name}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.05 }}
                        >
                          <Collapsible.Root>
                            <Collapsible.Trigger className={`w-full glass rounded-xl p-4 text-left border-l-2 transition-all hover:bg-slate-800/30 ${
                              isFound ? 'border-l-emerald-500/50' :
                              isMissing ? 'border-l-red-500/50' :
                              'border-l-amber-500/50'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <Icon className={`h-3.5 w-3.5 ${
                                    isFound ? 'text-emerald-400' :
                                    isMissing ? 'text-red-400' :
                                    'text-amber-400'
                                  }`} />
                                  <span className="text-sm text-slate-300">{header.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    isFound ? 'bg-emerald-500/10 text-emerald-400' :
                                    isMissing ? 'bg-red-500/10 text-red-400' :
                                    'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {header.severity.toUpperCase()}
                                  </span>
                                  <ChevronDown className="h-3 w-3 text-slate-600" />
                                </div>
                              </div>
                            </Collapsible.Trigger>

                            <Collapsible.Content className="px-4 pb-4">
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-3 space-y-2 pl-6"
                              >
                                {header.value && (
                                  <div className="p-2 rounded-lg bg-slate-900/60 font-mono text-[11px] text-slate-400 break-all">
                                    {header.value}
                                  </div>
                                )}
                                <p className="text-xs text-slate-500">{header.description}</p>
                                <p className="text-xs text-slate-500">{header.recommendation}</p>
                                <div className="flex items-center gap-3">
                                  {header.value && (
                                    <button
                                      onClick={() => copyToClipboard(header.value || '', `${header.name} value`)}
                                      className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy
                                    </button>
                                  )}
                                  <a
                                    href={`https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${header.name}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    MDN Docs
                                  </a>
                                </div>
                              </motion.div>
                            </Collapsible.Content>
                          </Collapsible.Root>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Row 4: Actions + Server Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="glass rounded-2xl p-5"
                >
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">Actions</div>
                  <div className="space-y-2.5">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleCreatePR}
                      disabled={isCreatingPR}
                      className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 font-medium py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center"
                    >
                      {isCreatingPR ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full mr-2"
                          />
                          Creating PR...
                        </>
                      ) : (
                        <>
                          <Github className="h-4 w-4 mr-2" />
                          Auto-Fix via GitHub
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={exportAsPDF}
                      className="w-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/30 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={exportAsJSON}
                      className="w-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/30 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center"
                    >
                      <Code2 className="h-4 w-4 mr-2" />
                      Export JSON
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => copyToClipboard(window.location.href, 'Share URL')}
                      className="w-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/30 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Results
                    </motion.button>
                  </div>
                </motion.div>

                {/* Server Configuration */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="lg:col-span-2 glass rounded-2xl p-5"
                >
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">Server Configuration</div>
                  <Tabs.Root value={selectedTab} onValueChange={setSelectedTab}>
                    <Tabs.List className="flex gap-1 mb-4 bg-slate-900/40 p-1 rounded-lg">
                      {Object.keys(analysis.fixes).map((server) => (
                        <Tabs.Trigger
                          key={server}
                          value={server}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            selectedTab === server
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                              : 'text-slate-500 hover:text-slate-300 border border-transparent'
                          }`}
                        >
                          {server.charAt(0).toUpperCase() + server.slice(1)}
                        </Tabs.Trigger>
                      ))}
                    </Tabs.List>

                    {Object.entries(analysis.fixes).map(([server, config]) => (
                      <Tabs.Content key={server} value={server}>
                        <div className="relative">
                          <button
                            onClick={() => copyToClipboard(config, `${server} configuration`)}
                            className={`absolute top-3 right-3 z-10 flex items-center px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                              copiedText === `${server} configuration`
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                            }`}
                          >
                            {copiedText === `${server} configuration` ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </>
                            )}
                          </button>
                          <pre className="text-xs overflow-x-auto p-4 rounded-xl bg-[#0B0F19] border border-slate-800/50 text-slate-300 font-mono leading-relaxed">
                            <code>{config}</code>
                          </pre>
                        </div>
                      </Tabs.Content>
                    ))}
                  </Tabs.Root>
                </motion.div>
              </div>

              {/* Educational Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="glass rounded-2xl overflow-hidden"
              >
                <Collapsible.Root open={showEducational} onOpenChange={setShowEducational}>
                  <Collapsible.Trigger className="w-full flex items-center justify-between p-5 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-medium text-slate-300">Why Security Headers Matter</span>
                    </div>
                    <motion.div
                      animate={{ rotate: showEducational ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </motion.div>
                  </Collapsible.Trigger>

                  <Collapsible.Content>
                    <div className="px-5 pb-5 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
                          <h3 className="text-xs font-semibold text-cyan-400 mb-2.5 flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            Protection Benefits
                          </h3>
                          <ul className="space-y-1.5 text-xs text-slate-400">
                            <li>Prevent XSS attacks with CSP</li>
                            <li>Stop clickjacking with X-Frame-Options</li>
                            <li>Enforce HTTPS with HSTS</li>
                            <li>Prevent MIME sniffing attacks</li>
                            <li>Control referrer information</li>
                          </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
                          <h3 className="text-xs font-semibold text-emerald-400 mb-2.5 flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Best Practices
                          </h3>
                          <ul className="space-y-1.5 text-xs text-slate-400">
                            <li>Start with report-only mode for CSP</li>
                            <li>Use strict Content-Type validation</li>
                            <li>Implement HSTS with preload</li>
                            <li>Regular security header audits</li>
                            <li>Monitor for new vulnerabilities</li>
                          </ul>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
                        <h3 className="text-xs font-semibold text-amber-400 mb-2.5 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Common Mistakes
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-400">
                          <ul className="space-y-1.5">
                            <li>Using &apos;unsafe-inline&apos; in CSP</li>
                            <li>Overly permissive CORS headers</li>
                            <li>Missing subdomains in HSTS</li>
                          </ul>
                          <ul className="space-y-1.5">
                            <li>Not testing in staging first</li>
                            <li>Ignoring browser compatibility</li>
                            <li>Missing headers on error pages</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Collapsible.Content>
                </Collapsible.Root>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isCreatingPR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full mx-auto mb-4"
                />
                <h3 className="text-sm font-semibold text-slate-200 mb-1.5">Creating Pull Request</h3>
                <p className="text-xs text-slate-500">
                  Generating security header configurations...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
