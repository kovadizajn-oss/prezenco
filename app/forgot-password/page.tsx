'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (err) {
        if (err.message?.toLowerCase().includes('same password') || err.message?.toLowerCase().includes('different password')) {
          setError('New password must be different from your current password.')
        } else {
          setError('Something went wrong. Please try again.')
        }
        setLoading(false)
        return
      }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        {sent ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h1>
            <p className="text-sm text-gray-500">We sent a password reset link to <span className="font-medium text-gray-700">{email}</span></p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Reset your password</h1>
            <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <a href="/login" className="block text-center mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Back to login
            </a>
          </>
        )}
      </div>
    </div>
  )
}