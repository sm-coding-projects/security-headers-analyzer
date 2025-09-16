'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export default function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker()
    }

    // Set up online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('You\'re back online!')
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.error('You\'re now offline. Some features may be limited.')
    }

    // Set initial online status
    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      setRegistration(registration)

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true)
              toast.success('App update available! Refresh to get the latest version.', {
                duration: 10000,
                id: 'sw-update'
              })
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          toast.success('App data updated for offline use')
        }
      })

      console.log('Service Worker registered successfully')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  const preloadCriticalResources = () => {
    if (registration && registration.active) {
      const criticalUrls = [
        '/',
        '/api/analyze',
        '/offline',
        '/manifest.json'
      ]

      registration.active.postMessage({
        type: 'CACHE_URLS',
        urls: criticalUrls
      })
    }
  }

  // Preload critical resources when online
  useEffect(() => {
    if (isOnline && registration) {
      preloadCriticalResources()
    }
  }, [isOnline, registration])

  return (
    <>
      {children}

      {/* Online/Offline Status Indicator */}
      <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        isOnline ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}>
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Offline Mode</span>
        </div>
      </div>

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
              <span className="font-medium">
                A new version is available with improvements and bug fixes!
              </span>
            </div>
            <button
              onClick={handleUpdate}
              className="bg-white text-blue-600 px-4 py-1 rounded font-medium hover:bg-blue-50 transition-colors"
            >
              Update Now
            </button>
          </div>
        </div>
      )}
    </>
  )
}