import { NextRequest, NextResponse } from 'next/server';

interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  responseTime?: number;
  status?: number;
  error?: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private logs: RequestLog[] = [];
  private readonly maxLogs = 1000;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  log(requestLog: RequestLog) {
    this.logs.push(requestLog);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    if (requestLog.responseTime && requestLog.responseTime > 5000) {
      console.warn('Slow request detected:', {
        url: requestLog.url,
        responseTime: requestLog.responseTime,
        timestamp: requestLog.timestamp
      });
    }

    if (requestLog.status && requestLog.status >= 500) {
      console.error('Server error:', requestLog);
    }
  }

  getMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;

    const recentLogs = this.logs.filter(log =>
      new Date(log.timestamp).getTime() > oneMinuteAgo
    );

    const last5MinLogs = this.logs.filter(log =>
      new Date(log.timestamp).getTime() > fiveMinutesAgo
    );

    return {
      requestsPerMinute: recentLogs.length,
      requestsLast5Min: last5MinLogs.length,
      averageResponseTime: this.calculateAverageResponseTime(last5MinLogs),
      errorRate: this.calculateErrorRate(last5MinLogs),
      slowRequests: last5MinLogs.filter(log => log.responseTime && log.responseTime > 2000).length
    };
  }

  private calculateAverageResponseTime(logs: RequestLog[]): number {
    const logsWithResponseTime = logs.filter(log => log.responseTime);
    if (logsWithResponseTime.length === 0) return 0;

    const total = logsWithResponseTime.reduce((sum, log) => sum + (log.responseTime || 0), 0);
    return Math.round(total / logsWithResponseTime.length);
  }

  private calculateErrorRate(logs: RequestLog[]): number {
    if (logs.length === 0) return 0;

    const errors = logs.filter(log => log.status && log.status >= 400).length;
    return Math.round((errors / logs.length) * 100);
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIp || remoteAddr || 'unknown';
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.github.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));

  return response;
}

function addCORSHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://security-headers-analyzer.vercel.app',
    process.env.NEXT_PUBLIC_APP_URL
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ].join(', '));

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const monitor = PerformanceMonitor.getInstance();

  const requestLog: RequestLog = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: getClientIP(request)
  };

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return addCORSHeaders(request, addSecurityHeaders(response));
  }

  const response = NextResponse.next();

  const enhancedResponse = addCORSHeaders(request, addSecurityHeaders(response));

  enhancedResponse.headers.set('X-Request-ID', crypto.randomUUID());

  const endTime = Date.now();
  const responseTime = endTime - startTime;

  requestLog.responseTime = responseTime;

  enhancedResponse.headers.set('X-Response-Time', `${responseTime}ms`);

  monitor.log(requestLog);

  if (request.nextUrl.pathname.startsWith('/api/')) {
    console.log(`${request.method} ${request.nextUrl.pathname} - ${responseTime}ms - ${getClientIP(request)}`);
  }

  return enhancedResponse;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export async function GET() {
  const monitor = PerformanceMonitor.getInstance();
  const metrics = monitor.getMetrics();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    metrics
  });
}