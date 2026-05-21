'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

const plans = [
  {
    name: 'Starter',
    price: '€14.99',
    employees: 'Up to 10 employees',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  },
  {
    name: 'Growth',
    price: '€29.99',
    employees: 'Up to 25 employees',
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
  },
  {
    name: 'Business',
    price: '€49.99',
    employees: 'Up to 100 employees',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
  },
]

export default function UpgradePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: business } = await supabase
        .from('businesses')
        .select('plan_name, subscription_status')
        .eq('owner_id', user.id)
        .single()
      if (business) {
        setCurrentPlan(business.plan_name)
        setSubscriptionStatus(business.subscription_status)
      }
      setPlanLoading(false)
    }
    load()
  }, [])

  async function handlePortal() {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error(error)
    }
  }

  async function handleSubscribe(priceId: string, planName: string) {
    setLoading(planName)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error(error)
      setLoading(null)
    }
  }

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isActive ? 'Your plan' : 'Choose a plan'}
        </h1>
        <p className="text-gray-500">
          {isActive ? 'Manage or change your subscription.' : 'Unlock all features and start tracking your team.'}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6" style={{ opacity: planLoading ? 0 : 1, transition: 'opacity 0.15s' }}>
        {plans.map((plan) => {
          const isCurrent = isActive && currentPlan === plan.name
          const isPopular = (!isActive || subscriptionStatus === 'trialing') && plan.name === 'Growth' && !isCurrent
          return (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 flex flex-col relative ${
                isCurrent || isPopular
                  ? 'bg-green-500 text-white ring-4 ring-green-500/20'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {isCurrent && (
                <span className="text-xs font-semibold bg-white text-green-500 px-3 py-1 rounded-full self-start mb-4">
                  Current plan
                </span>
              )}
              {isPopular && (
                <span className="text-xs font-semibold bg-white text-green-500 px-3 py-1 rounded-full self-start mb-4">
                  Most popular
                </span>
              )}
              <h2 className={`text-lg font-semibold mb-2 ${isCurrent || isPopular ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h2>
              <div className={`text-4xl font-bold mb-1 ${isCurrent || isPopular ? 'text-white' : 'text-gray-900'}`}>
                {plan.price}
                <span className={`text-base font-normal ml-1 ${isCurrent || isPopular ? 'text-white/80' : 'text-gray-500'}`}>/mo</span>
              </div>
              <p className={`text-sm mb-8 ${isCurrent || isPopular ? 'text-white/90' : 'text-gray-500'}`}>
                {plan.employees}
              </p>
              <button
                onClick={() => { if (!isCurrent) { isActive ? handlePortal() : handleSubscribe(plan.priceId!, plan.name) } }}                disabled={loading === plan.name || isCurrent || planLoading}
                className={`mt-auto w-full py-3 rounded-lg font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-white/20 text-white cursor-default'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-60`}
              >
                {isCurrent ? 'Active' : loading === plan.name ? 'Loading...' : isActive ? 'Switch to this plan' : 'Get started'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-sm text-gray-400 mt-8">
        Need more than 100 employees? <a href="mailto:contact@zummo.com" className="underline">Contact us</a>
      </p>
    </div>
  )
}