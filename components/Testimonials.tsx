'use client'

import { Star, Users, Github, TrendingUp } from 'lucide-react'

interface Testimonial {
  id: string
  name: string
  role: string
  company: string
  content: string
  avatar: string
  rating: number
}

interface Metric {
  label: string
  value: string
  change: string
  icon: React.ReactNode
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Senior Security Engineer',
    company: 'TechCorp',
    content: 'This tool saved us weeks of manual security audits. The GitHub PR integration is brilliant - our entire team can now implement security fixes with confidence.',
    avatar: '👩‍💻',
    rating: 5
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    role: 'DevOps Lead',
    company: 'StartupXYZ',
    content: 'We improved our security score from 65 to 95 in just one sprint. The detailed explanations helped our junior developers understand security best practices.',
    avatar: '👨‍💼',
    rating: 5
  },
  {
    id: '3',
    name: 'Emily Watson',
    role: 'Full Stack Developer',
    company: 'WebStudio',
    content: 'The automated PR creation feature is a game-changer. No more copy-pasting security headers - everything is handled automatically with proper documentation.',
    avatar: '👩‍🎨',
    rating: 5
  },
  {
    id: '4',
    name: 'David Kim',
    role: 'CTO',
    company: 'FinanceApp',
    content: 'Compliance became so much easier with this tool. We can now demonstrate security improvements to auditors with detailed reports and automated fixes.',
    avatar: '👨‍🔬',
    rating: 5
  }
]

const metrics: Metric[] = [
  {
    label: 'Security Headers Fixed',
    value: '12,847',
    change: '+23% this month',
    icon: <TrendingUp className="h-5 w-5 text-green-500" />
  },
  {
    label: 'GitHub PRs Created',
    value: '3,421',
    change: '+18% this month',
    icon: <Github className="h-5 w-5 text-blue-500" />
  },
  {
    label: 'Active Users',
    value: '2,156',
    change: '+31% this month',
    icon: <Users className="h-5 w-5 text-purple-500" />
  },
  {
    label: 'Average Score Improvement',
    value: '+28 points',
    change: 'Typical improvement',
    icon: <Star className="h-5 w-5 text-yellow-500" />
  }
]

const companyLogos = [
  { name: 'TechCorp', logo: '🏢' },
  { name: 'StartupXYZ', logo: '🚀' },
  { name: 'WebStudio', logo: '🎨' },
  { name: 'FinanceApp', logo: '💳' },
  { name: 'DevTools Inc', logo: '⚡' },
  { name: 'CloudSys', logo: '☁️' }
]

export default function Testimonials() {
  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Metrics */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Trusted by Security-Conscious Teams
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Join thousands of developers improving web security daily
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {metrics.map((metric, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-center mb-2">
                  {metric.icon}
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {metric.label}
                </div>
                <div className="text-xs text-green-600">
                  {metric.change}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Logos */}
        <div className="mb-16">
          <p className="text-center text-gray-600 mb-8">Used by teams at</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {companyLogos.map((company, index) => (
              <div key={index} className="flex items-center space-x-2 text-gray-500">
                <span className="text-2xl">{company.logo}</span>
                <span className="font-medium">{company.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
              </div>

              <blockquote className="text-gray-700 mb-4 italic">
                "{testimonial.content}"
              </blockquote>

              <div className="flex items-center">
                <div className="text-2xl mr-3">{testimonial.avatar}</div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-blue-600 text-white p-8 rounded-lg">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Secure Your Website?
            </h3>
            <p className="text-blue-100 mb-6">
              Join these satisfied customers and improve your security score today
            </p>
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Free Analysis
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}