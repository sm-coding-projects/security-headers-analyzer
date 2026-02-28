'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import {
  TrendingUp,
  FileUp,
  Code,
  Settings,
  Brain,
  ArrowLeft
} from 'lucide-react';

// Import advanced components
import SecurityTrends from '@/components/SecurityTrends';
import BatchAnalyzer from '@/components/BatchAnalyzer';
import InteractivePlayground from '@/components/InteractivePlayground';
import Integrations from '@/components/Integrations';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AdvancedDashboard() {
  const [activeTab, setActiveTab] = useState('trends');
  const [latestAnalysis, setLatestAnalysis] = useState<{
    url: string;
    score: number;
    grade: string;
    headers: {
      found: { name: string; }[];
      missing: { name: string; }[];
    };
    framework?: string;
  } | null>(null);

  const tabs = [
    {
      id: 'trends',
      name: 'Security Trends',
      icon: TrendingUp,
      description: 'Historical analysis and industry benchmarks',
      component: SecurityTrends
    },
    {
      id: 'batch',
      name: 'Batch Analyzer',
      icon: FileUp,
      description: 'Bulk analysis with parallel processing',
      component: BatchAnalyzer
    },
    {
      id: 'playground',
      name: 'Interactive Playground',
      icon: Code,
      description: 'Live header testing and policy building',
      component: InteractivePlayground
    },
    {
      id: 'integrations',
      name: 'Integrations',
      icon: Settings,
      description: 'Connect with external tools and services',
      component: Integrations
    }
  ];

  useEffect(() => {
    document.documentElement.classList.add('dark');

    const loadLatestAnalysis = () => {
      const recentAnalyses = localStorage.getItem('recentAnalyses');
      if (recentAnalyses) {
        const analyses = JSON.parse(recentAnalyses);
        if (analyses.length > 0) {
          const mostRecent = analyses[0];
          setLatestAnalysis({
            url: mostRecent.url,
            score: mostRecent.score,
            grade: getGradeFromScore(mostRecent.score),
            headers: mostRecent.headers || { found: [], missing: [] },
            framework: mostRecent.framework
          });
        }
      }
    };

    const getGradeFromScore = (score: number): string => {
      if (score >= 95) return 'A+';
      if (score >= 85) return 'A';
      if (score >= 75) return 'B';
      if (score >= 65) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    };

    loadLatestAnalysis();
  }, []);

  return (
    <ErrorBoundary level="page" showDetails={true}>
      <div className="min-h-screen bg-[#0B0F19] text-slate-100">
        {/* Navigation */}
        <nav className="glass-strong border-b border-slate-800/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 glow-cyan">
                <Brain className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-100">Advanced Tools</h1>
                <p className="text-[10px] text-slate-500">Professional security analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
              </Link>
            </div>
          </div>
        </nav>

        {/* Compact Header */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-8"
        >
          <div className="max-w-7xl mx-auto px-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-2">
              Advanced Security Tools
            </h1>
            <p className="text-slate-500 text-sm">
              Professional-grade analysis, monitoring, and integration tools
            </p>
          </div>
        </motion.section>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 pb-16">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            {/* Tab Navigation */}
            <div className="mb-8">
              <div className="glass rounded-2xl p-5">
                <Tabs.List className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {tabs.map((tab) => (
                    <Tabs.Trigger
                      key={tab.id}
                      value={tab.id}
                      className={`p-4 rounded-xl transition-all duration-200 text-left ${
                        activeTab === tab.id
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 glow-cyan'
                          : 'bg-slate-800/30 hover:bg-slate-800/50 text-slate-400 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <tab.icon className="h-4 w-4" />
                        <span className="font-medium text-sm">{tab.name}</span>
                      </div>
                      <p className="text-[11px] opacity-60">{tab.description}</p>
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </div>
            </div>

            {/* Tab Content */}
            {tabs.map((tab) => (
              <Tabs.Content key={tab.id} value={tab.id}>
                <ErrorBoundary level="component">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <tab.component
                      isDarkMode={true}
                      currentAnalysis={tab.id === 'trends' && latestAnalysis ? latestAnalysis : undefined}
                    />
                  </motion.div>
                </ErrorBoundary>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>
      </div>
    </ErrorBoundary>
  );
}
