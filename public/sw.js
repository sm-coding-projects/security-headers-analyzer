const CACHE_NAME = 'security-headers-analyzer-v1'
const OFFLINE_URL = '/offline'

const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico'
]

const API_CACHE_URLS = [
  '/api/analyze',
  '/api/github/create-pr',
  '/api/report/export'
]

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')

  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Caching static assets...')
        return cache.addAll(STATIC_CACHE_URLS)
      }),
      self.skipWaiting()
    ])
  )
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')

  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      self.clients.claim()
    ])
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Return offline page for navigation failures
          return caches.match(OFFLINE_URL)
        })
    )
    return
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      handleAPIRequest(request)
    )
    return
  }

  // Handle static assets
  if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response
        }

        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
      })
    )
    return
  }

  // Default: try network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200 && request.method === 'GET') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(request)
      })
  )
})

async function handleAPIRequest(request) {
  const url = new URL(request.url)

  try {
    // Always try network first for API requests
    const response = await fetch(request)

    // Cache successful GET requests
    if (response.status === 200 && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME)
      const responseClone = response.clone()

      // Add timestamp to cached response
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cached-at': Date.now().toString()
        }
      })

      await cache.put(request, responseWithTimestamp)
    }

    return response
  } catch (error) {
    console.log('Network request failed, trying cache...', error)

    // Try to serve from cache
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at')
      const isStale = cachedAt && (Date.now() - parseInt(cachedAt)) > 5 * 60 * 1000 // 5 minutes

      if (isStale) {
        console.log('Cached response is stale, but serving anyway due to network failure')
      }

      return cachedResponse
    }

    // Return offline response for analyze endpoint
    if (url.pathname === '/api/analyze') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unable to analyze website while offline. Please check your internet connection.',
        offline: true
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        }
      })
    }

    // Return generic offline response
    return new Response(JSON.stringify({
      success: false,
      error: 'Service unavailable while offline',
      offline: true
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      retryFailedRequests()
    )
  }
})

async function retryFailedRequests() {
  // Retrieve failed requests from IndexedDB and retry them
  console.log('Retrying failed requests...')
  // Implementation would depend on storing failed requests
}

// Push notifications (for future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()

    const options = {
      body: data.body || 'Security analysis complete!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      },
      actions: [
        {
          action: 'view',
          title: 'View Results'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Security Headers Analyzer', options)
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    )
  }
})

// Periodic background sync (for future enhancement)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'security-check') {
    event.waitUntil(
      performPeriodicSecurityCheck()
    )
  }
})

async function performPeriodicSecurityCheck() {
  console.log('Performing periodic security check...')
  // Implementation for background security monitoring
}

// Handle updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urls)
      })
    )
  }
})