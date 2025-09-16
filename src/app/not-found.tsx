import { Search, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-blue-600" />
          </div>

          <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Page Not Found
          </h2>

          <p className="text-gray-600 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track with your security analysis.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Homepage
          </Link>

          <Link
            href="/advanced"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Search className="h-5 w-5 mr-2" />
            Advanced Tools
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Go Back
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Popular Pages</h3>
          <div className="space-y-2 text-sm">
            <Link href="/" className="block text-blue-600 hover:text-blue-700">
              Security Headers Analysis
            </Link>
            <Link href="/advanced" className="block text-blue-600 hover:text-blue-700">
              Advanced Security Tools
            </Link>
            <Link href="/#pricing" className="block text-blue-600 hover:text-blue-700">
              Pricing & Plans
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs text-gray-500">
            Need help? Contact us at{' '}
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