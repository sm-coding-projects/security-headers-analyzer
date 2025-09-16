'use client'

import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw, Shield, Home } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRefresh = () => {
    if (isOnline) {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
            isOnline ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {isOnline ? (
              <Shield className="h-8 w-8 text-green-600" />
            ) : (
              <WifiOff className="h-8 w-8 text-red-600" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isOnline ? 'Back Online!' : 'You\'re Offline'}
          </h1>

          <p className="text-gray-600 mb-6">
            {isOnline
              ? 'Your internet connection has been restored. You can now refresh to continue using the Security Headers Analyzer.'
              : 'It looks like you\'re not connected to the internet. Some features may be limited while offline.'
            }
          </p>
        </div>

        <div className="space-y-4">
          {isOnline ? (
            <button
              onClick={handleRefresh}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh Page
            </button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-yellow-800 mb-2">Available Offline:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• View cached analysis results</li>
                <li>• Browse security education content</li>
                <li>• Read documentation and guides</li>
                <li>• Access previous reports</li>
              </ul>
            </div>
          )}

          <Link
            href="/"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Homepage
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-1" />
              Security Headers Analyzer
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}