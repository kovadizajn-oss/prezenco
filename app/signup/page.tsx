'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupStep1Page() {
  const router = useRouter()
  const supabase = createClient()

  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      // 1. Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Account creation failed. Please try again.')

      // 2. Insert into businesses table
      const { error: dbError } = await supabase.from('businesses').insert({
        owner_id: authData.user.id,
        name: businessName,
        owner_name: ownerName,
        owner_email: email,
      })

      if (dbError) throw dbError

      // 3. Move to Step 2
      router.push('/signup/step2')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-500 mb-3">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Prezenco</h1>
        <p className="text-gray-500 text-sm mt-1">Employee time tracking</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center">1</span>
            <span className="text-sm font-medium text-gray-900">Account</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 text-xs font-semibold flex items-center justify-center">2</span>
            <span className="text-sm text-gray-400">Location</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 text-xs font-semibold flex items-center justify-center">3</span>
            <span className="text-sm text-gray-400">Team</span>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h2>
        <p className="text-gray-500 text-sm mb-6">Set up Prezenco for your business. Takes 2 minutes.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business name</label>
            <input
              type="text"
              required
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Café Jadran"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
            <input
              type="text"
              required
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              placeholder="e.g. Marko Horvat"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
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
            disabled={loading}
            className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl text-sm transition-colors mt-2"
          >
            {loading ? 'Creating account…' : 'Continue →'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}