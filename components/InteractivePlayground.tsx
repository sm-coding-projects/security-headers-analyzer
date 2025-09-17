'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Copy, Download, AlertCircle, CheckCircle, Code, Eye, EyeOff, Zap, Globe } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { SecurityHeaderAnalyzer } from '@/lib/security-headers';

interface PlaygroundProps {
  isDarkMode?: boolean;
}

interface CSPDirective {
  name: string;
  sources: string[];
  enabled: boolean;
}

interface HSTSConfig {
  maxAge: number;
  includeSubDomains: boolean;
  preload: boolean;
}

interface PermissionsPolicyDirective {
  feature: string;
  allowlist: string[];
  enabled: boolean;
}

const DEFAULT_CSP_DIRECTIVES: CSPDirective[] = [
  { name: 'default-src', sources: ["'self'"], enabled: true },
  { name: 'script-src', sources: ["'self'"], enabled: true },
  { name: 'style-src', sources: ["'self'", "'unsafe-inline'"], enabled: true },
  { name: 'img-src', sources: ["'self'", 'data:', 'https:'], enabled: true },
  { name: 'font-src', sources: ["'self'", 'https:'], enabled: true },
  { name: 'connect-src', sources: ["'self'"], enabled: true },
  { name: 'frame-src', sources: ["'none'"], enabled: false },
  { name: 'object-src', sources: ["'none'"], enabled: false },
  { name: 'base-uri', sources: ["'self'"], enabled: false },
  { name: 'form-action', sources: ["'self'"], enabled: false }
];

const PERMISSIONS_FEATURES = [
  'geolocation', 'microphone', 'camera', 'gyroscope', 'magnetometer',
  'accelerometer', 'payment', 'usb', 'fullscreen', 'display-capture',
  'screen-wake-lock', 'web-share', 'clipboard-read', 'clipboard-write'
];

