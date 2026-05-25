'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (accessToken && type === 'recovery') {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? '',
        }).then(({ error }) => {
          if (!error) setValidSession(true)
        })
        return
      }
    }

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
      }
    })
  }, [])

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError('Please enter a new password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
        if ((err as any).status === 422) {
          setError('New password must be different from your current password.')
        } else {
          setError('Something went wrong. Please try again.')
        }
        setLoading(false)
        return
      }

    setDone(true)
    setLoading(false)

    setTimeout(() => {
      window.location.href = '/login'
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        {done ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Password updated</h1>
            <p className="text-sm text-gray-500">Redirecting you to login...</p>
          </div>
        ) : !validSession ? (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Invalid or expired link</h1>
            <p className="text-sm text-gray-500 mb-6">This password reset link is no longer valid.</p>
            <a href="/forgot-password" className="block w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl text-sm transition-colors text-center">
              Request a new link
            </a>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Set new password</h1>
            <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
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
              {loading ? 'Saving...' : 'Update password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}