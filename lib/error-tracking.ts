interface ErrorContext {
  userId?: string
  sessionId?: string
  userAgent?: string
  url?: string
  timestamp?: string
  additionalData?: Record<string, unknown>
}

interface ErrorEvent {
  id: string
  message: string
  stack?: string
  type: 'javascript' | 'api' | 'network' | 'validation' | 'security'
  severity: 'low' | 'medium' | 'high' | 'critical'
  context: ErrorContext
  fingerprint: string
}

class ErrorTracker {
  private static instance: ErrorTracker
  private errors: ErrorEvent[] = []
  private sessionId: string
  private isEnabled: boolean = true

  constructor() {
    this.sessionId = this.generateSessionId()
    this.setupGlobalErrorHandlers()
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker()
    }
    return ErrorTracker.instance
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        type: 'javascript',
        severity: 'high',
        context: {
          url: event.filename,
          additionalData: {
            line: event.lineno,
            column: event.colno
          }
        }
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        type: 'javascript',
        severity: 'high',
        context: {
          additionalData: {
            promiseRejection: true
          }
        }
      })
    })

    // Handle network errors
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        if (!response.ok) {
          this.captureError(new Error(`HTTP ${response.status}: ${response.statusText}`), {
            type: 'api',
            severity: response.status >= 500 ? 'high' : 'medium',
            context: {
              url: args[0].toString(),
              additionalData: {
                status: response.status,
                method: args[1]?.method || 'GET'
              }
            }
          })
        }
        return response
      } catch (error) {
        this.captureError(error as Error, {
          type: 'network',
          severity: 'high',
          context: {
            url: args[0].toString(),
            additionalData: {
              method: args[1]?.method || 'GET'
            }
          }
        })
        throw error
      }
    }
  }

  captureError(error: Error, options: {
    type?: ErrorEvent['type']
    severity?: ErrorEvent['severity']
    context?: Partial<ErrorContext>
    tags?: Record<string, string>
  } = {}): string {
    if (!this.isEnabled) return ''

    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const fingerprint = this.generateFingerprint(error, options.context)

    const errorEvent: ErrorEvent = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      type: options.type || 'javascript',
      severity: options.severity || 'medium',
      fingerprint,
      context: {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...options.context
      }
    }

    this.errors.push(errorEvent)
    this.persistError(errorEvent)
    this.sendToAnalytics(errorEvent)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Captured: ${errorEvent.type} (${errorEvent.severity})`)
      console.error('Message:', errorEvent.message)
      console.error('Stack:', errorEvent.stack)
      console.error('Context:', errorEvent.context)
      console.groupEnd()
    }

    return errorId
  }

  private generateFingerprint(error: Error, context?: Partial<ErrorContext>): string {
    const key = `${error.name}_${error.message}_${context?.url || 'unknown'}`
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
  }

  private persistError(errorEvent: ErrorEvent): void {
    try {
      const stored = localStorage.getItem('error_events') || '[]'
      const events = JSON.parse(stored)
      events.push(errorEvent)

      // Keep only the last 50 errors
      const trimmed = events.slice(-50)
      localStorage.setItem('error_events', JSON.stringify(trimmed))
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  private async sendToAnalytics(errorEvent: ErrorEvent): Promise<void> {
    try {
      // In a real application, you would send to services like Sentry, LogRocket, etc.
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'exception', {
          description: errorEvent.message,
          fatal: errorEvent.severity === 'critical',
          custom_map: {
            error_id: errorEvent.id,
            error_type: errorEvent.type,
            session_id: errorEvent.context.sessionId || this.sessionId
          }
        })
      }

      // Send error to API endpoint for logging
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorEvent)
      }).catch(() => {
        // Silently fail to avoid recursive errors
      })
    } catch {
      // Silently fail to avoid recursive errors
    }
  }

  getErrors(): ErrorEvent[] {
    return [...this.errors]
  }

  getErrorsByType(type: ErrorEvent['type']): ErrorEvent[] {
    return this.errors.filter(error => error.type === type)
  }

  getErrorsBySeverity(severity: ErrorEvent['severity']): ErrorEvent[] {
    return this.errors.filter(error => error.severity === severity)
  }

  clearErrors(): void {
    this.errors = []
    try {
      localStorage.removeItem('error_events')
    } catch {
      // Silently fail
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  // User feedback for errors
  submitUserFeedback(errorId: string, feedback: {
    description: string
    reproductionSteps?: string
    severity?: 'low' | 'medium' | 'high'
    email?: string
  }): void {
    try {
      fetch('/api/error-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          feedback,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {
        // Silently fail
      })
    } catch {
      // Silently fail
    }
  }
}

export const errorTracker = ErrorTracker.getInstance()

// Utility functions for common error scenarios
export const captureApiError = (error: Error, endpoint: string, method = 'GET') => {
  return errorTracker.captureError(error, {
    type: 'api',
    severity: 'high',
    context: {
      additionalData: {
        endpoint,
        method
      }
    }
  })
}

export const captureValidationError = (error: Error, field: string, value?: unknown) => {
  return errorTracker.captureError(error, {
    type: 'validation',
    severity: 'low',
    context: {
      additionalData: {
        field,
        value: typeof value === 'string' ? value : JSON.stringify(value)
      }
    }
  })
}

export const captureSecurityError = (error: Error, context: Record<string, unknown>) => {
  return errorTracker.captureError(error, {
    type: 'security',
    severity: 'critical',
    context
  })
}

// React Error Boundary helper
export class ErrorBoundary extends Error {
  constructor(message: string, public componentStack?: string) {
    super(message)
    this.name = 'ErrorBoundary'
  }
}

export const captureComponentError = (error: Error, componentStack: string) => {
  return errorTracker.captureError(new ErrorBoundary(error.message, componentStack), {
    type: 'javascript',
    severity: 'high',
    context: {
      additionalData: {
        componentStack
      }
    }
  })
}