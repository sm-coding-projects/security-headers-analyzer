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
  XCircle,
  Share2,
  History,
  Lightbulb,
  Moon,
  Sun,
  TrendingUp,
  FileText,
  Code2,
  Zap
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Collapsible from '@radix-ui/react-collapsible';
import { AnalysisResult, AnalysisResponse, PRResponse } from '@/types/security';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import clsx from 'clsx';

export default function SecurityDashboard() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<Array<{url: string, score: number, timestamp: string}>>([]);
  const [showEducational, setShowEducational] = useState(false);
  const [selectedTab, setSelectedTab] = useState('nginx');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load recent analyses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentAnalyses');
    if (saved) {
      setRecentAnalyses(JSON.parse(saved));
    }

    const darkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Save analysis to history
  const saveToHistory = (analysis: AnalysisResult) => {
    const newEntry = {
      url: analysis.url,
      score: analysis.score,
      timestamp: new Date().toISOString()
    };
    const updated = [newEntry, ...recentAnalyses.slice(0, 4)];
    setRecentAnalyses(updated);
    localStorage.setItem('recentAnalyses', JSON.stringify(updated));
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // URL validation
  const validateUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  };

  // Handle analysis
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

  // Copy to clipboard
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

  // Export as PDF
  const exportAsPDF = async () => {
    if (!analysis || !reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current);
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
      toast.success('PDF report downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  // Export as JSON
  const exportAsJSON = () => {
    if (!analysis) return;

    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-headers-${analysis.url.replace(/https?:\/\//, '').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('JSON report downloaded!');
  };

  // Create GitHub PR
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

  // Get security score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-blue-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get grade color
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      case 'F': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const exampleUrls = [
    'https://github.com',
    'https://stackoverflow.com',
    'https://developer.mozilla.org',
    'https://security.gov'
  ];

  return (
    <div className={clsx('min-h-screen transition-colors duration-300', {
      'bg-gray-900 text-white': isDarkMode,
      'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50': !isDarkMode
    })}>
      <Toaster
        position="top-right"
        toastOptions={{
          className: isDarkMode ? 'bg-gray-800 text-white' : '',
        }}
      />

      {/* Navigation */}
      <nav className={clsx('border-b backdrop-blur-sm sticky top-0 z-50', {
        'bg-gray-900/80 border-gray-700': isDarkMode,
        'bg-white/80 border-gray-200': !isDarkMode
      })}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Security Headers Analyzer</h1>
          </div>
          <button
            onClick={toggleDarkMode}
            className={clsx('p-2 rounded-lg transition-colors', {
              'hover:bg-gray-700': isDarkMode,
              'hover:bg-gray-100': !isDarkMode
            })}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="relative">
            <motion.div
              animate={{
                background: [
                  'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                  'linear-gradient(45deg, #8b5cf6, #ec4899)',
                  'linear-gradient(45deg, #ec4899, #3b82f6)'
                ]
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-r opacity-20 blur-3xl"
            />
            <div className="relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full mb-6"
              >
                <Zap className="h-5 w-5 mr-2" />
                <span className="font-medium">AI-Powered Security Analysis</span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Secure Your Website
              </h1>

              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Analyze security headers, get instant recommendations, and automatically generate fixes for your web applications
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  15+ Security Headers
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Instant Analysis
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Auto-Generated Fixes
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  GitHub Integration
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* URL Input Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div className={clsx('max-w-4xl mx-auto p-8 rounded-2xl shadow-xl backdrop-blur-sm', {
            'bg-gray-800/50 border border-gray-700': isDarkMode,
            'bg-white/70 border border-white': !isDarkMode
          })}>
            <form onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }} className="space-y-6">
              <div>
                <label className="block text-lg font-medium mb-4">
                  Enter Website URL to Analyze
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setUrlError(null);
                    }}
                    placeholder="https://example.com"
                    className={clsx('w-full px-6 py-4 text-lg rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500', {
                      'bg-gray-700 border-gray-600 text-white placeholder-gray-400': isDarkMode,
                      'bg-white border-gray-300 text-gray-900 placeholder-gray-500': !isDarkMode,
                      'border-red-500': urlError
                    })}
                    disabled={isAnalyzing}
                  />
                  <Search className={clsx('absolute right-4 top-1/2 transform -translate-y-1/2 h-6 w-6', {
                    'text-gray-400': isDarkMode,
                    'text-gray-500': !isDarkMode
                  })} />
                </div>
                {urlError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center text-red-500 text-sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {urlError}
                  </motion.div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isAnalyzing || !url.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center text-lg"
              >
                {isAnalyzing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mr-3"
                    />
                    Analyzing Security Headers...
                  </>
                ) : (
                  <>
                    <Shield className="h-6 w-6 mr-3" />
                    Analyze Security Headers
                  </>
                )}
              </motion.button>
            </form>

            {/* Example URLs */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Try these examples:</p>
              <div className="flex flex-wrap gap-2">
                {exampleUrls.map((exampleUrl) => (
                  <button
                    key={exampleUrl}
                    onClick={() => setUrl(exampleUrl)}
                    disabled={isAnalyzing}
                    className={clsx('text-sm px-4 py-2 rounded-full transition-colors', {
                      'bg-gray-700 hover:bg-gray-600 text-gray-300': isDarkMode,
                      'bg-gray-100 hover:bg-gray-200 text-gray-700': !isDarkMode
                    })}
                  >
                    {exampleUrl}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Analyses */}
            {recentAnalyses.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-3">
                  <History className="h-4 w-4 mr-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Recent Analyses</span>
                </div>
                <div className="space-y-2">
                  {recentAnalyses.slice(0, 3).map((recent, index) => (
                    <button
                      key={index}
                      onClick={() => setUrl(recent.url)}
                      className={clsx('w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between', {
                        'bg-gray-700 hover:bg-gray-600': isDarkMode,
                        'bg-gray-50 hover:bg-gray-100': !isDarkMode
                      })}
                    >
                      <div>
                        <div className="font-medium text-sm">{recent.url}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(recent.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={clsx('text-sm font-bold', getScoreColor(recent.score))}>
                        {recent.score}/100
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Analysis Results */}
        <AnimatePresence>
          {analysis && (
            <motion.section
              ref={reportRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-16"
            >
              <div className={clsx('p-8 rounded-2xl shadow-xl', {
                'bg-gray-800 border border-gray-700': isDarkMode,
                'bg-white': !isDarkMode
              })}>
                {/* Score and Grade */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center space-x-8 mb-6">
                    {/* Animated Score Gauge */}
                    <div className="relative">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                      >
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            className="stroke-gray-200 dark:stroke-gray-700"
                            strokeWidth="8"
                          />
                          <motion.circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            strokeWidth="8"
                            strokeLinecap="round"
                            className={getScoreColor(analysis.score).replace('text-', 'stroke-')}
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - analysis.score / 100) }}
                            transition={{ duration: 1.5, delay: 0.5 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 1 }}
                              className={clsx('text-3xl font-bold', getScoreColor(analysis.score))}
                            >
                              {analysis.score}
                            </motion.div>
                            <div className="text-sm text-gray-500">/ 100</div>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Letter Grade */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.6, type: "spring" }}
                      className={clsx('w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold', getGradeColor(analysis.grade))}
                    >
                      {analysis.grade}
                    </motion.div>
                  </div>

                  <h2 className="text-2xl font-bold mb-2">Security Analysis for {analysis.url}</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Analyzed on {new Date(analysis.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreatePR}
                    disabled={isCreatingPR}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center"
                  >
                    {isCreatingPR ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Creating PR...
                      </>
                    ) : (
                      <>
                        <Github className="h-5 w-5 mr-2" />
                        Auto-Fix with GitHub
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={exportAsPDF}
                    className={clsx('font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center', {
                      'bg-blue-600 hover:bg-blue-700 text-white': !isDarkMode,
                      'bg-blue-500 hover:bg-blue-600 text-white': isDarkMode
                    })}
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Export as PDF
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={exportAsJSON}
                    className={clsx('font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center', {
                      'bg-purple-600 hover:bg-purple-700 text-white': !isDarkMode,
                      'bg-purple-500 hover:bg-purple-600 text-white': isDarkMode
                    })}
                  >
                    <Code2 className="h-5 w-5 mr-2" />
                    Export as JSON
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => copyToClipboard(window.location.href, 'Share URL')}
                    className={clsx('font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center', {
                      'bg-gray-600 hover:bg-gray-700 text-white': !isDarkMode,
                      'bg-gray-500 hover:bg-gray-600 text-white': isDarkMode
                    })}
                  >
                    <Share2 className="h-5 w-5 mr-2" />
                    Share Results
                  </motion.button>
                </div>

                {/* Header Cards */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold mb-4">Security Headers Analysis</h3>

                  {/* Found Headers */}
                  {analysis.headers.found.map((header, index) => (
                    <motion.div
                      key={`found-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Collapsible.Root>
                        <Collapsible.Trigger className={clsx('w-full p-4 rounded-lg border text-left transition-all duration-200 hover:shadow-md', {
                          'bg-green-50 border-green-200 hover:bg-green-100': !isDarkMode,
                          'bg-green-900/20 border-green-700 hover:bg-green-900/30': isDarkMode
                        })}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                              <div>
                                <div className="font-semibold">{header.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Present - Score: {header.score}/10</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-1 rounded mr-2">
                                {header.severity.toUpperCase()}
                              </span>
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </Collapsible.Trigger>
                        <Collapsible.Content className={clsx('p-4 border-t', {
                          'bg-green-50/50 border-green-200': !isDarkMode,
                          'bg-green-900/10 border-green-700': isDarkMode
                        })}>
                          <div className="space-y-3">
                            <div>
                              <span className="font-medium">Current Value:</span>
                              <div className={clsx('mt-1 p-2 rounded font-mono text-sm', {
                                'bg-gray-100': !isDarkMode,
                                'bg-gray-800': isDarkMode
                              })}>
                                {header.value || 'No value'}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Description:</span>
                              <p className="mt-1 text-gray-600 dark:text-gray-400">{header.description}</p>
                            </div>
                            <div>
                              <span className="font-medium">Recommendation:</span>
                              <p className="mt-1 text-gray-600 dark:text-gray-400">{header.recommendation}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => copyToClipboard(header.value || '', `${header.name} value`)}
                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copy Value
                              </button>
                              <a
                                href={`https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${header.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Learn More
                              </a>
                            </div>
                          </div>
                        </Collapsible.Content>
                      </Collapsible.Root>
                    </motion.div>
                  ))}

                  {/* Missing Headers */}
                  {analysis.headers.missing.map((header, index) => (
                    <motion.div
                      key={`missing-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (analysis.headers.found.length + index) * 0.1 }}
                    >
                      <Collapsible.Root>
                        <Collapsible.Trigger className={clsx('w-full p-4 rounded-lg border text-left transition-all duration-200 hover:shadow-md', {
                          'bg-red-50 border-red-200 hover:bg-red-100': !isDarkMode,
                          'bg-red-900/20 border-red-700 hover:bg-red-900/30': isDarkMode
                        })}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <XCircle className="h-5 w-5 text-red-500 mr-3" />
                              <div>
                                <div className="font-semibold">{header.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Missing - Score: {header.score}/10</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className={clsx('text-xs font-medium px-2 py-1 rounded mr-2', {
                                'bg-red-100 text-red-800': header.severity === 'high' || header.severity === 'critical',
                                'bg-yellow-100 text-yellow-800': header.severity === 'medium',
                                'bg-blue-100 text-blue-800': header.severity === 'low',
                                'bg-red-900 text-red-200': (header.severity === 'high' || header.severity === 'critical') && isDarkMode,
                                'bg-yellow-900 text-yellow-200': header.severity === 'medium' && isDarkMode,
                                'bg-blue-900 text-blue-200': header.severity === 'low' && isDarkMode,
                              })}>
                                {header.severity.toUpperCase()}
                              </span>
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </Collapsible.Trigger>
                        <Collapsible.Content className={clsx('p-4 border-t', {
                          'bg-red-50/50 border-red-200': !isDarkMode,
                          'bg-red-900/10 border-red-700': isDarkMode
                        })}>
                          <div className="space-y-3">
                            <div>
                              <span className="font-medium">Description:</span>
                              <p className="mt-1 text-gray-600 dark:text-gray-400">{header.description}</p>
                            </div>
                            <div>
                              <span className="font-medium">Recommendation:</span>
                              <p className="mt-1 text-gray-600 dark:text-gray-400">{header.recommendation}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <a
                                href={`https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${header.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Learn More
                              </a>
                            </div>
                          </div>
                        </Collapsible.Content>
                      </Collapsible.Root>
                    </motion.div>
                  ))}

                  {/* Misconfigured Headers */}
                  {analysis.headers.misconfigured.map((header, index) => (
                    <motion.div
                      key={`misc-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (analysis.headers.found.length + analysis.headers.missing.length + index) * 0.1 }}
                    >
                      <Collapsible.Root>
                        <Collapsible.Trigger className={clsx('w-full p-4 rounded-lg border text-left transition-all duration-200 hover:shadow-md', {
                          'bg-yellow-50 border-yellow-200 hover:bg-yellow-100': !isDarkMode,
                          'bg-yellow-900/20 border-yellow-700 hover:bg-yellow-900/30': isDarkMode
                        })}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
                              <div>
                                <div className="font-semibold">{header.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Misconfigured - Score: {header.score}/10</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium px-2 py-1 rounded mr-2">
                                {header.severity.toUpperCase()}
                              </span>
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </Collapsible.Trigger>
                        <Collapsible.Content className={clsx('p-4 border-t', {
                          'bg-yellow-50/50 border-yellow-200': !isDarkMode,
                          'bg-yellow-900/10 border-yellow-700': isDarkMode
                        })}>
                          <div className="space-y-3">
                            <div>
                              <span className="font-medium">Current Value:</span>
                              <div className={clsx('mt-1 p-2 rounded font-mono text-sm', {
                                'bg-gray-100': !isDarkMode,
                                'bg-gray-800': isDarkMode
                              })}>
                                {header.value}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Description:</span>
                              <p className="mt-1 text-gray-600 dark:text-gray-400">{header.description}</p>
                            </div>
                            <div>
                              <span className="font-medium">Recommendation:</span>
                              <p className="mt-1 text-gray-600 dark:text-gray-400">{header.recommendation}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => copyToClipboard(header.value || '', `${header.name} value`)}
                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copy Value
                              </button>
                              <a
                                href={`https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${header.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Learn More
                              </a>
                            </div>
                          </div>
                        </Collapsible.Content>
                      </Collapsible.Root>
                    </motion.div>
                  ))}
                </div>

                {/* Configuration Tabs */}
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-4">Server Configuration</h3>
                  <Tabs.Root value={selectedTab} onValueChange={setSelectedTab}>
                    <Tabs.List className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 mb-4">
                      {Object.keys(analysis.fixes).map((server) => (
                        <Tabs.Trigger
                          key={server}
                          value={server}
                          className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
                            'border-blue-500 text-blue-600': selectedTab === server,
                            'border-transparent text-gray-500 hover:text-gray-700': selectedTab !== server && !isDarkMode,
                            'border-transparent text-gray-400 hover:text-gray-200': selectedTab !== server && isDarkMode,
                          })}
                        >
                          {server.charAt(0).toUpperCase() + server.slice(1)}
                        </Tabs.Trigger>
                      ))}
                    </Tabs.List>

                    {Object.entries(analysis.fixes).map(([server, config]) => (
                      <Tabs.Content key={server} value={server}>
                        <div className={clsx('p-4 rounded-lg border', {
                          'bg-gray-50 border-gray-200': !isDarkMode,
                          'bg-gray-800 border-gray-700': isDarkMode
                        })}>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold capitalize">{server} Configuration</h4>
                            <button
                              onClick={() => copyToClipboard(config, `${server} configuration`)}
                              className={clsx('flex items-center px-3 py-1 rounded text-sm transition-colors', {
                                'bg-blue-100 hover:bg-blue-200 text-blue-700': !isDarkMode,
                                'bg-blue-900 hover:bg-blue-800 text-blue-200': isDarkMode,
                                'bg-green-100 text-green-700': copiedText === `${server} configuration` && !isDarkMode,
                                'bg-green-900 text-green-200': copiedText === `${server} configuration` && isDarkMode,
                              })}
                            >
                              {copiedText === `${server} configuration` ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="text-sm overflow-x-auto p-3 rounded bg-gray-900 text-gray-100">
                            <code>{config}</code>
                          </pre>
                        </div>
                      </Tabs.Content>
                    ))}
                  </Tabs.Root>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Educational Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <div className={clsx('p-8 rounded-2xl shadow-xl', {
            'bg-gray-800 border border-gray-700': isDarkMode,
            'bg-white': !isDarkMode
          })}>
            <Collapsible.Root open={showEducational} onOpenChange={setShowEducational}>
              <Collapsible.Trigger className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center">
                  <Lightbulb className="h-6 w-6 text-yellow-500 mr-3" />
                  <h2 className="text-2xl font-bold">Why Security Headers Matter</h2>
                </div>
                <motion.div
                  animate={{ rotate: showEducational ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-6 w-6" />
                </motion.div>
              </Collapsible.Trigger>

              <Collapsible.Content>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-6 space-y-6"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className={clsx('p-6 rounded-lg', {
                      'bg-blue-50 border border-blue-200': !isDarkMode,
                      'bg-blue-900/20 border border-blue-700': isDarkMode
                    })}>
                      <h3 className="font-bold text-lg mb-3 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-blue-500" />
                        Protection Benefits
                      </h3>
                      <ul className="space-y-2 text-sm">
                        <li>• Prevent XSS attacks with CSP</li>
                        <li>• Stop clickjacking with X-Frame-Options</li>
                        <li>• Enforce HTTPS with HSTS</li>
                        <li>• Prevent MIME sniffing attacks</li>
                        <li>• Control referrer information</li>
                      </ul>
                    </div>

                    <div className={clsx('p-6 rounded-lg', {
                      'bg-green-50 border border-green-200': !isDarkMode,
                      'bg-green-900/20 border border-green-700': isDarkMode
                    })}>
                      <h3 className="font-bold text-lg mb-3 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                        Best Practices
                      </h3>
                      <ul className="space-y-2 text-sm">
                        <li>• Start with report-only mode for CSP</li>
                        <li>• Use strict Content-Type validation</li>
                        <li>• Implement HSTS with preload</li>
                        <li>• Regular security header audits</li>
                        <li>• Monitor for new vulnerabilities</li>
                      </ul>
                    </div>
                  </div>

                  <div className={clsx('p-6 rounded-lg', {
                    'bg-yellow-50 border border-yellow-200': !isDarkMode,
                    'bg-yellow-900/20 border border-yellow-700': isDarkMode
                  })}>
                    <h3 className="font-bold text-lg mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                      Common Mistakes to Avoid
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">Configuration Errors:</h4>
                        <ul className="space-y-1">
                          <li>• Using &apos;unsafe-inline&apos; in CSP without need</li>
                          <li>• Setting overly permissive CORS headers</li>
                          <li>• Forgetting to include subdomains in HSTS</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Implementation Issues:</h4>
                        <ul className="space-y-1">
                          <li>• Not testing headers in staging first</li>
                          <li>• Ignoring browser compatibility</li>
                          <li>• Missing security headers on error pages</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Collapsible.Content>
            </Collapsible.Root>
          </div>
        </motion.section>

        {/* Features Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful Security Analysis Features</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to secure your web applications with industry-standard security headers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Comprehensive Analysis",
                description: "Analyze 15+ critical security headers including CSP, HSTS, and frame options",
                color: "blue"
              },
              {
                icon: Github,
                title: "GitHub Integration",
                description: "Automatically create pull requests with security header fixes for your repositories",
                color: "green"
              },
              {
                icon: FileText,
                title: "Detailed Reports",
                description: "Export comprehensive PDF and JSON reports with implementation guidelines",
                color: "purple"
              },
              {
                icon: Code2,
                title: "Multi-Server Support",
                description: "Get configuration snippets for Nginx, Apache, Express.js, Next.js, and Cloudflare",
                color: "orange"
              },
              {
                icon: TrendingUp,
                title: "Real-time Scoring",
                description: "Visual security score with letter grades and detailed breakdown of each header",
                color: "pink"
              },
              {
                icon: Zap,
                title: "Instant Analysis",
                description: "Fast, accurate analysis with recommendations and MDN documentation links",
                color: "cyan"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className={clsx('p-6 rounded-xl border text-center hover:shadow-lg transition-all duration-200', {
                  'bg-white border-gray-200': !isDarkMode,
                  'bg-gray-800 border-gray-700': isDarkMode
                })}
              >
                <div className={clsx('w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 bg-gradient-to-r', {
                  'from-blue-500 to-blue-600': feature.color === 'blue',
                  'from-green-500 to-green-600': feature.color === 'green',
                  'from-purple-500 to-purple-600': feature.color === 'purple',
                  'from-orange-500 to-orange-600': feature.color === 'orange',
                  'from-pink-500 to-pink-600': feature.color === 'pink',
                  'from-cyan-500 to-cyan-600': feature.color === 'cyan',
                })}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isCreatingPR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className={clsx('p-8 rounded-xl shadow-2xl max-w-md w-full mx-4', {
                'bg-gray-800 text-white': isDarkMode,
                'bg-white text-gray-900': !isDarkMode
              })}
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
                />
                <h3 className="text-lg font-bold mb-2">Creating Pull Request</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Generating security header configurations and creating a pull request in your repository...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}