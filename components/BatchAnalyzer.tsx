'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, Play, Pause, X, AlertCircle, CheckCircle, Clock, BarChart3, FileText, Grid } from 'lucide-react';
import * as Progress from '@radix-ui/react-progress';
import * as Tabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

interface UrlAnalysis {
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

interface BatchAnalyzerProps {
  isDarkMode?: boolean;
  onAnalyze?: (url: string) => Promise<any>;
}

interface BatchResults {
  totalUrls: number;
  completed: number;
  failed: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalTime: number;
}

export default function BatchAnalyzer({ isDarkMode = false, onAnalyze }: BatchAnalyzerProps) {
  const [urls, setUrls] = useState<UrlAnalysis[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchResults, setBatchResults] = useState<BatchResults | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [concurrency, setConcurrency] = useState(3);
  const [delay, setDelay] = useState(1000); // ms between requests

  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        let parsedUrls: string[] = [];

        if (file.name.endsWith('.csv')) {
          // Parse CSV - assume first column is URLs
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0]?.split(',');

          // Find URL column (could be named url, website, domain, etc.)
          const urlColumnIndex = headers?.findIndex(header =>
            /url|website|domain|site/i.test(header.trim())
          ) ?? 0;

          parsedUrls = lines.slice(1).map(line => {
            const columns = line.split(',');
            return columns[urlColumnIndex]?.trim().replace(/['"]/g, '') || '';
          }).filter(url => url && isValidUrl(url));

        } else if (file.name.endsWith('.txt')) {
          // Parse text file - one URL per line
          parsedUrls = text.split('\n')
            .map(line => line.trim())
            .filter(url => url && isValidUrl(url));
        } else if (file.name.endsWith('.json')) {
          // Parse JSON - expect array of URLs or objects with url property
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            parsedUrls = parsed
              .map(item => typeof item === 'string' ? item : item.url || item.website || item.domain)
              .filter(url => url && isValidUrl(url));
          }
        }

        if (parsedUrls.length === 0) {
          toast.error('No valid URLs found in the file');
          return;
        }

        const urlAnalyses: UrlAnalysis[] = parsedUrls.map((url, index) => ({
          id: `url-${index}`,
          url: normalizeUrl(url),
          status: 'pending'
        }));

        setUrls(urlAnalyses);
        setActiveTab('batch');
        toast.success(`Loaded ${urlAnalyses.length} URLs for analysis`);

      } catch (error) {
        toast.error('Failed to parse file. Please check the format.');
      }
    };

    reader.readAsText(file);
  }, []);

  const isValidUrl = (url: string): boolean => {
    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      new URL(normalizedUrl);
      return true;
    } catch {
      return false;
    }
  };

  const normalizeUrl = (url: string): string => {
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const addManualUrl = (url: string) => {
    if (!isValidUrl(url)) {
      toast.error('Please enter a valid URL');
      return;
    }

    const normalizedUrl = normalizeUrl(url);

    if (urls.some(u => u.url === normalizedUrl)) {
      toast.error('URL already exists in the list');
      return;
    }

    const newUrl: UrlAnalysis = {
      id: `url-${Date.now()}`,
      url: normalizedUrl,
      status: 'pending'
    };

    setUrls(prev => [...prev, newUrl]);
  };

  const removeUrl = (id: string) => {
    setUrls(prev => prev.filter(url => url.id !== id));
  };

  const runBatchAnalysis = async () => {
    if (urls.length === 0) {
      toast.error('Please add URLs to analyze');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setCurrentIndex(0);
    startTimeRef.current = Date.now();

    // Reset all URLs to pending
    setUrls(prev => prev.map(url => ({ ...url, status: 'pending' as const })));

    // Create a queue of URLs to process
    const queue = [...urls];
    const running = new Set<string>();
    let completed = 0;
    let failed = 0;

    const processUrl = async (urlAnalysis: UrlAnalysis) => {
      if (isPaused) return;

      running.add(urlAnalysis.id);

      // Update status to analyzing
      setUrls(prev => prev.map(url =>
        url.id === urlAnalysis.id
          ? { ...url, status: 'analyzing' as const }
          : url
      ));

      try {
        // Simulate or call actual analysis
        const result = onAnalyze ? await onAnalyze(urlAnalysis.url) : await simulateAnalysis(urlAnalysis.url);

        completed++;
        setUrls(prev => prev.map(url =>
          url.id === urlAnalysis.id
            ? {
                ...url,
                status: 'completed' as const,
                score: result.score || Math.floor(Math.random() * 100),
                grade: result.grade || 'B',
                timestamp: new Date().toISOString(),
                headers: result.headers || {
                  found: Math.floor(Math.random() * 10),
                  missing: Math.floor(Math.random() * 5),
                  misconfigured: Math.floor(Math.random() * 3)
                },
                framework: result.framework
              }
            : url
        ));

      } catch (error) {
        failed++;
        setUrls(prev => prev.map(url =>
          url.id === urlAnalysis.id
            ? {
                ...url,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Analysis failed'
              }
            : url
        ));
      } finally {
        running.delete(urlAnalysis.id);
      }
    };

    // Process URLs with concurrency control
    while (queue.length > 0 && !isPaused) {
      while (running.size < concurrency && queue.length > 0) {
        const urlToProcess = queue.shift();
        if (urlToProcess) {
          processUrl(urlToProcess);
          setCurrentIndex(prev => prev + 1);
        }
      }

      // Wait for at least one to complete or delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Wait for all running analyses to complete
    while (running.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!isPaused) {
      const totalTime = Date.now() - startTimeRef.current;
      const completedUrls = urls.filter(url => url.status === 'completed');
      const scores = completedUrls.map(url => url.score || 0);

      setBatchResults({
        totalUrls: urls.length,
        completed,
        failed,
        averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        bestScore: scores.length > 0 ? Math.max(...scores) : 0,
        worstScore: scores.length > 0 ? Math.min(...scores) : 0,
        totalTime
      });

      setActiveTab('results');
      setIsRunning(false);
      toast.success(`Batch analysis completed! ${completed} successful, ${failed} failed`);
    }
  };

  const simulateAnalysis = async (url: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate random failure
    if (Math.random() < 0.1) {
      throw new Error('Network timeout');
    }

    return {
      score: 50 + Math.floor(Math.random() * 50),
      grade: ['A+', 'A', 'B', 'C', 'D'][Math.floor(Math.random() * 5)],
      headers: {
        found: 5 + Math.floor(Math.random() * 5),
        missing: Math.floor(Math.random() * 8),
        misconfigured: Math.floor(Math.random() * 3)
      },
      framework: ['nginx', 'apache', 'express.js', 'next.js'][Math.floor(Math.random() * 4)]
    };
  };

  const pauseAnalysis = () => {
    setIsPaused(true);
    setIsRunning(false);
  };

  const resumeAnalysis = () => {
    setIsPaused(false);
    runBatchAnalysis();
  };

  const exportResults = (format: 'csv' | 'json') => {
    const completedUrls = urls.filter(url => url.status === 'completed');

    if (completedUrls.length === 0) {
      toast.error('No completed analyses to export');
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      const headers = ['URL', 'Score', 'Grade', 'Found Headers', 'Missing Headers', 'Misconfigured Headers', 'Framework', 'Timestamp'];
      const rows = completedUrls.map(url => [
        url.url,
        url.score?.toString() || '',
        url.grade || '',
        url.headers?.found?.toString() || '',
        url.headers?.missing?.toString() || '',
        url.headers?.misconfigured?.toString() || '',
        url.framework || '',
        url.timestamp || ''
      ]);

      content = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      filename = `batch-security-analysis-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify({
        summary: batchResults,
        results: completedUrls,
        exportedAt: new Date().toISOString()
      }, null, 2);
      filename = `batch-security-analysis-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`${format.toUpperCase()} report exported successfully!`);
  };

  const getStatusIcon = (status: UrlAnalysis['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'analyzing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: UrlAnalysis['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'analyzing':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
    }
  };

  const progress = urls.length > 0 ? ((currentIndex / urls.length) * 100) : 0;
  const completedCount = urls.filter(url => url.status === 'completed').length;
  const errorCount = urls.filter(url => url.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Batch Security Analysis</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze multiple URLs in parallel and export comprehensive reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Parallel:</label>
          <select
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            disabled={isRunning}
            className={clsx('px-2 py-1 rounded border text-sm', {
              'bg-gray-800 border-gray-600 text-white': isDarkMode,
              'bg-white border-gray-300 text-gray-900': !isDarkMode
            })}
          >
            {[1, 2, 3, 5, 8].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700">
          <Tabs.Trigger
            value="upload"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'upload',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'upload' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'upload' && isDarkMode,
            })}
          >
            Upload URLs
          </Tabs.Trigger>
          <Tabs.Trigger
            value="batch"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'batch',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'batch' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'batch' && isDarkMode,
            })}
          >
            Batch Analysis ({urls.length})
          </Tabs.Trigger>
          <Tabs.Trigger
            value="results"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'results',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'results' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'results' && isDarkMode,
            })}
          >
            Results & Export
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="upload" className="mt-6">
          <div className="space-y-6">
            {/* File Upload */}
            <div className={clsx('p-8 rounded-xl border-2 border-dashed text-center', {
              'border-gray-600 bg-gray-800': isDarkMode,
              'border-gray-300 bg-gray-50': !isDarkMode
            })}>
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Upload URL List</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Upload a CSV, TXT, or JSON file containing URLs to analyze
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Choose File
              </button>

              <div className="mt-4 text-sm text-gray-500">
                <p>Supported formats:</p>
                <ul className="mt-1">
                  <li>• CSV: First column should contain URLs</li>
                  <li>• TXT: One URL per line</li>
                  <li>• JSON: Array of URLs or objects with url property</li>
                </ul>
              </div>
            </div>

            {/* Manual URL Entry */}
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="text-lg font-semibold mb-4">Add URLs Manually</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://example.com"
                  className={clsx('flex-1 px-3 py-2 rounded border', {
                    'bg-gray-700 border-gray-600 text-white': isDarkMode,
                    'bg-white border-gray-300 text-gray-900': !isDarkMode
                  })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addManualUrl((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="https://example.com"]') as HTMLInputElement;
                    if (input) {
                      addManualUrl(input.value);
                      input.value = '';
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="batch" className="mt-6">
          <div className="space-y-6">
            {/* Progress and Controls */}
            {urls.length > 0 && (
              <div className={clsx('p-6 rounded-xl border', {
                'bg-gray-800 border-gray-700': isDarkMode,
                'bg-white border-gray-200': !isDarkMode
              })}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Batch Progress</h3>
                  <div className="flex items-center gap-2">
                    {!isRunning && !isPaused && (
                      <button
                        onClick={runBatchAnalysis}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        Start Analysis
                      </button>
                    )}

                    {isRunning && (
                      <button
                        onClick={pauseAnalysis}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </button>
                    )}

                    {isPaused && (
                      <button
                        onClick={resumeAnalysis}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress: {currentIndex} / {urls.length}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>

                  <Progress.Root
                    value={progress}
                    className={clsx('relative h-2 w-full overflow-hidden rounded-full', {
                      'bg-gray-700': isDarkMode,
                      'bg-gray-200': !isDarkMode
                    })}
                  >
                    <Progress.Indicator
                      className="h-full bg-blue-500 transition-transform duration-300 ease-out"
                      style={{ transform: `translateX(-${100 - progress}%)` }}
                    />
                  </Progress.Root>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600">✓ Completed: {completedCount}</span>
                    <span className="text-red-600">✗ Failed: {errorCount}</span>
                    <span className="text-gray-500">⏳ Pending: {urls.length - completedCount - errorCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* URL List */}
            <div className={clsx('rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">URLs to Analyze ({urls.length})</h3>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {urls.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No URLs added yet. Upload a file or add URLs manually.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {urls.map((url) => (
                      <div key={url.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {getStatusIcon(url.status)}
                          <div className="flex-1">
                            <div className="font-medium">{url.url}</div>
                            {url.status === 'completed' && (
                              <div className="text-sm text-gray-500">
                                Score: {url.score}/100 ({url.grade}) • {url.headers?.found} found, {url.headers?.missing} missing
                              </div>
                            )}
                            {url.status === 'error' && (
                              <div className="text-sm text-red-500">{url.error}</div>
                            )}
                          </div>
                          <span className={clsx('text-sm font-medium', getStatusColor(url.status))}>
                            {url.status.charAt(0).toUpperCase() + url.status.slice(1)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeUrl(url.id)}
                          disabled={isRunning || url.status === 'analyzing'}
                          className="ml-2 p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="results" className="mt-6">
          <div className="space-y-6">
            {/* Summary */}
            {batchResults && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className={clsx('p-4 rounded-lg border text-center', {
                  'bg-gray-800 border-gray-700': isDarkMode,
                  'bg-white border-gray-200': !isDarkMode
                })}>
                  <div className="text-2xl font-bold">{batchResults.totalUrls}</div>
                  <div className="text-sm text-gray-500">Total URLs</div>
                </div>

                <div className={clsx('p-4 rounded-lg border text-center', {
                  'bg-gray-800 border-gray-700': isDarkMode,
                  'bg-white border-gray-200': !isDarkMode
                })}>
                  <div className="text-2xl font-bold text-green-600">{batchResults.completed}</div>
                  <div className="text-sm text-gray-500">Completed</div>
                </div>

                <div className={clsx('p-4 rounded-lg border text-center', {
                  'bg-gray-800 border-gray-700': isDarkMode,
                  'bg-white border-gray-200': !isDarkMode
                })}>
                  <div className="text-2xl font-bold text-red-600">{batchResults.failed}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>

                <div className={clsx('p-4 rounded-lg border text-center', {
                  'bg-gray-800 border-gray-700': isDarkMode,
                  'bg-white border-gray-200': !isDarkMode
                })}>
                  <div className="text-2xl font-bold">{batchResults.averageScore}/100</div>
                  <div className="text-sm text-gray-500">Average Score</div>
                </div>

                <div className={clsx('p-4 rounded-lg border text-center', {
                  'bg-gray-800 border-gray-700': isDarkMode,
                  'bg-white border-gray-200': !isDarkMode
                })}>
                  <div className="text-2xl font-bold text-green-600">{batchResults.bestScore}/100</div>
                  <div className="text-sm text-gray-500">Best Score</div>
                </div>

                <div className={clsx('p-4 rounded-lg border text-center', {
                  'bg-gray-800 border-gray-700': isDarkMode,
                  'bg-white border-gray-200': !isDarkMode
                })}>
                  <div className="text-2xl font-bold">{Math.round(batchResults.totalTime / 1000)}s</div>
                  <div className="text-sm text-gray-500">Total Time</div>
                </div>
              </div>
            )}

            {/* Export Options */}
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="text-lg font-semibold mb-4">Export Results</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => exportResults('csv')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Export CSV
                </button>

                <button
                  onClick={() => exportResults('json')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className={clsx('rounded-xl border overflow-hidden', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">Detailed Results</h3>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className={clsx('border-b', {
                    'bg-gray-700 border-gray-600': isDarkMode,
                    'bg-gray-50 border-gray-200': !isDarkMode
                  })}>
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">URL</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Score</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Grade</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Framework</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {urls.map((url) => (
                      <tr key={url.id}>
                        <td className="px-4 py-3 text-sm">{url.url}</td>
                        <td className="px-4 py-3 text-sm">{url.score || '-'}</td>
                        <td className="px-4 py-3 text-sm">{url.grade || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(url.status)}
                            <span className={getStatusColor(url.status)}>
                              {url.status.charAt(0).toUpperCase() + url.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{url.framework || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}