import { Metadata } from 'next'

export const siteConfig = {
  name: 'Security Headers Analyzer',
  description: 'Comprehensive security headers analysis tool that helps developers identify and fix security vulnerabilities in web applications. Get instant reports, GitHub PR integration, and actionable recommendations.',
  url: 'https://security-headers-analyzer.vercel.app',
  keywords: [
    'security headers',
    'web security',
    'HTTPS',
    'CSP',
    'HSTS',
    'security analysis',
    'vulnerability scanner',
    'web development',
    'DevSecOps',
    'security audit',
    'security testing',
    'security compliance'
  ],
  authors: [
    {
      name: 'Security Headers Analyzer Team',
      url: 'https://github.com/security-headers-analyzer'
    }
  ],
  creator: 'Security Headers Analyzer Team'
}

export const defaultMetadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Security Headers Analyzer - Comprehensive security analysis for your web applications'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: ['/og-image.png'],
    creator: '@securityheaders'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
    yahoo: 'yahoo-site-verification-code'
  }
}

export const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  applicationCategory: 'SecurityApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD'
  },
  creator: {
    '@type': 'Organization',
    name: 'Security Headers Analyzer Team'
  },
  featureList: [
    'Comprehensive security headers analysis',
    'Real-time security scoring',
    'GitHub PR integration',
    'Detailed remediation guides',
    'Export capabilities',
    'API access'
  ]
}