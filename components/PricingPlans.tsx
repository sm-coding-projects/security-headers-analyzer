'use client'

import { Check, Star, Users, Code, Zap, Shield } from 'lucide-react'
import { useState } from 'react'

interface PricingFeature {
  name: string
  included: boolean
  description?: string
}

interface PricingTier {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: PricingFeature[]
  cta: string
  popular?: boolean
  badge?: string
  icon: React.ReactNode
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for individual developers and small projects',
    icon: <Code className="h-6 w-6" />,
    features: [
      { name: 'Up to 10 analyses per day', included: true },
      { name: 'Basic security header scanning', included: true },
      { name: 'Security score and grade', included: true },
      { name: 'Detailed recommendations', included: true },
      { name: 'Export to PDF', included: true },
      { name: 'GitHub PR integration', included: false },
      { name: 'API access', included: false },
      { name: 'Priority support', included: false },
      { name: 'Custom branding', included: false }
    ],
    cta: 'Get Started Free'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For professional developers and growing teams',
    popular: true,
    badge: 'Most Popular',
    icon: <Zap className="h-6 w-6" />,
    features: [
      { name: 'Unlimited analyses', included: true },
      { name: 'Advanced security scanning', included: true },
      { name: 'GitHub PR integration', included: true },
      { name: 'API access (1000 calls/month)', included: true },
      { name: 'Export to multiple formats', included: true },
      { name: 'Historical data & trends', included: true },
      { name: 'Custom security policies', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced analytics', included: true }
    ],
    cta: 'Start Pro Trial'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For large teams and organizations with custom needs',
    icon: <Shield className="h-6 w-6" />,
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Unlimited API calls', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'On-premise deployment', included: true },
      { name: 'Custom branding', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Training & onboarding', included: true },
      { name: 'Custom reporting', included: true }
    ],
    cta: 'Contact Sales'
  }
]

const faqs = [
  {
    question: 'Is the free plan really free forever?',
    answer: 'Yes! Our free plan includes 10 daily analyses and core security scanning features with no time limits.'
  },
  {
    question: 'Can I upgrade or downgrade my plan anytime?',
    answer: 'Absolutely. You can change your plan at any time, and the changes will be reflected in your next billing cycle.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and PayPal for Pro plans.'
  },
  {
    question: 'Do you offer discounts for annual payments?',
    answer: 'Yes, save 20% when you pay annually for the Pro plan. Contact us for Enterprise annual pricing.'
  },
  {
    question: 'What kind of support do you provide?',
    answer: 'Free users get community support, Pro users get email support, and Enterprise customers get dedicated support with SLA.'
  }
]

export default function PricingPlans() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  const getPriceForPeriod = (tier: PricingTier) => {
    if (tier.id === 'free' || tier.id === 'enterprise') {
      return tier.price
    }

    if (billingPeriod === 'annual') {
      return '$232' // $29 * 12 * 0.8 (20% discount)
    }
    return tier.price
  }

  const getPeriodText = (tier: PricingTier) => {
    if (tier.id === 'free' || tier.id === 'enterprise') {
      return tier.period
    }
    return billingPeriod === 'annual' ? 'per year' : tier.period
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Choose the plan that fits your security needs
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <span className={`mr-3 ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-blue-600 transition-transform ${
                  billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 ${billingPeriod === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
              Annual
            </span>
            {billingPeriod === 'annual' && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Save 20%
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative bg-white rounded-lg shadow-sm border-2 p-8 ${
                tier.popular
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500 text-white">
                    <Star className="h-4 w-4 mr-1" />
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {tier.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 mb-4">{tier.description}</p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {getPriceForPeriod(tier)}
                  </span>
                  <span className="text-gray-600 ml-2">
                    {getPeriodText(tier)}
                  </span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <span
                      className={`ml-3 ${
                        feature.included ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  tier.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h3>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h4>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center mt-16">
          <div className="bg-blue-600 text-white p-8 rounded-lg">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">
              Need a Custom Solution?
            </h3>
            <p className="text-blue-100 mb-6">
              Our Enterprise plan can be customized to fit your organization's specific security requirements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Schedule a Demo
              </button>
              <button className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}