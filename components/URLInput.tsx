'use client';

import { useState } from 'react';
import { Globe, Search, AlertCircle } from 'lucide-react';
import { validateUrl } from '@/lib/security-headers';

interface URLInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
}

export default function URLInput({ onAnalyze, isLoading }: URLInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    const validation = validateUrl(url.trim());
    if (!validation.isValid) {
      setError(validation.error || 'Invalid URL');
      return;
    }

    onAnalyze(validation.normalizedUrl!);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) {
      setError(null);
    }
  };

  const exampleUrls = [
    'https://example.com',
    'https://github.com',
    'https://stackoverflow.com',
    'https://developer.mozilla.org',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="glass-strong rounded-2xl p-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-cyan-500/10 p-3 rounded-full border border-cyan-500/20">
              <Globe className="h-8 w-8 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            Security Headers Analyzer
          </h1>
          <p className="text-slate-400 text-sm">
            Analyze your website&apos;s security headers and get recommendations for improvements
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Website URL
            </label>
            <div className="relative">
              <input
                type="text"
                id="url"
                value={url}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className={`w-full px-4 py-3 pl-12 rounded-xl border transition-all bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 focus:outline-none ${
                  error ? 'border-red-500/50' : 'border-slate-700/50'
                }`}
                disabled={isLoading}
              />
              <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
            </div>
            {error && (
              <div className="mt-2 flex items-center text-red-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center text-sm"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Analyze Security Headers
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-800/50">
          <p className="text-xs text-slate-600 mb-2.5">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleUrls.map((exampleUrl) => (
              <button
                key={exampleUrl}
                onClick={() => setUrl(exampleUrl)}
                disabled={isLoading}
                className="text-xs bg-slate-800/40 hover:bg-slate-700/50 disabled:hover:bg-slate-800/40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-300 px-3 py-1.5 rounded-lg transition-all border border-slate-700/30"
              >
                {exampleUrl}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-800/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <div className="font-semibold text-slate-300 mb-1">Comprehensive Analysis</div>
              <div className="text-slate-500">Checks 10+ critical security headers</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-slate-300 mb-1">Detailed Recommendations</div>
              <div className="text-slate-500">Get specific fixes for each issue</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-slate-300 mb-1">Auto-Fix Support</div>
              <div className="text-slate-500">Generate PRs with configuration files</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
