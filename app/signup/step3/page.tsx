'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupStep3Page() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in.')

      // Get the business id for this owner
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (bizError || !business) throw new Error('Could not find your business.')

      // Insert employee
      const { error: empError } = await supabase
  .from('employees')
  .insert({
    full_name: name,
    email,
    business_id: business.id,
  })

      if (empError) throw empError

      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-500 mb-3">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Prezenco</h1>
        <p className="text-gray-500 text-sm mt-1">Employee time tracking</p>
      </div>

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-full bg-green-100 text-green-600 text-xs font-semibold flex items-center justify-center">✓</span>
            <span className="text-sm text-gray-400">Account</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-full bg-green-100 text-green-600 text-xs font-semibold flex items-center justify-center">✓</span>
            <span className="text-sm text-gray-400">Location</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center">3</span>
            <span className="text-sm font-medium text-gray-900">Team</span>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">Add your first employee</h2>
        <p className="text-gray-500 text-sm mb-6">They'll receive an email invite to create their account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Ana Novak"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ana@yourbusiness.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {saving ? 'Adding employee…' : 'Add employee & finish →'}
          </button>
        </form>

        <button
          onClick={handleSkip}
          className="w-full mt-3 py-3 px-4 text-gray-400 text-sm hover:text-gray-600 transition-colors"
        >
          Skip for now
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can add more employees anytime from the Employees screen.
        </p>
      </div>
    </div>
  )
}