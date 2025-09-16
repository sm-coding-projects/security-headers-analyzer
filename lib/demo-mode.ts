import { AnalysisResult, Recommendation } from '@/types/security'

export interface DemoSite {
  id: string
  name: string
  url: string
  description: string
  category: 'good' | 'poor' | 'mixed'
  expectedScore: number
  mockHeaders: Record<string, string>
  commonIssues: string[]
}

export interface TourStep {
  id: string
  target: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  spotlightPadding?: number
}

export const demoSites: DemoSite[] = [
  {
    id: 'secure-bank',
    name: 'SecureBank Demo',
    url: 'https://demo-secure-bank.example.com',
    description: 'Well-configured financial services site with excellent security headers',
    category: 'good',
    expectedScore: 95,
    mockHeaders: {
      'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
      'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';",
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'x-xss-protection': '1; mode=block'
    },
    commonIssues: []
  },
  {
    id: 'vulnerable-store',
    name: 'VulnerableStore Demo',
    url: 'https://demo-vulnerable-store.example.com',
    description: 'E-commerce site with multiple security header issues',
    category: 'poor',
    expectedScore: 35,
    mockHeaders: {
      'x-powered-by': 'Express',
      'server': 'nginx/1.18.0'
    },
    commonIssues: [
      'Missing HSTS header',
      'No Content Security Policy',
      'Missing X-Frame-Options',
      'Information disclosure via Server header',
      'Missing X-Content-Type-Options'
    ]
  },
  {
    id: 'partial-blog',
    name: 'PartialBlog Demo',
    url: 'https://demo-partial-blog.example.com',
    description: 'Blog site with some security headers but room for improvement',
    category: 'mixed',
    expectedScore: 68,
    mockHeaders: {
      'x-frame-options': 'SAMEORIGIN',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
      'referrer-policy': 'same-origin'
    },
    commonIssues: [
      'Missing HSTS header',
      'Content Security Policy too permissive',
      'Missing Permissions Policy'
    ]
  },
  {
    id: 'corporate-site',
    name: 'CorporateSite Demo',
    url: 'https://demo-corporate.example.com',
    description: 'Corporate website with basic security configuration',
    category: 'mixed',
    expectedScore: 72,
    mockHeaders: {
      'strict-transport-security': 'max-age=31536000',
      'x-frame-options': 'SAMEORIGIN',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval'"
    },
    commonIssues: [
      'CSP allows unsafe-inline and unsafe-eval',
      'HSTS missing includeSubDomains',
      'Missing Permissions Policy'
    ]
  }
]

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Welcome to Security Headers Analyzer!',
    content: 'Let\'s take a quick tour to show you how to analyze and improve your website\'s security headers.',
    placement: 'bottom'
  },
  {
    id: 'url-input',
    target: '[data-tour="url-input"]',
    title: 'Enter Your Website URL',
    content: 'Start by entering your website URL here. We\'ll analyze all the security headers and provide a comprehensive report.',
    placement: 'bottom',
    spotlightPadding: 8
  },
  {
    id: 'demo-buttons',
    target: '[data-tour="demo-buttons"]',
    title: 'Try Demo Sites',
    content: 'Not ready to analyze your own site? Click these buttons to see how different types of websites score.',
    placement: 'top'
  },
  {
    id: 'analyze-button',
    target: '[data-tour="analyze-button"]',
    title: 'Run the Analysis',
    content: 'Click this button to start the security analysis. We\'ll check 15+ security headers and provide detailed recommendations.',
    placement: 'top'
  },
  {
    id: 'results-section',
    target: '[data-tour="results"]',
    title: 'Review Your Results',
    content: 'After analysis, you\'ll see your security score, detected headers, and specific recommendations for improvement.',
    placement: 'top'
  },
  {
    id: 'github-integration',
    target: '[data-tour="github-pr"]',
    title: 'GitHub Integration',
    content: 'Our most powerful feature! We can automatically create a GitHub PR with the exact code changes needed to fix security issues.',
    placement: 'top'
  },
  {
    id: 'export-options',
    target: '[data-tour="export"]',
    title: 'Export & Share',
    content: 'Export your analysis results as PDF, JSON, or CSV to share with your team or include in documentation.',
    placement: 'left'
  }
]

export class DemoModeManager {
  private static instance: DemoModeManager
  private isDemo = false
  private currentDemoSite: DemoSite | null = null

  static getInstance(): DemoModeManager {
    if (!DemoModeManager.instance) {
      DemoModeManager.instance = new DemoModeManager()
    }
    return DemoModeManager.instance
  }

  enableDemo(siteId: string): DemoSite | null {
    const site = demoSites.find(s => s.id === siteId)
    if (site) {
      this.isDemo = true
      this.currentDemoSite = site
      return site
    }
    return null
  }

  disableDemo(): void {
    this.isDemo = false
    this.currentDemoSite = null
  }

  isDemoMode(): boolean {
    return this.isDemo
  }

  getCurrentDemoSite(): DemoSite | null {
    return this.currentDemoSite
  }