export default function InteractivePlayground({ isDarkMode = false }: PlaygroundProps) {
  const [activeTab, setActiveTab] = useState('csp');
  const [cspDirectives, setCspDirectives] = useState<CSPDirective[]>(DEFAULT_CSP_DIRECTIVES);
  const analyzer = new SecurityHeaderAnalyzer();
  const [hstsConfig, setHstsConfig] = useState<HSTSConfig>({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  });
  const [permissionsPolicy, setPermissionsPolicy] = useState<PermissionsPolicyDirective[]>(
    PERMISSIONS_FEATURES.map(feature => ({
      feature,
      allowlist: [],
      enabled: false
    }))
  );
  const [testUrl, setTestUrl] = useState('https://example.com');
  const [testResults, setTestResults] = useState<{ csp?: { policy: string; score: number; issues: string[]; recommendations: string[] }; hsts?: { header: string; score: number; preloadEligible: boolean }; permissions?: { header: string; score: number; restrictedFeatures: number } } | null>(null);
  const [isTestingHeaders, setIsTestingHeaders] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const generateCSPPolicy = useCallback(() => {
    const enabledDirectives = cspDirectives.filter(directive => directive.enabled);
    return enabledDirectives
      .map(directive => `${directive.name} ${directive.sources.join(' ')}`)
      .join('; ');
  }, [cspDirectives]);

  const generateHSTSHeader = useCallback(() => {
    const parts = [`max-age=${hstsConfig.maxAge}`];
    if (hstsConfig.includeSubDomains) parts.push('includeSubDomains');
    if (hstsConfig.preload) parts.push('preload');
    return parts.join('; ');
  }, [hstsConfig]);

  const generatePermissionsPolicyHeader = useCallback(() => {
    const enabledPolicies = permissionsPolicy.filter(policy => policy.enabled);
    if (enabledPolicies.length === 0) return '';

    return enabledPolicies
      .map(policy => {
        const allowlist = policy.allowlist.length > 0
          ? `(${policy.allowlist.join(' ')})`
          : '()';
        return `${policy.feature}=${allowlist}`;
      })
      .join(', ');
  }, [permissionsPolicy]);

  const updateCSPDirective = (index: number, field: keyof CSPDirective, value: string | string[] | boolean) => {
    setCspDirectives(prev => prev.map((directive, i) =>
      i === index ? { ...directive, [field]: value } : directive
    ));
  };

  const addCSPSource = (index: number, source: string) => {
    if (!source.trim()) return;

    setCspDirectives(prev => prev.map((directive, i) =>
      i === index
        ? { ...directive, sources: [...directive.sources, source.trim()] }
        : directive
    ));
  };

  const removeCSPSource = (directiveIndex: number, sourceIndex: number) => {
    setCspDirectives(prev => prev.map((directive, i) =>
      i === directiveIndex
        ? { ...directive, sources: directive.sources.filter((_, j) => j !== sourceIndex) }
        : directive
    ));
  };

  const updatePermissionPolicy = (index: number, field: keyof PermissionsPolicyDirective, value: string | string[] | boolean) => {
    setPermissionsPolicy(prev => prev.map((policy, i) =>
      i === index ? { ...policy, [field]: value } : policy
    ));
  };

  const addPermissionAllowlist = (index: number, origin: string) => {
    if (!origin.trim()) return;

    setPermissionsPolicy(prev => prev.map((policy, i) =>
      i === index
        ? { ...policy, allowlist: [...policy.allowlist, origin.trim()] }
        : policy
    ));
  };

  const testHeaders = async () => {
    setIsTestingHeaders(true);

    try {
      const cspPolicy = generateCSPPolicy();
      const hstsHeader = generateHSTSHeader();
      const permissionsHeader = generatePermissionsPolicyHeader();

      // Use real validation functions from the security analyzer
      const cspValidation = analyzer.validateCSP(cspPolicy);
      const hstsValidation = analyzer.checkHSTSPreload(hstsHeader);

      const results = {
        csp: {
          policy: cspPolicy,
          score: calculateCSPScore(cspPolicy),
          issues: cspValidation.issues,
          recommendations: cspValidation.issues.map(issue => `Fix: ${issue}`)
        },
        hsts: {
          header: hstsHeader,
          score: calculateHSTSScore(hstsConfig),
          preloadEligible: hstsValidation.isEligible
        },
        permissions: {
          header: permissionsHeader,
          score: permissionsHeader ? Math.max(60, 60 + (permissionsPolicy.filter(p => p.enabled).length * 5)) : 0,
          restrictedFeatures: permissionsPolicy.filter(p => p.enabled).length
        }
      };

      setTestResults(results);
      toast.success('Header testing completed!');
    } catch (error) {
      console.error('Header testing error:', error);
      toast.error('Failed to test headers');
    } finally {
      setIsTestingHeaders(false);
    }
  };

  const calculateCSPScore = (policy: string): number => {
    if (!policy) return 0;

    let score = 60; // Base score for having CSP

    // Bonus for specific directives
    if (policy.includes('default-src')) score += 10;
    if (policy.includes('script-src') && !policy.includes("'unsafe-inline'")) score += 15;
    if (policy.includes('object-src') && policy.includes("'none'")) score += 10;
    if (policy.includes('base-uri')) score += 5;

    // Penalty for unsafe directives
    if (policy.includes("'unsafe-inline'")) score -= 10;
    if (policy.includes("'unsafe-eval'")) score -= 15;

    return Math.min(100, Math.max(0, score));
  };

  const calculateHSTSScore = (config: HSTSConfig): number => {
    let score = 40; // Base score for having HSTS

    if (config.maxAge >= 31536000) score += 30; // 1 year minimum
    if (config.includeSubDomains) score += 20;
    if (config.preload) score += 10;

    return score;
  };

  const _analyzeCSPPolicy = (policy: string): string[] => {
    const issues: string[] = [];

    if (!policy.includes('default-src')) {
      issues.push('Missing default-src directive (required as fallback)');
    }

    if (policy.includes("'unsafe-inline'")) {
      issues.push("Using 'unsafe-inline' reduces XSS protection");
    }

    if (policy.includes("'unsafe-eval'")) {
      issues.push("Using 'unsafe-eval' allows eval() and reduces security");
    }

    if (policy.includes('*')) {
      issues.push('Wildcard (*) sources reduce security effectiveness');
    }

    return issues;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const exportConfiguration = () => {
    const config = {
      contentSecurityPolicy: generateCSPPolicy(),
      strictTransportSecurity: generateHSTSHeader(),
      permissionsPolicy: generatePermissionsPolicyHeader(),
      generatedAt: new Date().toISOString(),
      testUrl,
      testResults
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-headers-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Configuration exported!');
  };

  const checkHSTSPreload = () => {
    if (hstsConfig.maxAge >= 31536000 && hstsConfig.includeSubDomains && hstsConfig.preload) {
      window.open('https://hstspreload.org/', '_blank');
    } else {
      toast.error('HSTS configuration does not meet preload requirements');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Interactive Security Playground</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Build and test security headers with live preview and validation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={clsx('px-3 py-2 rounded-lg border transition-colors flex items-center gap-2', {
              'bg-gray-800 border-gray-600 hover:bg-gray-700': isDarkMode,
              'bg-white border-gray-300 hover:bg-gray-50': !isDarkMode
            })}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>

          <button
            onClick={exportConfiguration}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
              <Tabs.Trigger
                value="csp"
                className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
                  'border-blue-500 text-blue-600': activeTab === 'csp',
                  'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'csp' && !isDarkMode,
                  'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'csp' && isDarkMode,
                })}
              >
                CSP Builder
              </Tabs.Trigger>
              <Tabs.Trigger
                value="hsts"
                className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
                  'border-blue-500 text-blue-600': activeTab === 'hsts',
                  'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'hsts' && !isDarkMode,
                  'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'hsts' && isDarkMode,
                })}
              >
                HSTS Config
              </Tabs.Trigger>
              <Tabs.Trigger
                value="permissions"
                className={clsx('px-4 py-2 font-medium text-sm border-b-2 transition-colors', {
                  'border-blue-500 text-blue-600': activeTab === 'permissions',
                  'border-transparent text-gray-500 hover:text-gray-700': activeTab !== 'permissions' && !isDarkMode,
                  'border-transparent text-gray-400 hover:text-gray-200': activeTab !== 'permissions' && isDarkMode,
                })}
              >
                Permissions Policy
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="csp">
              <div className={clsx('p-6 rounded-xl border', {
                'bg-gray-800 border-gray-700': isDarkMode,
                'bg-white border-gray-200': !isDarkMode
              })}>
                <h3 className="text-lg font-semibold mb-4">Content Security Policy Builder</h3>

                <div className="space-y-4">
                  {cspDirectives.map((directive, index) => (
                    <motion.div
                      key={directive.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={clsx('p-4 rounded-lg border', {
                        'bg-gray-700 border-gray-600': isDarkMode,
                        'bg-gray-50 border-gray-200': !isDarkMode
                      })}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={directive.enabled}
                            onChange={(e) => updateCSPDirective(index, 'enabled', e.target.checked)}
                            className="rounded"
                          />
                          <label className="font-medium">{directive.name}</label>
                        </div>
                      </div>

                      {directive.enabled && (
                        <div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {directive.sources.map((source, sourceIndex) => (
                              <span
                                key={sourceIndex}
                                className={clsx('px-2 py-1 rounded text-sm flex items-center gap-1', {
                                  'bg-blue-100 text-blue-800': !isDarkMode,
                                  'bg-blue-900 text-blue-200': isDarkMode
                                })}
                              >
                                {source}
                                <button
                                  onClick={() => removeCSPSource(index, sourceIndex)}
                                  className="ml-1 text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add source (e.g., 'self', https://example.com)"
                              className={clsx('flex-1 px-3 py-1 rounded border text-sm', {
                                'bg-gray-600 border-gray-500 text-white': isDarkMode,
                                'bg-white border-gray-300 text-gray-900': !isDarkMode
                              })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addCSPSource(index, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const input = document.querySelector(`input[placeholder*="Add source"]`) as HTMLInputElement;
                                if (input) {
                                  addCSPSource(index, input.value);
                                  input.value = '';
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="hsts">
              <div className={clsx('p-6 rounded-xl border', {
                'bg-gray-800 border-gray-700': isDarkMode,
                'bg-white border-gray-200': !isDarkMode
              })}>
                <h3 className="text-lg font-semibold mb-4">HTTP Strict Transport Security Configuration</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Age (seconds)</label>
                    <input
                      type="number"
                      value={hstsConfig.maxAge}
                      onChange={(e) => setHstsConfig(prev => ({ ...prev, maxAge: parseInt(e.target.value) || 0 }))}
                      className={clsx('w-full px-3 py-2 rounded border', {
                        'bg-gray-700 border-gray-600 text-white': isDarkMode,
                        'bg-white border-gray-300 text-gray-900': !isDarkMode
                      })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: 31536000 (1 year) or higher
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeSubDomains"
                      checked={hstsConfig.includeSubDomains}
                      onChange={(e) => setHstsConfig(prev => ({ ...prev, includeSubDomains: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="includeSubDomains" className="font-medium">Include Subdomains</label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="preload"
                      checked={hstsConfig.preload}
                      onChange={(e) => setHstsConfig(prev => ({ ...prev, preload: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="preload" className="font-medium">Preload</label>
                  </div>

                  <div className={clsx('p-4 rounded-lg', {
                    'bg-green-100 border border-green-200': hstsConfig.maxAge >= 31536000 && hstsConfig.includeSubDomains && hstsConfig.preload && !isDarkMode,
                    'bg-green-900/20 border border-green-700': hstsConfig.maxAge >= 31536000 && hstsConfig.includeSubDomains && hstsConfig.preload && isDarkMode,
                    'bg-yellow-100 border border-yellow-200': !(hstsConfig.maxAge >= 31536000 && hstsConfig.includeSubDomains && hstsConfig.preload) && !isDarkMode,
                    'bg-yellow-900/20 border border-yellow-700': !(hstsConfig.maxAge >= 31536000 && hstsConfig.includeSubDomains && hstsConfig.preload) && isDarkMode,
                  })}>
                    <div className="flex items-center gap-2">
                      {hstsConfig.maxAge >= 31536000 && hstsConfig.includeSubDomains && hstsConfig.preload ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      <span className="font-medium">
                        {hstsConfig.maxAge >= 31536000 && hstsConfig.includeSubDomains && hstsConfig.preload
                          ? 'Eligible for HSTS Preload List'
                          : 'Not eligible for HSTS Preload List'
                        }
                      </span>
                    </div>
                    {hstsConfig.maxAge >= 31536000 && hstsConfig.includeSubDomains && hstsConfig.preload && (
                      <button
                        onClick={checkHSTSPreload}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Globe className="h-4 w-4" />
                        Submit to HSTS Preload List
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="permissions">
              <div className={clsx('p-6 rounded-xl border', {
                'bg-gray-800 border-gray-700': isDarkMode,
                'bg-white border-gray-200': !isDarkMode
              })}>
                <h3 className="text-lg font-semibold mb-4">Permissions Policy Generator</h3>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {permissionsPolicy.map((policy, index) => (
                    <div
                      key={policy.feature}
                      className={clsx('p-3 rounded-lg border', {
                        'bg-gray-700 border-gray-600': isDarkMode,
                        'bg-gray-50 border-gray-200': !isDarkMode
                      })}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={policy.enabled}
                            onChange={(e) => updatePermissionPolicy(index, 'enabled', e.target.checked)}
                            className="rounded"
                          />
                          <label className="font-medium">{policy.feature}</label>
                        </div>
                      </div>

                      {policy.enabled && (
                        <div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {policy.allowlist.map((origin, originIndex) => (
                              <span
                                key={originIndex}
                                className={clsx('px-2 py-1 rounded text-sm flex items-center gap-1', {
                                  'bg-green-100 text-green-800': !isDarkMode,
                                  'bg-green-900 text-green-200': isDarkMode
                                })}
                              >
                                {origin}
                                <button
                                  onClick={() => {
                                    setPermissionsPolicy(prev => prev.map((p, i) =>
                                      i === index
                                        ? { ...p, allowlist: p.allowlist.filter((_, j) => j !== originIndex) }
                                        : p
                                    ));
                                  }}
                                  className="ml-1 text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add origin (e.g., 'self', https://example.com)"
                              className={clsx('flex-1 px-2 py-1 rounded border text-sm', {
                                'bg-gray-600 border-gray-500 text-white': isDarkMode,
                                'bg-white border-gray-300 text-gray-900': !isDarkMode
                              })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addPermissionAllowlist(index, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </div>

        {/* Preview and Test Panel */}
        <div className="space-y-6">
          {/* Live Preview */}
          {showPreview && (
            <div className={clsx('p-4 rounded-xl border', {
              'bg-gray-800 border-gray-700': isDarkMode,
              'bg-white border-gray-200': !isDarkMode
            })}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Code className="h-4 w-4" />
                Live Preview
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Content-Security-Policy</span>
                    <button
                      onClick={() => copyToClipboard(generateCSPPolicy(), 'CSP policy')}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <pre className={clsx('text-xs p-2 rounded overflow-x-auto', {
                    'bg-gray-700 text-gray-200': isDarkMode,
                    'bg-gray-100 text-gray-800': !isDarkMode
                  })}>
                    {generateCSPPolicy() || 'No CSP policy configured'}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Strict-Transport-Security</span>
                    <button
                      onClick={() => copyToClipboard(generateHSTSHeader(), 'HSTS header')}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <pre className={clsx('text-xs p-2 rounded', {
                    'bg-gray-700 text-gray-200': isDarkMode,
                    'bg-gray-100 text-gray-800': !isDarkMode
                  })}>
                    {generateHSTSHeader()}
                  </pre>
                </div>

                {generatePermissionsPolicyHeader() && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Permissions-Policy</span>
                      <button
                        onClick={() => copyToClipboard(generatePermissionsPolicyHeader(), 'Permissions Policy')}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <pre className={clsx('text-xs p-2 rounded overflow-x-auto', {
                      'bg-gray-700 text-gray-200': isDarkMode,
                      'bg-gray-100 text-gray-800': !isDarkMode
                    })}>
                      {generatePermissionsPolicyHeader()}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Headers */}
          <div className={clsx('p-4 rounded-xl border', {
            'bg-gray-800 border-gray-700': isDarkMode,
            'bg-white border-gray-200': !isDarkMode
          })}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Test Headers
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Test URL</label>
                <input
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://example.com"
                  className={clsx('w-full px-3 py-2 rounded border', {
                    'bg-gray-700 border-gray-600 text-white': isDarkMode,
                    'bg-white border-gray-300 text-gray-900': !isDarkMode
                  })}
                />
              </div>

              <button
                onClick={testHeaders}
                disabled={isTestingHeaders}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isTestingHeaders ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Test Configuration
                  </>
                )}
              </button>

              {testResults && (
                <div className="space-y-3 mt-4">
                  <div className={clsx('p-3 rounded-lg', {
                    'bg-gray-700': isDarkMode,
                    'bg-gray-50': !isDarkMode
                  })}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">CSP Score</span>
                      <span className={clsx('font-bold', {
                        'text-green-500': (testResults.csp?.score ?? 0) >= 80,
                        'text-yellow-500': (testResults.csp?.score ?? 0) >= 60,
                        'text-red-500': (testResults.csp?.score ?? 0) < 60
                      })}>
                        {testResults.csp?.score}/100
                      </span>
                    </div>
                    {(testResults.csp?.issues.length ?? 0) > 0 && (
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">
                        {testResults.csp?.issues.map((issue: string, index: number) => (
                          <div key={index} className="flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={clsx('p-3 rounded-lg', {
                    'bg-gray-700': isDarkMode,
                    'bg-gray-50': !isDarkMode
                  })}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">HSTS Score</span>
                      <span className={clsx('font-bold', {
                        'text-green-500': (testResults.hsts?.score ?? 0) >= 80,
                        'text-yellow-500': (testResults.hsts?.score ?? 0) >= 60,
                        'text-red-500': (testResults.hsts?.score ?? 0) < 60
                      })}>
                        {testResults.hsts?.score}/100
                      </span>
                    </div>
                    {testResults.hsts?.preloadEligible && (
                      <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Preload eligible
                      </div>
                    )}
                  </div>

                  {testResults.permissions?.header && (
                    <div className={clsx('p-3 rounded-lg', {
                      'bg-gray-700': isDarkMode,
                      'bg-gray-50': !isDarkMode
                    })}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Permissions Policy</span>
                        <span className="font-bold text-blue-500">
                          {testResults.permissions?.restrictedFeatures} features restricted
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}