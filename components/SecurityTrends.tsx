'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import clsx from 'clsx';
import * as Tabs from '@radix-ui/react-tabs';

interface TrendData {
  date: string;
  score: number;
  grade: string;
  url: string;
  missingHeaders: number;
  foundHeaders: number;
  framework?: string;
}

interface IndustryAverage {
  sector: string;
  averageScore: number;
  commonMissing: string[];
}

interface SecurityTrendsProps {
  isDarkMode?: boolean;
  currentAnalysis?: {
    url: string;
    score: number;
    grade: string;
    headers: {
      found: Array<{ name: string }>;
      missing: Array<{ name: string }>;
    };
    framework?: string;
  };
}

const INDUSTRY_AVERAGES: IndustryAverage[] = [
  {
    sector: 'E-commerce',
    averageScore: 72,
    commonMissing: ['Content-Security-Policy', 'Permissions-Policy', 'Cross-Origin-Embedder-Policy']
  },
  {
    sector: 'Banking & Finance',
    averageScore: 85,
    commonMissing: ['Permissions-Policy', 'Cross-Origin-Resource-Policy']
  },
  {
    sector: 'Healthcare',
    averageScore: 78,
    commonMissing: ['Content-Security-Policy', 'Cross-Origin-Embedder-Policy']
  },
  {
    sector: 'Technology',
    averageScore: 81,
    commonMissing: ['Permissions-Policy', 'Cross-Origin-Resource-Policy']
  },
  {
    sector: 'Government',
    averageScore: 89,
    commonMissing: ['Cross-Origin-Embedder-Policy']
  },
  {
    sector: 'Education',
    averageScore: 65,
    commonMissing: ['Content-Security-Policy', 'Strict-Transport-Security', 'Permissions-Policy']
  }
];

const COMMON_MISSING_HEADERS = [
  'Content-Security-Policy',
  'Permissions-Policy',
  'Cross-Origin-Embedder-Policy',
  'Cross-Origin-Resource-Policy',
  'Referrer-Policy',
  'X-Content-Type-Options'
];

