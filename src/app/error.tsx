'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import Link from 'next/link'
import { errorTracker } from '@/lib/error-tracking'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Capture the error in our tracking system
    errorTracker.captureError(error, {
      type: 'javascript',
      severity: 'high',
      context: {
        digest: error.digest,
        boundary: 'app-error-boundary'
      }
    })
  }, [error])

  const handleReportError = () => {
    const email = 'support@security-headers-analyzer.com'
    const subject = encodeURIComponent('Application Error Report')
    const body = encodeURIComponent(`
Error Message: ${error.message}
Error Digest: ${error.digest || 'N/A'}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}

Please describe what you were doing when this error occurred:


Additional details:
    `.trim())

    window.open(`mailto:${email}?subject=${subject}&body=${body}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h1>

          <p className="text-gray-600 mb-6">
            We&apos;re sorry, but an unexpected error occurred. Our team has been notified and is working to fix this issue.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Error Details (Development Mode)</h3>
              <p className="text-sm text-gray-700 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-gray-500 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={reset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try Again
          </button>

          <Link
            href="/"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Homepage
          </Link>

          <button
            onClick={handleReportError}
            className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Mail className="h-5 w-5 mr-2" />
            Report This Error
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If this problem persists, please contact our support team at{' '}
            <a
              href="mailto:support@security-headers-analyzer.com"
              className="text-blue-600 hover:text-blue-700"
            >
              support@security-headers-analyzer.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}