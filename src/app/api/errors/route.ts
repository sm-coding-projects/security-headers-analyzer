import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // In a real app, you'd send this to a logging service like Sentry, LogRocket, etc.
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Error tracked:', {
        timestamp: new Date().toISOString(),
        ...body
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error tracking failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to track errors.' },
    { status: 405 }
  );
}