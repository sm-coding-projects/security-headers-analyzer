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
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Security Headers Analyzer
          </h1>
          <p className="text-gray-600">
            Analyze your website&apos;s security headers and get recommendations for improvements
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <div className="relative">
              <input
                type="text"
                id="url"
                value={url}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className={`w-full px-4 py-3 pl-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {error && (
              <div className="mt-2 flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Analyze Security Headers
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleUrls.map((exampleUrl) => (
              <button
                key={exampleUrl}
                onClick={() => setUrl(exampleUrl)}
                disabled={isLoading}
                className="text-sm bg-gray-100 hover:bg-gray-200 disabled:hover:bg-gray-100 disabled:cursor-not-allowed text-gray-700 px-3 py-1 rounded-full transition duration-200"
              >
                {exampleUrl}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="text-center">
              <div className="font-semibold text-gray-900 mb-1">Comprehensive Analysis</div>
              <div>Checks 10+ critical security headers</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 mb-1">Detailed Recommendations</div>
              <div>Get specific fixes for each issue</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 mb-1">Auto-Fix Support</div>
              <div>Generate PRs with configuration files</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}