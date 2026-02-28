'use client';

import { useState } from 'react';
import { AnalysisResult } from '@/types/security';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface HeadersReportProps {
  analysis: AnalysisResult;
  onCreatePR?: () => void;
  onDownloadReport?: () => void;
}

const COLORS = {
  passed: '#10B981',
  failed: '#EF4444',
  warning: '#F59E0B',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-slate-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
  critical: 'text-red-500',
};

export default function HeadersReport({ analysis, onCreatePR, onDownloadReport }: HeadersReportProps) {
  const [expandedHeaders, setExpandedHeaders] = useState<Set<string>>(new Set());

  const toggleHeaderExpansion = (headerName: string) => {
    const newExpanded = new Set(expandedHeaders);
    if (newExpanded.has(headerName)) {
      newExpanded.delete(headerName);
    } else {
      newExpanded.add(headerName);
    }
    setExpandedHeaders(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getGradeColor = (grade: string) => {
    if (['A+', 'A'].includes(grade)) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (['B', 'C'].includes(grade)) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-red-500/10 text-red-400 border border-red-500/20';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'low':
        return <Info className="h-5 w-5 text-slate-500" />;
      default:
        return <Info className="h-5 w-5 text-slate-500" />;
    }
  };

  const allHeaders = [...analysis.headers.found, ...analysis.headers.missing, ...analysis.headers.misconfigured];
  const pieData = [
    { name: 'Found', value: analysis.headers.found.length, color: COLORS.passed },
    { name: 'Missing', value: analysis.headers.missing.length, color: COLORS.failed },
    { name: 'Misconfigured', value: analysis.headers.misconfigured.length, color: COLORS.warning },
  ];

  const barData = allHeaders.map(header => ({
    name: header.name.replace(/^X-/, '').substring(0, 15) + (header.name.length > 15 ? '...' : ''),
    score: Math.round((header.score / 20) * 100),
    fullName: header.name,
  }));

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Summary */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Security Analysis Report</h2>
            <p className="text-slate-400 mt-1 text-sm">{analysis.url}</p>
            <div className="flex items-center mt-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 mr-1" />
              {new Date(analysis.timestamp).toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold tabular-nums ${getScoreColor(analysis.score)}`}>
              {analysis.score}/100
            </div>
            <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium mt-1 ${getGradeColor(analysis.grade)}`}>
              Grade: {analysis.grade}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Headers Summary</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1F2E', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94A3B8' }}
                    itemStyle={{ color: '#F1F5F9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></div>
                <span className="text-xs text-slate-400">Found ({analysis.headers.found.length})</span>
              </div>
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></div>
                <span className="text-xs text-slate-400">Missing ({analysis.headers.missing.length})</span>
              </div>
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-2"></div>
                <span className="text-xs text-slate-400">Misconfigured ({analysis.headers.misconfigured.length})</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Header Scores</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fill: '#64748B', fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1F2E', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94A3B8' }}
                    itemStyle={{ color: '#F1F5F9' }}
                    labelFormatter={(label) => {
                      const item = barData.find(d => d.name === label);
                      return item?.fullName || label;
                    }}
                  />
                  <Bar dataKey="score" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-800/50">
          {onCreatePR && (
            <button
              onClick={onCreatePR}
              className="flex items-center px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 rounded-xl transition-all text-sm font-medium"
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Create Fix PR
            </button>
          )}
          {onDownloadReport && (
            <button
              onClick={onDownloadReport}
              className="flex items-center px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/30 text-slate-300 rounded-xl transition-all text-sm font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </button>
          )}
        </div>
      </div>

      {/* Headers Details */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50">
          <h3 className="text-lg font-bold text-slate-100">Header Details</h3>
          <p className="text-slate-500 mt-1 text-xs">
            Click on each header to see detailed information and recommendations
          </p>
        </div>

        <div className="divide-y divide-slate-800/50">
          {allHeaders.map((header) => {
            const isExpanded = expandedHeaders.has(header.name);
            const isPresent = header.present;
            const maxScore = 20;
            const scorePercentage = Math.round((header.score / maxScore) * 100);

            return (
              <div key={header.name} className="p-5">
                <button
                  onClick={() => toggleHeaderExpansion(header.name)}
                  className="w-full flex items-center justify-between text-left hover:bg-slate-800/30 p-2 rounded-lg transition-all"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center">
                      {isPresent ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-slate-200 text-sm">{header.name}</h4>
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(header.severity)}
                          <span className={`text-xs font-medium ${SEVERITY_COLORS[header.severity] || 'text-slate-400'}`}>
                            {header.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-1.5">
                        <span className="text-xs text-slate-500 line-clamp-1">{header.description}</span>
                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="w-20 bg-slate-800 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                scorePercentage >= 80 ? 'bg-emerald-500' :
                                scorePercentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.max(scorePercentage, 5)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-slate-400 tabular-nums">
                            {scorePercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 pl-11 space-y-4">
                    {header.present && header.value && (
                      <div>
                        <h5 className="font-medium text-slate-400 text-xs uppercase tracking-wider mb-2">Current Value</h5>
                        <code className="block bg-slate-900/60 p-3 rounded-xl text-xs text-slate-300 font-mono break-all border border-slate-800/50">
                          {header.value}
                        </code>
                      </div>
                    )}

                    <div>
                      <h5 className="font-medium text-slate-400 text-xs uppercase tracking-wider mb-2">Recommendation</h5>
                      <div className="bg-cyan-500/5 border border-cyan-500/10 p-4 rounded-xl">
                        <p className="text-xs text-cyan-300/80">{header.recommendation}</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-slate-400 text-xs uppercase tracking-wider mb-2">Why This Matters</h5>
                      <p className="text-xs text-slate-500">{header.description}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