export default function SecurityTrends({ isDarkMode = false, currentAnalysis }: SecurityTrendsProps) {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedSector, setSelectedSector] = useState<string>('Technology');
  const [activeTab, setActiveTab] = useState('trends');

  const getGradeFromScore = (score: number): string => {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const generateSampleData = useCallback((): TrendData[] => {
    const data: TrendData[] = [];
    const now = new Date();

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const baseScore = 60 + Math.random() * 30;
      const trend = i < 15 ? (15 - i) * 2 : 0; // Improvement trend
      const score = Math.min(100, Math.round(baseScore + trend + (Math.random() - 0.5) * 10));

      data.push({
        date: date.toISOString().split('T')[0],
        score,
        grade: getGradeFromScore(score),
        url: `https://example-${i}.com`,
        missingHeaders: Math.max(0, 8 - Math.floor(score / 15)),
        foundHeaders: Math.floor(score / 15) + 2,
        framework: ['nginx', 'apache', 'express.js', 'next.js'][Math.floor(Math.random() * 4)]
      });
    }

    return data;
  }, []);

  useEffect(() => {
    // Load historical data from localStorage
    const loadHistoricalData = () => {
      const stored = localStorage.getItem('securityTrendsData');
      if (stored) {
        setTrendData(JSON.parse(stored));
      } else {
        // Generate sample historical data for demo
        const sampleData = generateSampleData();
        setTrendData(sampleData);
        localStorage.setItem('securityTrendsData', JSON.stringify(sampleData));
      }
    };

    loadHistoricalData();
  }, [generateSampleData]);

  useEffect(() => {
    // Add current analysis to trend data
    if (currentAnalysis) {
      const newEntry: TrendData = {
        date: new Date().toISOString().split('T')[0],
        score: currentAnalysis.score,
        grade: currentAnalysis.grade,
        url: currentAnalysis.url,
        missingHeaders: currentAnalysis.headers.missing.length,
        foundHeaders: currentAnalysis.headers.found.length,
        framework: currentAnalysis.framework
      };

      setTrendData(prev => {
        const updated = [newEntry, ...prev.slice(0, 99)]; // Keep last 100 entries
        localStorage.setItem('securityTrendsData', JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentAnalysis]);

  const getFilteredData = () => {
    const now = new Date();
    const days = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : selectedTimeframe === '90d' ? 90 : 365;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return trendData.filter(item => new Date(item.date) >= cutoff);
  };

  const getScoreChange = () => {
    const filtered = getFilteredData();
    if (filtered.length < 2) return { change: 0, direction: 'stable' as const };

    const latest = filtered[0]?.score || 0;
    const previous = filtered[filtered.length - 1]?.score || 0;
    const change = latest - previous;

    return {
      change: Math.abs(change),
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable' as const
    };
  };

  const getCommonMissingHeaders = () => {
    const filtered = getFilteredData();
    const headerCount: Record<string, number> = {};

    // This would normally come from actual analysis data
    COMMON_MISSING_HEADERS.forEach(header => {
      headerCount[header] = Math.floor(Math.random() * filtered.length);
    });

    return Object.entries(headerCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / filtered.length) * 100) }));
  };

  const scoreChange = getScoreChange();
  const filteredData = getFilteredData();
  const industryData = INDUSTRY_AVERAGES.find(ind => ind.sector === selectedSector);
  const commonMissing = getCommonMissingHeaders();

  const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className={clsx('space-y-6', {
      'text-white': isDarkMode,
      'text-gray-900': !isDarkMode
    })}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Security Trends Analysis</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track security improvements over time and compare against industry standards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className={clsx('px-3 py-2 rounded-lg border text-sm', {
              'bg-gray-800 border-gray-600 text-white': isDarkMode,
              'bg-white border-gray-300 text-gray-900': !isDarkMode
            })}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          <button className={clsx('p-2 rounded-lg border transition-colors', {
            'bg-gray-800 border-gray-600 hover:bg-gray-700': isDarkMode,
            'bg-white border-gray-300 hover:bg-gray-50': !isDarkMode
          })}>
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx('p-6 rounded-xl border', {
            'bg-gray-800 border-gray-700': isDarkMode,
            'bg-white border-gray-200': !isDarkMode
          })}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Score</p>
              <p className="text-2xl font-bold">{filteredData[0]?.score || 0}/100</p>
            </div>
            <div className={clsx('p-3 rounded-full', {
              'bg-green-100': scoreChange.direction === 'up' && !isDarkMode,
              'bg-green-900/20': scoreChange.direction === 'up' && isDarkMode,
              'bg-red-100': scoreChange.direction === 'down' && !isDarkMode,
              'bg-red-900/20': scoreChange.direction === 'down' && isDarkMode,
              'bg-gray-100': scoreChange.direction === 'stable' && !isDarkMode,
              'bg-gray-900/20': scoreChange.direction === 'stable' && isDarkMode,
            })}>
              {scoreChange.direction === 'up' && <TrendingUp className="h-6 w-6 text-green-500" />}
              {scoreChange.direction === 'down' && <TrendingDown className="h-6 w-6 text-red-500" />}
              {scoreChange.direction === 'stable' && <BarChart3 className="h-6 w-6 text-gray-500" />}
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className={clsx({
              'text-green-600': scoreChange.direction === 'up',
              'text-red-600': scoreChange.direction === 'down',
              'text-gray-600': scoreChange.direction === 'stable'
            })}>
              {scoreChange.direction === 'up' && '+'}
              {scoreChange.direction === 'down' && '-'}
              {scoreChange.change}
            </span>
            <span className="text-gray-500 ml-1">vs {selectedTimeframe}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={clsx('p-6 rounded-xl border', {
            'bg-gray-800 border-gray-700': isDarkMode,
            'bg-white border-gray-200': !isDarkMode
          })}
        >
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Industry Average</p>
            <p className="text-2xl font-bold">{industryData?.averageScore || 75}/100</p>
          </div>
          <div className="mt-2">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className={clsx('text-sm border-none bg-transparent focus:outline-none', {
                'text-gray-400': isDarkMode,
                'text-gray-600': !isDarkMode
              })}
            >
              {INDUSTRY_AVERAGES.map(sector => (
                <option key={sector.sector} value={sector.sector}>
                  {sector.sector}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={clsx('p-6 rounded-xl border', {
            'bg-gray-800 border-gray-700': isDarkMode,
            'bg-white border-gray-200': !isDarkMode
          })}
        >
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Analyses</p>
            <p className="text-2xl font-bold">{filteredData.length}</p>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-1 text-gray-500" />
            <span className="text-gray-500">in {selectedTimeframe}</span>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700">
          <Tabs.Trigger
            value="trends"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'trends',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'trends' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'trends' && isDarkMode,
            })}
          >
            Security Trends
          </Tabs.Trigger>
          <Tabs.Trigger
            value="comparison"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'comparison',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'comparison' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'comparison' && isDarkMode,
            })}
          >
            Industry Comparison
          </Tabs.Trigger>
          <Tabs.Trigger
            value="insights"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'insights',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'insights' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'insights' && isDarkMode,
            })}
          >
            Missing Headers
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="trends" className="mt-6">
          <div className={clsx('p-6 rounded-xl border', {
            'bg-gray-800 border-gray-700': isDarkMode,
            'bg-white border-gray-200': !isDarkMode
          })}>
            <h3 className="text-lg font-semibold mb-4">Security Score Over Time</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis
                    dataKey="date"
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    name="Security Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="comparison" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="text-lg font-semibold mb-4">Industry Benchmarks</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={INDUSTRY_AVERAGES}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis
                      dataKey="sector"
                      stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="averageScore" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="text-lg font-semibold mb-4">Your Performance vs Industry</h3>
              <div className="space-y-4">
                {INDUSTRY_AVERAGES.map((industry) => {
                  const yourScore = filteredData[0]?.score || 0;
                  const diff = yourScore - industry.averageScore;
                  return (
                    <div key={industry.sector} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <span className="font-medium">{industry.sector}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {industry.averageScore}
                        </span>
                        <span className={clsx('text-sm font-medium', {
                          'text-green-600': diff > 0,
                          'text-red-600': diff < 0,
                          'text-gray-600': diff === 0
                        })}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="insights" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="text-lg font-semibold mb-4">Most Common Missing Headers</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={commonMissing}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    >
                      {commonMissing.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="text-lg font-semibold mb-4">Improvement Recommendations</h3>
              <div className="space-y-3">
                {commonMissing.slice(0, 5).map((header, index) => (
                  <div key={header.name} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="w-6 h-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{header.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Missing in {Math.round((header.count / getFilteredData().length) * 100)}% of analyses - High priority for implementation
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}