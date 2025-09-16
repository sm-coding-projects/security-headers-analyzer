'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from 'lucide-react';
import { ErrorBoundaryState } from '@/types/security';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'feature';
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, this would send to a monitoring service
    console.error('Error Boundary caught an error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      level: this.props.level || 'component'
    });

    // Send to analytics/monitoring service
    try {
      if (typeof window !== 'undefined') {
        // Example: Send to analytics
        // analytics.track('Error Boundary Triggered', { ... });
      }
    } catch (analyticsError) {
      console.error('Failed to send error to analytics:', analyticsError);
    }
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = async () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
Error: ${error?.name} - ${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}

URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      // You could show a toast notification here
      alert('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  private renderErrorUI() {
    const { error, errorInfo } = this.state;
    const { level = 'component', showDetails = false } = this.props;

    const isPageLevel = level === 'page';
    const isComponentLevel = level === 'component';

    return (
      <div className={`
        flex flex-col items-center justify-center p-8 text-center
        ${isPageLevel ? 'min-h-screen bg-gray-50 dark:bg-gray-900' : 'min-h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'}
      `}>
        <div className="max-w-md w-full space-y-6">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isPageLevel ? 'Something went wrong' : 'Component Error'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {isPageLevel
                ? 'We encountered an unexpected error. Please try refreshing the page.'
                : 'This component encountered an error and could not render properly.'
              }
            </p>
          </div>

          {/* Error Details (if enabled) */}
          {showDetails && error && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                  Error Details
                </h3>
                <button
                  onClick={this.copyErrorDetails}
                  className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  title="Copy error details"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {error.name}:
                  </span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300">
                    {error.message}
                  </span>
                </div>
                {process.env.NODE_ENV === 'development' && error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isComponentLevel && (
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            )}

            {isPageLevel && (
              <>
                <button
                  onClick={this.handleRefresh}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </button>
              </>
            )}

            {/* Report Bug Button (for production) */}
            {process.env.NODE_ENV === 'production' && (
              <button
                onClick={() => {
                  // Open GitHub issues or support form
                  window.open(
                    'https://github.com/your-repo/security-headers-analyzer/issues/new?template=bug_report.md',
                    '_blank'
                  );
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Bug className="h-4 w-4" />
                Report Bug
              </button>
            )}
          </div>

          {/* Development Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Development Mode
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                This error boundary is showing detailed information because you're in development mode.
                In production, users will see a friendlier error message.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Convenience wrapper components
export const PageErrorBoundary: React.FC<{children: ReactNode}> = ({ children }) => (
  <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === 'development'}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{children: ReactNode}> = ({ children }) => (
  <ErrorBoundary level="component">
    {children}
  </ErrorBoundary>
);

export const FeatureErrorBoundary: React.FC<{
  children: ReactNode;
  featureName: string;
}> = ({ children, featureName }) => (
  <ErrorBoundary
    level="feature"
    onError={(error, errorInfo) => {
      console.error(`Error in ${featureName} feature:`, error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

// Hook for handling errors in functional components
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);

    // In a real app, send to monitoring service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  };
};