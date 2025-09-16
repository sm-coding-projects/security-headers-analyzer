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
  Brain
} from 'lucide-react';
import clsx from 'clsx';

// Import advanced components
import SecurityTrends from '@/components/SecurityTrends';
import BatchAnalyzer from '@/components/BatchAnalyzer';
import InteractivePlayground from '@/components/InteractivePlayground';
import Integrations from '@/components/Integrations';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AdvancedDashboard() {
  const [activeTab, setActiveTab] = useState('trends');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState(null);

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

  // Load latest analysis and dark mode from main app
  useEffect(() => {
    // Load dark mode state from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const loadLatestAnalysis = () => {
      // Load from recentAnalyses (from main app)
      const recentAnalyses = localStorage.getItem('recentAnalyses');
      if (recentAnalyses) {
        const analyses = JSON.parse(recentAnalyses);
        if (analyses.length > 0) {
          // Get the most recent analysis
          const mostRecent = analyses[0];
          setLatestAnalysis({
            url: mostRecent.url,
            score: mostRecent.score,
            grade: getGradeFromScore(mostRecent.score),
            timestamp: mostRecent.timestamp
          });
        }
      }
    };

    const getGradeFromScore = (score) => {
      if (score >= 95) return 'A+';
      if (score >= 85) return 'A';
      if (score >= 75) return 'B';
      if (score >= 65) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    };


    loadLatestAnalysis();
  }, []);

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

  return (
    <ErrorBoundary level="page" showDetails={true}>
      <div className={clsx('min-h-screen transition-colors duration-300', {
        'bg-gray-900 text-white': isDarkMode,
        'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50': !isDarkMode
      })}>
        {/* Navigation */}
        <nav className={clsx('border-b backdrop-blur-sm sticky top-0 z-50', {
          'bg-gray-900/80 border-gray-700': isDarkMode,
          'bg-white/80 border-gray-200': !isDarkMode
        })}>
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Advanced Security Features</h1>
                <p className="text-xs text-gray-500">Professional security analysis tools</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className={clsx('px-3 py-2 rounded-lg transition-colors', {
                  'hover:bg-gray-700 text-gray-300': isDarkMode,
                  'hover:bg-gray-100 text-gray-700': !isDarkMode
                })}
              >
                Back to Main
              </Link>
              <button
                onClick={toggleDarkMode}
                className={clsx('p-2 rounded-lg transition-colors', {
                  'hover:bg-gray-700': isDarkMode,
                  'hover:bg-gray-100': !isDarkMode
                })}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-12"
        >
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Advanced Security Tools
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Professional-grade security analysis, monitoring, and integration tools for enterprise workflows
            </p>
          </div>
        </motion.section>

        {/* Main Content */}
        <div className="container mx-auto px-4 pb-16">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            {/* Tab Navigation */}
            <div className="mb-8">
              <div className={clsx('p-6 rounded-xl border', {
                'bg-gray-800 border-gray-700': isDarkMode,
                'bg-white border-gray-200': !isDarkMode
              })}>
                <Tabs.List className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {tabs.map((tab) => (
                    <Tabs.Trigger
                      key={tab.id}
                      value={tab.id}
                      className={clsx('p-4 rounded-lg transition-all duration-200 text-left', {
                        'bg-blue-600 text-white shadow-lg': activeTab === tab.id,
                        'bg-gray-100 hover:bg-gray-200 text-gray-700': activeTab !== tab.id && !isDarkMode,
                        'bg-gray-700 hover:bg-gray-600 text-gray-300': activeTab !== tab.id && isDarkMode,
                      })}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <tab.icon className="h-5 w-5" />
                        <span className="font-semibold">{tab.name}</span>
                      </div>
                      <p className="text-xs opacity-80">{tab.description}</p>
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <tab.component
                      isDarkMode={isDarkMode}
                      currentAnalysis={tab.id === 'trends' ? latestAnalysis : undefined}
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