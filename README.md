# Security Headers Analyzer & Auto-Fixer

A comprehensive Next.js 14 application that analyzes website security headers and provides automated fix recommendations with GitHub integration.

## Features

### 🔍 **Comprehensive Analysis**
- Analyzes 10+ critical security headers
- Real-time scoring system (0-100 points)
- Grade system (A+ to F)
- Detailed severity classification

### 📊 **Visual Reports**
- Interactive pie charts and bar graphs
- Expandable header details
- Color-coded severity indicators
- Progress tracking visualization

### 🔧 **Auto-Fix Capabilities**
- Generate configuration files for multiple server types
- Create GitHub pull requests automatically
- Download detailed markdown reports
- Implementation guides included

### 🛡️ **Security Headers Checked**

| Header | Severity | Description |
|--------|----------|-------------|
| Content-Security-Policy | Critical | Prevents XSS attacks |
| Strict-Transport-Security | High | Forces HTTPS connections |
| X-Content-Type-Options | Medium | Prevents MIME sniffing |
| X-Frame-Options | Medium | Prevents clickjacking |
| Referrer-Policy | Medium | Controls referrer information |
| Permissions-Policy | Medium | Controls browser features |
| Cross-Origin-Embedder-Policy | Medium | Prevents cross-origin embedding |
| Cross-Origin-Resource-Policy | Medium | Controls resource sharing |
| Cross-Origin-Opener-Policy | Medium | Prevents cross-origin references |
| X-XSS-Protection | Low | Legacy XSS protection |

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
security-headers-analyzer/
├── src/
│   └── app/
│       ├── api/
│       │   ├── analyze/route.ts          # Analysis API endpoint
│       │   └── github/create-pr/route.ts # GitHub PR creation
│       ├── globals.css                   # Global styles
│       ├── layout.tsx                    # Root layout
│       └── page.tsx                      # Main dashboard
├── components/
│   ├── URLInput.tsx                      # URL input with validation
│   └── HeadersReport.tsx                 # Analysis results display
├── lib/
│   ├── security-headers.ts               # Core analysis logic
│   └── github-integration.ts             # GitHub API integration
├── types/
│   └── security.ts                       # TypeScript interfaces
└── package.json
```

## Usage

### Basic Analysis

1. Enter a website URL in the input field
2. Click "Analyze Security Headers"
3. View the comprehensive security report
4. Review recommendations for improvements

### GitHub Integration

1. Click "Create Fix PR" on any analysis report
2. Enter your GitHub Personal Access Token
3. Provide the target repository URL
4. The tool will create a PR with configuration files

### Creating GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` permissions
3. Copy the token for use in the application

## Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Quality Assurance
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run analyze      # Run full analysis (build + typecheck + lint)
```

## Technology Stack

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **HTTP Client:** Axios
- **GitHub API:** Octokit REST
- **Notifications:** React Hot Toast
- **Icons:** Lucide React

## Security Considerations

This tool is designed for **defensive security purposes only**:

✅ **Allowed Uses:**
- Security analysis and assessment
- Vulnerability detection
- Security configuration recommendations
- Defensive tool development

❌ **Prohibited Uses:**
- Malicious code creation or modification
- Credential harvesting or discovery
- Unauthorized security testing
- Exploitation tool development

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

**Built with security in mind. Analyze responsibly.**
