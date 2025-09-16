interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class PerformanceCache {
  private cache = new Map<string, CacheItem<unknown>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    this.cleanup()
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  size(): number {
    return this.cache.size
  }
}

export const cache = new PerformanceCache()

export function memoize<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  getKey?: (...args: Args) => string,
  ttl?: number
): (...args: Args) => Return {
  return (...args: Args): Return => {
    const key = getKey ? getKey(...args) : JSON.stringify(args)

    const cached = cache.get<Return>(key)
    if (cached !== null) {
      return cached
    }

    const result = fn(...args)
    cache.set(key, result, ttl)
    return result
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout

  return (...args: Parameters<T>): void => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export class ImageOptimizer {
  private static readonly FORMATS = ['webp', 'avif', 'jpg', 'png'] as const
  private static readonly SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const

  static generateSrcSet(src: string, format: 'webp' | 'avif' | 'jpg' | 'png' = 'webp'): string {
    return this.SIZES
      .map(size => `${this.optimizeUrl(src, size, format)} ${size}w`)
      .join(', ')
  }

  static optimizeUrl(src: string, width: number, format: string): string {
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return src
    }

    const url = new URL(src, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    url.searchParams.set('w', width.toString())
    url.searchParams.set('f', format)
    url.searchParams.set('q', '75')

    return url.toString()
  }

  static preloadCriticalImages(urls: string[]): void {
    if (typeof window === 'undefined') return

    urls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = url
      document.head.appendChild(link)
    })
  }
}

export class ResourceOptimizer {
  private static preloadedResources = new Set<string>()

  static preloadScript(src: string): void {
    if (typeof window === 'undefined' || this.preloadedResources.has(src)) return

    const link = document.createElement('link')
    link.rel = 'modulepreload'
    link.href = src
    document.head.appendChild(link)
    this.preloadedResources.add(src)
  }

  static preloadStylesheet(href: string): void {
    if (typeof window === 'undefined' || this.preloadedResources.has(href)) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    document.head.appendChild(link)
    this.preloadedResources.add(href)
  }

  static prefetchResource(href: string): void {
    if (typeof window === 'undefined' || this.preloadedResources.has(href)) return

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    document.head.appendChild(link)
    this.preloadedResources.add(href)
  }
}

export function usePerformanceMonitor() {
  if (typeof window === 'undefined') return

  const measurePerformance = (name: string, fn: () => void) => {
    const start = performance.now()
    fn()
    const end = performance.now()
    console.log(`${name} took ${end - start} milliseconds`)
  }

  const logWebVitals = () => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('LCP:', entry.startTime)
          }
          if (entry.entryType === 'first-input') {
            const fidEntry = entry as PerformanceEventTiming
            console.log('FID:', fidEntry.processingStart - fidEntry.startTime)
          }
          if (entry.entryType === 'layout-shift') {
            const clsEntry = entry as PerformanceEntry & { value: number }
            console.log('CLS:', clsEntry.value)
          }
        }
      })

      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
    }
  }

  return { measurePerformance, logWebVitals }
}

export const preloadRoute = (route: string) => {
  if (typeof window === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = route
  document.head.appendChild(link)
}

export const lazyLoadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser environment'))
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}