  generateMockAnalysis(siteId: string): AnalysisResult | null {
    const site = demoSites.find(s => s.id === siteId)
    if (!site) return null

    const mockResult: AnalysisResult = {
      url: site.url,
      score: site.expectedScore,
      grade: this.getGrade(site.expectedScore),
      headers: {
        found: [],
        missing: [],
        misconfigured: []
      },
      recommendations: this.generateMockRecommendations(site),
      fixes: {
        nginx: '',
        apache: '',
        expressjs: '',
        nextjs: '',
        cloudflare: ''
      },
      timestamp: new Date().toISOString()
    }

    return mockResult
  }

  private getGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  private generateMockHeaderAnalysis(site: DemoSite): any {
    const baseAnalysis: any = {
      strictTransportSecurity: {
        present: !!site.mockHeaders['strict-transport-security'],
        value: site.mockHeaders['strict-transport-security'] || null,
        score: site.mockHeaders['strict-transport-security'] ? 85 : 0,
        recommendation: site.mockHeaders['strict-transport-security']
          ? 'HSTS header is properly configured'
          : 'Add HSTS header to enforce HTTPS connections'
      },
      contentSecurityPolicy: {
        present: !!site.mockHeaders['content-security-policy'],
        value: site.mockHeaders['content-security-policy'] || null,
        score: site.mockHeaders['content-security-policy'] ? 75 : 0,
        recommendation: site.mockHeaders['content-security-policy']
          ? 'CSP header is present but could be more restrictive'
          : 'Implement Content Security Policy to prevent XSS attacks'
      },
      xFrameOptions: {
        present: !!site.mockHeaders['x-frame-options'],
        value: site.mockHeaders['x-frame-options'] || null,
        score: site.mockHeaders['x-frame-options'] ? 80 : 0,
        recommendation: site.mockHeaders['x-frame-options']
          ? 'X-Frame-Options header properly configured'
          : 'Add X-Frame-Options header to prevent clickjacking'
      },
      xContentTypeOptions: {
        present: !!site.mockHeaders['x-content-type-options'],
        value: site.mockHeaders['x-content-type-options'] || null,
        score: site.mockHeaders['x-content-type-options'] ? 90 : 0,
        recommendation: site.mockHeaders['x-content-type-options']
          ? 'X-Content-Type-Options header properly set'
          : 'Add X-Content-Type-Options: nosniff to prevent MIME sniffing'
      },
      referrerPolicy: {
        present: !!site.mockHeaders['referrer-policy'],
        value: site.mockHeaders['referrer-policy'] || null,
        score: site.mockHeaders['referrer-policy'] ? 85 : 0,
        recommendation: site.mockHeaders['referrer-policy']
          ? 'Referrer-Policy header configured'
          : 'Add Referrer-Policy header to control referrer information'
      }
    }

    return baseAnalysis
  }

  private generateMockRecommendations(site: DemoSite): Recommendation[] {
    const recommendations: Recommendation[] = []

    if (!site.mockHeaders['strict-transport-security']) {
      recommendations.push({
        header: 'Strict-Transport-Security',
        severity: 'high',
        issue: 'HSTS header is missing',
        solution: 'Implement HTTP Strict Transport Security (HSTS)',
        priority: 1
      })
    }

    if (!site.mockHeaders['content-security-policy']) {
      recommendations.push({
        header: 'Content-Security-Policy',
        severity: 'high',
        issue: 'CSP header is missing',
        solution: 'Add Content Security Policy (CSP) header',
        priority: 2
      })
    }

    if (!site.mockHeaders['x-frame-options']) {
      recommendations.push({
        header: 'X-Frame-Options',
        severity: 'medium',
        issue: 'X-Frame-Options header is missing',
        solution: 'Configure X-Frame-Options header',
        priority: 3
      })
    }

    if (site.commonIssues.length > 0) {
      site.commonIssues.forEach((issue, index) => {
        recommendations.push({
          header: 'General',
          severity: 'medium',
          issue: issue,
          solution: `Fix: ${issue}`,
          priority: 4 + index
        })
      })
    }

    return recommendations
  }

  simulateGitHubPR(_analysis: AnalysisResult): Promise<{ prUrl: string; prNumber: number }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const prNumber = Math.floor(Math.random() * 1000) + 1
        resolve({
          prUrl: `https://github.com/demo-user/demo-repo/pull/${prNumber}`,
          prNumber
        })
      }, 2000) // Simulate API call delay
    })
  }

  getRandomTestimonial(): { name: string; role: string; quote: string } {
    const testimonials = [
      {
        name: 'Alex Thompson',
        role: 'Senior Developer',
        quote: 'This demo showed me exactly what our site was missing. Fixed 5 critical security headers in one afternoon!'
      },
      {
        name: 'Maria Garcia',
        role: 'Security Engineer',
        quote: 'The automated PR creation saved us hours of manual work. Our security score improved from 45 to 92!'
      },
      {
        name: 'James Liu',
        role: 'DevOps Lead',
        quote: 'Perfect tool for security audits. The detailed explanations help our team understand the why behind each recommendation.'
      }
    ]

    return testimonials[Math.floor(Math.random() * testimonials.length)]
  }
}

export const demoMode = DemoModeManager.getInstance()