import { NextRequest, NextResponse } from 'next/server';
import { SecurityHeaderAnalyzer } from '@/lib/security-headers';
import { AnalysisResponse, AnalysisResult } from '@/types/security';
import { InMemoryCache, generateCacheKey } from '@/lib/cache';
import { InMemoryRateLimiter, getClientIdentifier } from '@/lib/rate-limiter';
import { validateAndNormalizeURL, withTimeout } from '@/lib/validation';

const cache = new InMemoryCache<AnalysisResult>({ ttl: 3600000, maxSize: 1000 });
const rateLimiter = new InMemoryRateLimiter({
  windowMs: 60000,
  maxRequests: 10
});

const analyzer = new SecurityHeaderAnalyzer();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let clientId: string;

  try {
    clientId = getClientIdentifier(request);

    const rateLimitResult = rateLimiter.check(clientId);
    if (!rateLimitResult.allowed) {
      const resetInSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);

      const response: AnalysisResponse = {
        success: false,
        error: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
      };

      return NextResponse.json(response, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': resetInSeconds.toString()
        }
      });
    }

    const body = await request.json().catch(() => ({}));
    const { url } = body;

    const validation = validateAndNormalizeURL(url);
    if (!validation.isValid) {
      const response: AnalysisResponse = {
        success: false,
        error: validation.error,
      };
      return NextResponse.json(response, { status: 400 });
    }

    const normalizedUrl = validation.normalizedUrl!;
    const cacheKey = generateCacheKey(normalizedUrl);

    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      const response: AnalysisResponse = {
        success: true,
        data: {
          ...cachedResult,
          cached: true,
          cacheTimestamp: cachedResult.timestamp
        },
      };

      return NextResponse.json(response, {
        status: 200,
        headers: {
          'X-Cache': 'HIT',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }

    const analysis = await withTimeout(
      analyzer.analyzeURL(normalizedUrl),
      10000,
      'Analysis timed out after 10 seconds'
    );

    cache.set(cacheKey, analysis);

    const response: AnalysisResponse = {
      success: true,
      data: analysis,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Cache': 'MISS',
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);

    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'Request timed out. The website took too long to respond.';
        statusCode = 408;
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Website not accessible. Please check the URL and try again.';
        statusCode = 400;
      } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
        errorMessage = 'SSL certificate issue. The website may have an invalid certificate.';
        statusCode = 400;
      } else {
        errorMessage = error.message;
      }
    }

    const response: AnalysisResponse = {
      success: false,
      error: errorMessage,
    };

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to analyze a URL.' },
    { status: 405 }
  );
}