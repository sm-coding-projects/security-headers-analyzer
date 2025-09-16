'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Github,
  Webhook,
  Chrome,
  Settings,
  Copy,
  Code,
  Play,
  Globe,
  Bell,
  Shield,
  Zap
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

interface IntegrationsProps {
  isDarkMode?: boolean;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'communication' | 'cicd' | 'monitoring' | 'browser';
  status: 'available' | 'configured' | 'coming_soon';
  difficulty: 'easy' | 'medium' | 'advanced';
  features: string[];
}

interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  headers: Record<string, string>;
  active: boolean;
}

interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username: string;
  thresholds: {
    criticalScore: number;
    notifyOnImprovement: boolean;
    notifyOnDegradation: boolean;
  };
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get security score notifications in your Slack channels',
    icon: MessageSquare,
    category: 'communication',
    status: 'available',
    difficulty: 'easy',
    features: ['Real-time notifications', 'Custom score thresholds', 'Rich formatting', 'Channel customization']
  },
  {
    id: 'github_actions',
    name: 'GitHub Actions',
    description: 'Integrate security header checks into your CI/CD pipeline',
    icon: Github,
    category: 'cicd',
    status: 'available',
    difficulty: 'medium',
    features: ['Automated checks', 'PR comments', 'Status checks', 'Custom workflows']
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Send analysis results to any endpoint via HTTP webhooks',
    icon: Webhook,
    category: 'monitoring',
    status: 'available',
    difficulty: 'advanced',
    features: ['Custom payloads', 'Event filtering', 'Retry logic', 'Authentication']
  },
  {
    id: 'browser_extension',
    name: 'Browser Extension',
    description: 'Analyze security headers on any website with one click',
    icon: Chrome,
    category: 'browser',
    status: 'coming_soon',
    difficulty: 'easy',
    features: ['One-click analysis', 'Real-time results', 'History tracking', 'Export options']
  }
];

