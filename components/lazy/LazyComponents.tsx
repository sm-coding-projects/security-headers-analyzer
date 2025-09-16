'use client'

import dynamic from 'next/dynamic'
import { ComponentType, Suspense } from 'react'

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
)

export const LazyTestimonials = dynamic(() => import('../Testimonials'), {
  loading: () => <LoadingSpinner />,
  ssr: false
})

export const LazyPricingPlans = dynamic(() => import('../PricingPlans'), {
  loading: () => <LoadingSpinner />,
  ssr: false
})


export const withSuspense = <P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <Component {...props} />
    </Suspense>
  )

  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name})`
  return WrappedComponent
}