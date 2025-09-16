import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult } from '@/types/security';
import { InMemoryRateLimiter, getClientIdentifier } from '@/lib/rate-limiter';
import { InMemoryCache, generateCacheKey } from '@/lib/cache';

const rateLimiter = new InMemoryRateLimiter({
  windowMs: 60000,
  maxRequests: 20
});

const cache = new InMemoryCache<Buffer>({ ttl: 300000, maxSize: 100 });

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const clientId = getClientIdentifier(request);

    const rateLimitResult = rateLimiter.check(clientId);
    if (!rateLimitResult.allowed) {
      const resetInSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);

      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.` },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': resetInSeconds.toString()
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format')?.toLowerCase();
    const dataParam = searchParams.get('data');

    if (!format || !['pdf', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be either "pdf" or "json".' },
        { status: 400 }
      );
    }

    if (!dataParam) {
      return NextResponse.json(
        { error: 'Missing analysis data. Provide base64-encoded analysis result in "data" parameter.' },
        { status: 400 }
      );
    }

    let analysisData: AnalysisResult;
    try {
      const decodedData = Buffer.from(dataParam, 'base64').toString('utf-8');
      analysisData = JSON.parse(decodedData);
    } catch {
      return NextResponse.json(
        { error: 'Invalid data format. Unable to parse analysis data.' },
        { status: 400 }
      );
    }

    if (!isValidAnalysisResult(analysisData)) {
      return NextResponse.json(
        { error: 'Invalid analysis data structure.' },
        { status: 400 }
      );
    }

    const cacheKey = generateCacheKey(`export:${format}:${analysisData.url}`, { timestamp: analysisData.timestamp });
    const cachedReport = cache.get(cacheKey);

    if (cachedReport) {
      const filename = generateFilename(analysisData, format);
      const contentType = format === 'pdf' ? 'application/pdf' : 'application/json';

      return new NextResponse(cachedReport as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Cache': 'HIT',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }

    if (format === 'json') {
      const jsonReport = generateJSONReport(analysisData);
      const buffer = Buffer.from(JSON.stringify(jsonReport, null, 2));

      cache.set(cacheKey, buffer);

      const filename = generateFilename(analysisData, 'json');

      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Cache': 'MISS',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }

    if (format === 'pdf') {
      const pdfBuffer = await generatePDFReport(analysisData);

      cache.set(cacheKey, pdfBuffer);

      const filename = generateFilename(analysisData, 'pdf');

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Cache': 'MISS',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }

  } catch (error) {
    console.error('Export error:', error);

    let errorMessage = 'An unexpected error occurred while generating the report';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Report generation timed out. Please try again.';
        statusCode = 408;
      } else if (error.message.includes('memory')) {
        errorMessage = 'Report too large to generate. Please try with a smaller dataset.';
        statusCode = 413;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      {
        status: statusCode,
        headers: {
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      }
    );
  }
}

function isValidAnalysisResult(data: unknown): data is AnalysisResult {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.url === 'string' &&
    typeof obj.score === 'number' &&
    typeof obj.grade === 'string' &&
    typeof obj.headers === 'object' &&
    obj.headers !== null &&
    Array.isArray((obj.headers as Record<string, unknown>).found) &&
    Array.isArray((obj.headers as Record<string, unknown>).missing) &&
    Array.isArray(obj.recommendations) &&
    typeof obj.timestamp === 'string'
  );
}

function generateFilename(data: AnalysisResult, format: string): string {
  const domain = new URL(data.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = new Date(data.timestamp).toISOString().slice(0, 10);
  return `security-headers-${domain}-${timestamp}.${format}`;
}

function generateJSONReport(data: AnalysisResult) {
  return {
    meta: {
      title: 'Security Headers Analysis Report',
      url: data.url,
      generatedAt: new Date().toISOString(),
      analysisDate: data.timestamp,
      framework: data.framework || 'Unknown',
      tool: 'Security Headers Analyzer'
    },
    summary: {
      overallScore: data.score,
      grade: data.grade,
      totalHeaders: data.headers.found.length + data.headers.missing.length,
      foundHeaders: data.headers.found.length,
      missingHeaders: data.headers.missing.length,
      misconfiguredHeaders: data.headers.misconfigured?.length || 0
    },
    headers: {
      found: data.headers.found.map(h => ({
        name: h.name,
        value: h.value,
        score: h.score,
        severity: h.severity,
        description: h.description
      })),
      missing: data.headers.missing.map(h => ({
        name: h.name,
        severity: h.severity,
        description: h.description,
        recommendation: h.recommendation
      })),
      misconfigured: data.headers.misconfigured?.map(h => ({
        name: h.name,
        currentValue: h.value,
        score: h.score,
        severity: h.severity,
        issue: h.recommendation,
        description: h.description
      })) || []
    },
    recommendations: data.recommendations.map(r => ({
      header: r.header,
      severity: r.severity,
      priority: r.priority,
      issue: r.issue,
      solution: r.solution
    })),
    fixes: {
      nginx: data.fixes.nginx,
      apache: data.fixes.apache,
      expressjs: data.fixes.expressjs,
      nextjs: data.fixes.nextjs,
      cloudflare: data.fixes.cloudflare
    }
  };
}

async function generatePDFReport(data: AnalysisResult): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPosition = 20;
  const lineHeight = 7;
  const margin = 20;

  doc.setFontSize(20);
  doc.text('Security Headers Analysis Report', margin, yPosition);
  yPosition += lineHeight * 2;

  doc.setFontSize(12);
  doc.text(`URL: ${data.url}`, margin, yPosition);
  yPosition += lineHeight;

  doc.text(`Analysis Date: ${new Date(data.timestamp).toLocaleString()}`, margin, yPosition);
  yPosition += lineHeight;

  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += lineHeight * 2;

  const scoreColor = getScoreColor(data.score);
  doc.setFontSize(16);
  doc.setTextColor(scoreColor.r, scoreColor.g, scoreColor.b);
  doc.text(`Overall Score: ${data.score}/100 (${data.grade})`, margin, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += lineHeight * 2;

  doc.setFontSize(14);
  doc.text('Summary', margin, yPosition);
  yPosition += lineHeight;

  doc.setFontSize(10);
  doc.text(`• Found Headers: ${data.headers.found.length}`, margin + 5, yPosition);
  yPosition += lineHeight * 0.8;
  doc.text(`• Missing Headers: ${data.headers.missing.length}`, margin + 5, yPosition);
  yPosition += lineHeight * 0.8;
  doc.text(`• Misconfigured Headers: ${data.headers.misconfigured?.length || 0}`, margin + 5, yPosition);
  yPosition += lineHeight * 1.5;

  if (data.headers.missing.length > 0) {
    doc.setFontSize(14);
    doc.text('Missing Headers', margin, yPosition);
    yPosition += lineHeight;

    doc.setFontSize(9);
    data.headers.missing.forEach(header => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`• ${header.name} (${header.severity})`, margin + 5, yPosition);
      yPosition += lineHeight * 0.7;

      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(header.description, pageWidth - margin * 2 - 10);
      descLines.forEach((line: string) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin + 10, yPosition);
        yPosition += lineHeight * 0.6;
      });
      yPosition += lineHeight * 0.3;
    });
  }

  if (data.recommendations.length > 0) {
    yPosition += lineHeight;
    doc.setFontSize(14);
    doc.text('Recommendations', margin, yPosition);
    yPosition += lineHeight;

    doc.setFontSize(9);
    data.recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10)
      .forEach(rec => {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`• ${rec.header} (${rec.severity} priority)`, margin + 5, yPosition);
        yPosition += lineHeight * 0.7;

        doc.setFont('helvetica', 'normal');
        const issueLines = doc.splitTextToSize(`Issue: ${rec.issue}`, pageWidth - margin * 2 - 10);
        issueLines.forEach((line: string) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin + 10, yPosition);
          yPosition += lineHeight * 0.6;
        });

        const solutionLines = doc.splitTextToSize(`Solution: ${rec.solution}`, pageWidth - margin * 2 - 10);
        solutionLines.forEach((line: string) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin + 10, yPosition);
          yPosition += lineHeight * 0.6;
        });
        yPosition += lineHeight * 0.5;
      });
  }

  doc.addPage();
  yPosition = 20;
  doc.setFontSize(14);
  doc.text('Configuration Examples', margin, yPosition);
  yPosition += lineHeight * 1.5;

  if (data.framework) {
    doc.setFontSize(12);
    doc.text(`Detected Framework: ${data.framework}`, margin, yPosition);
    yPosition += lineHeight * 1.5;
  }

  const platforms = ['nginx', 'apache', 'expressjs', 'nextjs'];
  platforms.forEach(platform => {
    if (data.fixes[platform as keyof typeof data.fixes]) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(platform.toUpperCase(), margin, yPosition);
      yPosition += lineHeight;

      doc.setFontSize(8);
      doc.setFont('courier', 'normal');
      const configLines = data.fixes[platform as keyof typeof data.fixes].split('\n');
      configLines.forEach(line => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin + 5, yPosition);
        yPosition += lineHeight * 0.7;
      });
      yPosition += lineHeight;
    }
  });

  return Buffer.from(doc.output('arraybuffer'));
}

function getScoreColor(score: number) {
  if (score >= 80) return { r: 34, g: 197, b: 94 };
  if (score >= 60) return { r: 251, g: 191, b: 36 };
  if (score >= 40) return { r: 249, g: 115, b: 22 };
  return { r: 239, g: 68, b: 68 };
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to export reports.' },
    { status: 405 }
  );
}