export default function Integrations({ isDarkMode = false }: IntegrationsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    url: '',
    events: [],
    secret: '',
    headers: {},
    active: false
  });
  const [slackConfig, setSlackConfig] = useState<SlackConfig>({
    webhookUrl: '',
    channel: '#security',
    username: 'Security Bot',
    thresholds: {
      criticalScore: 60,
      notifyOnImprovement: true,
      notifyOnDegradation: true
    }
  });
  const [_selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const generateGitHubWorkflow = () => {
    return `name: Security Headers Check

on:
  pull_request:
    branches: [ main, develop ]
  push:
    branches: [ main ]

jobs:
  security-headers:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install -g @security-headers/cli

    - name: Check security headers
      run: |
        # Replace with your production URL
        ANALYSIS_RESULT=$(curl -s -X POST "https://your-analyzer.com/api/analyze" \\
          -H "Content-Type: application/json" \\
          -d '{"url": "https://your-website.com"}')

        SCORE=$(echo $ANALYSIS_RESULT | jq -r '.data.score')

        if [ "$SCORE" -lt 80 ]; then
          echo "Security score ($SCORE) is below threshold (80)"
          exit 1
        fi

        echo "Security score: $SCORE/100 ✅"

    - name: Comment PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: \`🔒 Security headers analysis completed with score: $SCORE/100\`
          })`;
  };

  const generateWebhookExample = () => {
    return `{
  "event": "analysis_completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "url": "https://example.com",
    "score": 85,
    "grade": "A",
    "headers": {
      "found": [
        {
          "name": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload",
          "score": 10
        }
      ],
      "missing": [
        {
          "name": "Content-Security-Policy",
          "severity": "critical",
          "recommendation": "Implement CSP to prevent XSS attacks"
        }
      ]
    },
    "recommendations": [
      {
        "header": "Content-Security-Policy",
        "priority": 100,
        "solution": "Add CSP header with strict policy"
      }
    ]
  }
}`;
  };

  const generateSlackMessage = (score: number, url: string) => {
    const emoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴';
    const status = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Improvement';

    return `${emoji} *Security Headers Analysis*

*Website:* ${url}
*Score:* ${score}/100 (${status})
*Analyzed:* ${new Date().toLocaleString()}

${score < 70 ? '⚠️ *Action Required:* Security score is below recommended threshold' : '✅ Security standards are being maintained'}

<https://your-analyzer.com/report/${encodeURIComponent(url)}|View Detailed Report>`;
  };

  const testSlackIntegration = async () => {
    if (!slackConfig.webhookUrl) {
      toast.error('Please configure Slack webhook URL first');
      return;
    }

    try {
      const testMessage = generateSlackMessage(75, 'https://example.com');

      // This would normally send to Slack
      toast.success('Test message sent to Slack!');
      console.log('Test Slack message:', testMessage);
    } catch {
      toast.error('Failed to send test message');
    }
  };

  const testWebhook = async () => {
    if (!webhookConfig.url) {
      toast.error('Please configure webhook URL first');
      return;
    }

    try {
      const testPayload = JSON.parse(generateWebhookExample());

      // This would normally send to the webhook endpoint
      toast.success('Test webhook sent successfully!');
      console.log('Test webhook payload:', testPayload);
    } catch {
      toast.error('Failed to send test webhook');
    }
  };

  const generateDockerCommand = () => {
    return `# Run security headers analysis in Docker
docker run --rm \\
  -e TARGET_URL="https://your-website.com" \\
  -e WEBHOOK_URL="${webhookConfig.url}" \\
  security-headers-analyzer:latest

# Or with docker-compose
version: '3.8'
services:
  security-monitor:
    image: security-headers-analyzer:latest
    environment:
      - TARGET_URL=https://your-website.com
      - SCHEDULE="0 */6 * * *"  # Every 6 hours
      - WEBHOOK_URL=${webhookConfig.url}
    restart: unless-stopped`;
  };

  const IntegrationCard = ({ integration }: { integration: Integration }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={clsx('p-6 rounded-xl border cursor-pointer transition-all', {
        'bg-gray-800 border-gray-700 hover:border-gray-600': isDarkMode,
        'bg-white border-gray-200 hover:border-gray-300': !isDarkMode,
        'opacity-50': integration.status === 'coming_soon'
      })}
      onClick={() => integration.status !== 'coming_soon' && setSelectedIntegration(integration.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={clsx('p-2 rounded-lg', {
            'bg-blue-100': !isDarkMode,
            'bg-blue-900/20': isDarkMode
          })}>
            <integration.icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">{integration.name}</h3>
            <span className={clsx('text-xs px-2 py-1 rounded-full', {
              'bg-green-100 text-green-700': integration.status === 'configured' && !isDarkMode,
              'bg-green-900/20 text-green-400': integration.status === 'configured' && isDarkMode,
              'bg-blue-100 text-blue-700': integration.status === 'available' && !isDarkMode,
              'bg-blue-900/20 text-blue-400': integration.status === 'available' && isDarkMode,
              'bg-gray-100 text-gray-600': integration.status === 'coming_soon' && !isDarkMode,
              'bg-gray-700 text-gray-400': integration.status === 'coming_soon' && isDarkMode,
            })}>
              {integration.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <span className={clsx('text-xs px-2 py-1 rounded', {
          'bg-green-100 text-green-700': integration.difficulty === 'easy' && !isDarkMode,
          'bg-green-900/20 text-green-400': integration.difficulty === 'easy' && isDarkMode,
          'bg-yellow-100 text-yellow-700': integration.difficulty === 'medium' && !isDarkMode,
          'bg-yellow-900/20 text-yellow-400': integration.difficulty === 'medium' && isDarkMode,
          'bg-red-100 text-red-700': integration.difficulty === 'advanced' && !isDarkMode,
          'bg-red-900/20 text-red-400': integration.difficulty === 'advanced' && isDarkMode,
        })}>
          {integration.difficulty}
        </span>
      </div>

      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
        {integration.description}
      </p>

      <div className="flex flex-wrap gap-1">
        {integration.features.slice(0, 3).map((feature, index) => (
          <span
            key={index}
            className={clsx('text-xs px-2 py-1 rounded', {
              'bg-gray-100 text-gray-600': !isDarkMode,
              'bg-gray-700 text-gray-300': isDarkMode
            })}
          >
            {feature}
          </span>
        ))}
        {integration.features.length > 3 && (
          <span className="text-xs text-gray-500">
            +{integration.features.length - 3} more
          </span>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Third-party Integrations</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your security analysis workflow with popular tools and services
          </p>
        </div>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger
            value="overview"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'overview',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'overview' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'overview' && isDarkMode,
            })}
          >
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger
            value="slack"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'slack',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'slack' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'slack' && isDarkMode,
            })}
          >
            Slack
          </Tabs.Trigger>
          <Tabs.Trigger
            value="cicd"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'cicd',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'cicd' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'cicd' && isDarkMode,
            })}
          >
            CI/CD
          </Tabs.Trigger>
          <Tabs.Trigger
            value="webhooks"
            className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
              'border-blue-500 text-blue-600': activeTab === 'webhooks',
              'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'webhooks' && !isDarkMode,
              'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'webhooks' && isDarkMode,
            })}
          >
            Webhooks
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview">
          <div className="space-y-6">
            {/* Integration Categories */}
            {['communication', 'cicd', 'monitoring', 'browser'].map(category => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4 capitalize flex items-center gap-2">
                  {category === 'communication' && <MessageSquare className="h-5 w-5" />}
                  {category === 'cicd' && <Github className="h-5 w-5" />}
                  {category === 'monitoring' && <Bell className="h-5 w-5" />}
                  {category === 'browser' && <Chrome className="h-5 w-5" />}
                  {category.replace('_', ' ')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {INTEGRATIONS
                    .filter(integration => integration.category === category)
                    .map(integration => (
                      <IntegrationCard key={integration.id} integration={integration} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Tabs.Content>

        <Tabs.Content value="slack">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Slack Configuration
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Webhook URL</label>
                  <input
                    type="url"
                    value={slackConfig.webhookUrl}
                    onChange={(e) => setSlackConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/..."
                    className={clsx('w-full px-3 py-2 rounded border', {
                      'bg-gray-700 border-gray-600 text-white': isDarkMode,
                      'bg-white border-gray-300 text-gray-900': !isDarkMode
                    })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Channel</label>
                    <input
                      type="text"
                      value={slackConfig.channel}
                      onChange={(e) => setSlackConfig(prev => ({ ...prev, channel: e.target.value }))}
                      placeholder="#security"
                      className={clsx('w-full px-3 py-2 rounded border', {
                        'bg-gray-700 border-gray-600 text-white': isDarkMode,
                        'bg-white border-gray-300 text-gray-900': !isDarkMode
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <input
                      type="text"
                      value={slackConfig.username}
                      onChange={(e) => setSlackConfig(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Security Bot"
                      className={clsx('w-full px-3 py-2 rounded border', {
                        'bg-gray-700 border-gray-600 text-white': isDarkMode,
                        'bg-white border-gray-300 text-gray-900': !isDarkMode
                      })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Critical Score Threshold</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={slackConfig.thresholds.criticalScore}
                    onChange={(e) => setSlackConfig(prev => ({
                      ...prev,
                      thresholds: { ...prev.thresholds, criticalScore: parseInt(e.target.value) || 60 }
                    }))}
                    className={clsx('w-full px-3 py-2 rounded border', {
                      'bg-gray-700 border-gray-600 text-white': isDarkMode,
                      'bg-white border-gray-300 text-gray-900': !isDarkMode
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="notifyImprovement"
                      checked={slackConfig.thresholds.notifyOnImprovement}
                      onChange={(e) => setSlackConfig(prev => ({
                        ...prev,
                        thresholds: { ...prev.thresholds, notifyOnImprovement: e.target.checked }
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="notifyImprovement" className="text-sm">Notify on score improvements</label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="notifyDegradation"
                      checked={slackConfig.thresholds.notifyOnDegradation}
                      onChange={(e) => setSlackConfig(prev => ({
                        ...prev,
                        thresholds: { ...prev.thresholds, notifyOnDegradation: e.target.checked }
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="notifyDegradation" className="text-sm">Notify on score degradation</label>
                  </div>
                </div>

                <button
                  onClick={testSlackIntegration}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Test Integration
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message Preview
              </h3>

              <div className={clsx('p-4 rounded-lg border', {
                'bg-gray-700 border-gray-600': isDarkMode,
                'bg-gray-50 border-gray-200': !isDarkMode
              })}>
                <pre className="text-sm whitespace-pre-wrap">
                  {generateSlackMessage(75, 'https://example.com')}
                </pre>
              </div>

              <div className="mt-4 space-y-3">
                <h4 className="font-medium">Setup Instructions:</h4>
                <ol className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                  <li>1. Go to your Slack workspace settings</li>
                  <li>2. Create a new incoming webhook</li>
                  <li>3. Copy the webhook URL and paste it above</li>
                  <li>4. Configure your notification preferences</li>
                  <li>5. Test the integration</li>
                </ol>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="cicd">
          <div className="space-y-6">
            {/* GitHub Actions */}
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  GitHub Actions Workflow
                </h3>
                <button
                  onClick={() => copyToClipboard(generateGitHubWorkflow(), 'GitHub Actions workflow')}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>

              <div className={clsx('rounded-lg border overflow-hidden', {
                'bg-gray-900 border-gray-600': isDarkMode,
                'bg-gray-50 border-gray-200': !isDarkMode
              })}>
                <pre className="p-4 text-sm overflow-x-auto">
                  <code>{generateGitHubWorkflow()}</code>
                </pre>
              </div>
            </div>

            {/* Docker Integration */}
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Docker Integration
                </h3>
                <button
                  onClick={() => copyToClipboard(generateDockerCommand(), 'Docker commands')}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>

              <div className={clsx('rounded-lg border overflow-hidden', {
                'bg-gray-900 border-gray-600': isDarkMode,
                'bg-gray-50 border-gray-200': !isDarkMode
              })}>
                <pre className="p-4 text-sm overflow-x-auto">
                  <code>{generateDockerCommand()}</code>
                </pre>
              </div>
            </div>

            {/* Integration Guide */}
            <div className={clsx('p-6 rounded-xl border', {
              'bg-blue-50 border-blue-200': !isDarkMode,
              'bg-blue-900/20 border-blue-700': isDarkMode
            })}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Quick Integration Guide
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">For GitHub Actions:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Add workflow file to .github/workflows/</li>
                    <li>• Configure your production URL</li>
                    <li>• Set score thresholds</li>
                    <li>• Add secrets if needed</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">For Docker:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Build the Docker image</li>
                    <li>• Set environment variables</li>
                    <li>• Configure cron schedule</li>
                    <li>• Set up monitoring</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="webhooks">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Configuration
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Endpoint URL</label>
                  <input
                    type="url"
                    value={webhookConfig.url}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://your-api.com/webhooks/security"
                    className={clsx('w-full px-3 py-2 rounded border', {
                      'bg-gray-700 border-gray-600 text-white': isDarkMode,
                      'bg-white border-gray-300 text-gray-900': !isDarkMode
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Secret (optional)</label>
                  <input
                    type="password"
                    value={webhookConfig.secret}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, secret: e.target.value }))}
                    placeholder="webhook_secret_key"
                    className={clsx('w-full px-3 py-2 rounded border', {
                      'bg-gray-700 border-gray-600 text-white': isDarkMode,
                      'bg-white border-gray-300 text-gray-900': !isDarkMode
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Events</label>
                  <div className="space-y-2">
                    {['analysis_completed', 'score_improved', 'score_degraded', 'critical_issue_found'].map(event => (
                      <div key={event} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={event}
                          checked={webhookConfig.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWebhookConfig(prev => ({
                                ...prev,
                                events: [...prev.events, event]
                              }));
                            } else {
                              setWebhookConfig(prev => ({
                                ...prev,
                                events: prev.events.filter(e => e !== event)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <label htmlFor={event} className="text-sm">{event.replace('_', ' ')}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="active"
                    checked={webhookConfig.active}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, active: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="active" className="text-sm font-medium">Active</label>
                </div>

                <button
                  onClick={testWebhook}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Test Webhook
                </button>
              </div>
            </div>

            {/* Payload Example */}
            <div className={clsx('p-6 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Payload Example
                </h3>
                <button
                  onClick={() => copyToClipboard(generateWebhookExample(), 'Webhook payload example')}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>

              <div className={clsx('rounded-lg border overflow-hidden', {
                'bg-gray-900 border-gray-600': isDarkMode,
                'bg-gray-50 border-gray-200': !isDarkMode
              })}>
                <pre className="p-4 text-sm overflow-x-auto">
                  <code>{generateWebhookExample()}</code>
                </pre>
              </div>

              <div className="mt-4 space-y-3">
                <h4 className="font-medium">Security Headers:</h4>
                <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    <code>X-Webhook-Signature</code> - HMAC signature (if secret provided)
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3" />
                    <code>User-Agent</code> - Security Headers Analyzer/1.0
                  </div>
                  <div className="flex items-center gap-2">
                    <Code className="h-3 w-3" />
                    <code>Content-Type</code> - application/json
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}