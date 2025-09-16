import { NextRequest, NextResponse } from 'next/server';
import { analyzeSecurityHeaders } from '@/lib/security-headers';
import { AnalysisResponse } from '@/types/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      const response: AnalysisResponse = {
        success: false,
        error: 'URL is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (typeof url !== 'string') {
      const response: AnalysisResponse = {
        success: false,
        error: 'URL must be a string',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Perform the security headers analysis
    const analysis = await analyzeSecurityHeaders(url);

    const response: AnalysisResponse = {
      success: true,
      data: analysis,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Analysis error:', error);

    const response: AnalysisResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to analyze a URL.' },
    { status: 405 }
  );
}