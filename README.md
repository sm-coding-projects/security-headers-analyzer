# 🔒 Security Headers Analyzer

A comprehensive web security tool that analyzes HTTP security headers and automatically generates pull requests to fix security vulnerabilities in your projects.

[![CI/CD](https://github.com/sm-coding-projects/security-headers-analyzer/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/sm-coding-projects/security-headers-analyzer/actions)
[![codecov](https://codecov.io/gh/sm-coding-projects/security-headers-analyzer/branch/main/graph/badge.svg)](https://codecov.io/gh/sm-coding-projects/security-headers-analyzer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org)

**Live Demo**: [https://security-headers-analyzer-beta.vercel.app/](https://security-headers-analyzer-beta.vercel.app/)

## ✨ Features

### 🔍 Security Analysis
- **Comprehensive Header Analysis**: Analyzes 15+ critical security headers
- **Real-time Scanning**: Instant analysis of any public website
- **Security Scoring**: A-F grading system with detailed explanations
- **Best Practice Recommendations**: Actionable advice for security improvements

### 🤖 GitHub Integration
- **Automated Pull Requests**: Creates PRs with security header fixes
- **Framework Detection**: Supports Next.js, Express, Apache, Nginx, and more
- **Smart Code Generation**: Generates appropriate middleware/configuration code
- **Branch Management**: Creates dedicated branches for security improvements

### 📊 Reporting & Export
- **Detailed Reports**: Comprehensive analysis with recommendations
- **PDF Export**: Professional security reports for compliance
- **Historical Tracking**: Monitor security improvements over time
- **Bulk Analysis**: Analyze multiple URLs simultaneously

### 🚀 Performance & Reliability
- **Rate Limiting**: Built-in protection against abuse
- **Caching**: Redis-powered caching for faster responses
- **Error Handling**: Robust error handling with detailed messages
- **Monitoring**: Built-in health checks and metrics

## 🖼️ Screenshots

### Homepage
![Homepage](./docs/screenshots/homepage.png)

### Analysis Results
![Analysis Results](./docs/screenshots/analysis-results.png)

### GitHub Integration
![GitHub Integration](./docs/screenshots/github-integration.png)

### Security Report
![Security Report](./docs/screenshots/security-report.png)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- (Optional) Docker and Docker Compose
- (Optional) GitHub Personal Access Token for PR creation

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sm-coding-projects/security-headers-analyzer.git
   cd security-headers-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Visit [http://localhost:3000](http://localhost:3000) or the live deployment at [https://security-headers-analyzer-beta.vercel.app/](https://security-headers-analyzer-beta.vercel.app/)

### Using Docker

1. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Main app: [http://localhost:3000](http://localhost:3000)
   - pgAdmin: [http://localhost:5050](http://localhost:5050)
   - Redis Commander: [http://localhost:8081](http://localhost:8081)

## 📖 Usage

### Web Interface

1. **Analyze a Website**
   - Enter a URL in the homepage input field
   - Click "Analyze Security Headers"
   - Review the detailed security analysis

2. **Generate GitHub PR**
   - After analysis, click "Create GitHub PR"
   - Enter your repository URL and GitHub token
   - Review and customize the PR details
   - Click "Create Pull Request"

3. **Export Reports**
   - Click "Export Report" on any analysis
   - Choose PDF format for professional reports
   - Download and share with your team

### API Usage

#### Analyze URL
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

#### Create GitHub PR
```bash
curl -X POST http://localhost:3000/api/github/create-pr \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/owner/repo",
    "headers": [{"name": "Content-Security-Policy", "missing": true}],
    "githubToken": "ghp_your_token_here"
  }'
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | Yes | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | No | In-memory storage |
| `RATE_LIMIT_REDIS_URL` | Redis URL for rate limiting | No | In-memory rate limiting |
| `SECRET_KEY` | Secret key for encryption | Yes | - |
| `GITHUB_APP_ID` | GitHub App ID | No | - |
| `GITHUB_PRIVATE_KEY` | GitHub App private key | No | - |
| `SENTRY_DSN` | Sentry DSN for error tracking | No | - |
| `ANALYTICS_ID` | Google Analytics ID | No | - |

### Security Headers Analyzed

- **Content Security Policy (CSP)**: Prevents XSS attacks
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS
- **X-XSS-Protection**: Legacy XSS protection
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Controls browser features
- **Cross-Origin-Embedder-Policy**: Controls cross-origin embedding
- **Cross-Origin-Opener-Policy**: Controls cross-origin window interactions
- **Cross-Origin-Resource-Policy**: Controls cross-origin resource sharing

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Test Structure
- `__tests__/api-routes.test.ts` - API endpoint tests
- `__tests__/security-headers.test.ts` - Security analysis tests
- `__tests__/github-integration.test.ts` - GitHub integration tests

### E2E Testing
```bash
# Install Playwright
npx playwright install

# Run E2E tests
npx playwright test
```

## 🏗️ Development

### Project Structure
```
security-headers-analyzer/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── advanced/       # Advanced analysis page
│   │   └── page.tsx        # Homepage
│   ├── lib/                # Utility libraries
│   │   ├── security-headers.ts
│   │   ├── github-integration.ts
│   │   ├── cache.ts
│   │   └── rate-limiter.ts
│   └── types/              # TypeScript type definitions
├── __tests__/              # Test files
├── docker/                 # Docker configuration
├── .github/                # GitHub workflows
└── docs/                   # Documentation
```

### Tech Stack
- **Framework**: Next.js 15.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Database**: PostgreSQL (optional)
- **Cache**: Redis (optional)
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright
- **Deployment**: Vercel

### Adding New Security Headers

1. **Update the analyzer**
   ```typescript
   // src/lib/security-headers.ts
   const SECURITY_HEADERS = {
     'your-new-header': {
       name: 'Your-New-Header',
       description: 'Description of the header',
       severity: 'high',
       checkValue: (value: string) => {
         // Validation logic
         return { valid: true, issues: [] };
       }
     }
   };
   ```

2. **Add tests**
   ```typescript
   // __tests__/security-headers.test.ts
   describe('Your-New-Header', () => {
     it('should validate correct header value', () => {
       // Test implementation
     });
   });
   ```

3. **Update documentation**
   Update this README and add examples to the docs folder.

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to GitHub**
   - Import your repository in Vercel
   - Configure environment variables
   - Deploy automatically

2. **Environment Variables**
   Set up the following in Vercel dashboard:
   - `NEXT_PUBLIC_APP_URL`
   - `SECRET_KEY`
   - `DATABASE_URL` (if using PostgreSQL)
   - `RATE_LIMIT_REDIS_URL` (if using Redis)

### Docker

1. **Build the image**
   ```bash
   docker build -t security-headers-analyzer .
   ```

2. **Run the container**
   ```bash
   docker run -p 3000:3000 security-headers-analyzer
   ```

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## 📊 Monitoring

### Health Checks
- **Application Health**: `GET /api/health`
- **Database Health**: `GET /api/health/db`
- **Redis Health**: `GET /api/health/redis`

### Metrics
- Response time tracking
- Rate limit monitoring
- Error rate tracking
- GitHub API usage

### Logging
- Structured JSON logging
- Error tracking with Sentry
- Request/response logging
- Performance metrics

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Add tests**
5. **Run the test suite**
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```
6. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
7. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Create a Pull Request**

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

## 🔒 Security Policy

### Reporting Vulnerabilities
If you discover a security vulnerability, please create a private security advisory on the [GitHub repository](https://github.com/sm-coding-projects/security-headers-analyzer/security/advisories) instead of creating a public issue.

### Security Measures
- Rate limiting on all API endpoints
- Input validation and sanitization
- CSRF protection
- Secure headers implementation
- Regular dependency updates
- Automated security scanning

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SecurityHeaders.com](https://securityheaders.com/)
- [Helmet.js](https://helmetjs.github.io/)

## 📞 Support

- **Live App**: [security-headers-analyzer-beta.vercel.app](https://security-headers-analyzer-beta.vercel.app/)
- **Issues**: [GitHub Issues](https://github.com/sm-coding-projects/security-headers-analyzer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sm-coding-projects/security-headers-analyzer/discussions)

## 🗺️ Roadmap

- [ ] **Multi-language Support**: i18n implementation
- [ ] **API Rate Plan**: Premium API access with higher limits
- [ ] **Integration Hub**: Slack, Discord, Teams integrations
- [ ] **Security Monitoring**: Continuous monitoring and alerts
- [ ] **Compliance Reports**: SOC2, ISO27001 reporting templates
- [ ] **Browser Extension**: Chrome/Firefox extension for quick analysis
- [ ] **CLI Tool**: Command-line interface for CI/CD integration

---

Made with ❤️ by the Security Headers Analyzer team
