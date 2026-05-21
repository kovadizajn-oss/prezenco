'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

const plans = [
  {
    name: 'Starter',
    price: '€14.99',
    employees: 'Up to 10 employees',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
    popular: false,
  },
  {
    name: 'Growth',
    price: '€29.99',
    employees: 'Up to 25 employees',
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
    popular: true,
  },
  {
    name: 'Business',
    price: '€49.99',
    employees: 'Up to 100 employees',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
    popular: false,
  },
]

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose a plan</h1>
        <p className="text-gray-500">Unlock all features and start tracking your team.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-8 flex flex-col ${
              plan.popular
                ? 'bg-green-500 text-white ring-4 ring-green-500/20'
                : 'bg-white border border-gray-200'
            }`}
          >
            {plan.popular && (
              <span className="text-xs font-semibold bg-white text-green-500 px-3 py-1 rounded-full self-start mb-4">
                Most popular
              </span>
            )}
            <h2 className={`text-lg font-semibold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
              {plan.name}
            </h2>
            <div className={`text-4xl font-bold mb-1 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
              {plan.price}
              <span className={`text-base font-normal ml-1 ${plan.popular ? 'text-white/80' : 'text-gray-500'}`}>/mo</span>
            </div>
            <p className={`text-sm mb-8 ${plan.popular ? 'text-white/90' : 'text-gray-500'}`}>
              {plan.employees}
            </p>
            <button
              onClick={() => handleSubscribe(plan.priceId!, plan.name)}
              disabled={loading === plan.name}
              className={`mt-auto w-full py-3 rounded-lg font-semibold transition-colors ${
                plan.popular
                  ? 'bg-white text-green-500 hover:bg-white/90'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              } disabled:opacity-60`}
            >
              {loading === plan.name ? 'Loading...' : 'Get started'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-gray-400 mt-8">
        Need more than 100 employees? <a href="mailto:contact@zummo.com" className="underline">Contact us</a>
      </p>
    </div>
  )
}