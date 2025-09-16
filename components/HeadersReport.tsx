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

const SEVERITY_COLORS = {
  low: '#6B7280',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
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
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade: string) => {
    if (['A+', 'A'].includes(grade)) return 'bg-green-100 text-green-800';
    if (['B', 'C'].includes(grade)) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <Info className="h-5 w-5 text-gray-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
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
    score: Math.round((header.score / 20) * 100), // Normalize to 100
    fullName: header.name,
  }));

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Security Analysis Report</h2>
            <p className="text-gray-600 mt-1">{analysis.url}</p>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              {new Date(analysis.timestamp).toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
              {analysis.score}/100
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(analysis.grade)}`}>
              Grade: {analysis.grade}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Headers Summary</h3>
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Found ({analysis.headers.found.length})</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm">Missing ({analysis.headers.missing.length})</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm">Misconfigured ({analysis.headers.misconfigured.length})</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Header Scores</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={10}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(label) => {
                      const item = barData.find(d => d.name === label);
                      return item?.fullName || label;
                    }}
                  />
                  <Bar dataKey="score" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-200">
          {onCreatePR && (
            <button
              onClick={onCreatePR}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200"
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Create Fix PR
            </button>
          )}
          {onDownloadReport && (
            <button
              onClick={onDownloadReport}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </button>
          )}
        </div>
      </div>

      {/* Headers Details */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Header Details</h3>
          <p className="text-gray-600 mt-1">
            Click on each header to see detailed information and recommendations
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {allHeaders.map((header) => {
            const isExpanded = expandedHeaders.has(header.name);
            const isPresent = header.present;
            const maxScore = 20; // Assuming max weight is 20 from your rules
            const scorePercentage = Math.round((header.score / maxScore) * 100);

            return (
              <div key={header.name} className="p-6">
                <button
                  onClick={() => toggleHeaderExpansion(header.name)}
                  className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-2 rounded-lg transition duration-200"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center">
                      {isPresent ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-gray-900">{header.name}</h4>
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(header.severity)}
                          <span className={`text-sm font-medium ${SEVERITY_COLORS[header.severity]}`}>
                            {header.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">{header.description}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                scorePercentage >= 80 ? 'bg-green-500' :
                                scorePercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.max(scorePercentage, 5)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {scorePercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 pl-12 space-y-4">
                    {header.present && header.value && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Current Value:</h5>
                        <code className="block bg-gray-100 p-3 rounded-lg text-sm text-gray-800 break-all">
                          {header.value}
                        </code>
                      </div>
                    )}

                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Recommendation:</h5>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-800">{header.recommendation}</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Why This Matters:</h5>
                      <p className="text-sm text-gray-600">{header.description}</p>
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