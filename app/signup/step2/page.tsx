'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupStep2Page() {
  const router = useRouter()
  const supabase = createClient()

  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [address, setAddress] = useState('')
  const [radius, setRadius] = useState(150)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleUseMyLocation = () => {
    setGpsError('')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        setGpsLoading(false)
      },
      () => {
        setGpsError('Could not get your location. Please allow location access and try again.')
        setGpsLoading(false)
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (lat === null || lng === null) {
      setError('Please set your workplace location first.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in.')

      const { error: dbError } = await supabase
        .from('businesses')
        .update({
          workplace_lat: lat,
          workplace_lng: lng,
          checkin_radius_metres: radius,
        })
        .eq('owner_id', user.id)

      if (dbError) throw dbError

      router.push('/signup/step3')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-500 mb-3 overflow-hidden">
          <img src="/logo-white.png" alt="Zummo" className="w-8 h-8 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Zummo</h1>
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
            <span className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center">2</span>
            <span className="text-sm font-medium text-gray-900">Location</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 text-xs font-semibold flex items-center justify-center">3</span>
            <span className="text-sm text-gray-400">Team</span>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">Set your workplace location</h2>
        <p className="text-gray-500 text-sm mb-6">Employees must be within the radius you set to check in.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* GPS button */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={gpsLoading}
            className="w-full py-3 px-4 border-2 border-green-500 text-green-600 font-semibold rounded-xl text-sm hover:bg-green-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {gpsLoading ? 'Getting location…' : 'Use my current location'}
          </button>

          {gpsError && (
            <p className="text-sm text-red-600">{gpsError}</p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or enter address manually</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Address input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Workplace address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Ilica 10, Zagreb"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {address && lat === null && (
              <button
                type="button"
                onClick={async () => {
                  setGpsError('')
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
                    const data = await res.json()
                    if (data.length === 0) {
                      setGpsError('Address not found. Please try a more specific address.')
                      return
                    }
                    setLat(parseFloat(data[0].lat))
                    setLng(parseFloat(data[0].lon))
                  } catch {
                    setGpsError('Could not look up address. Please try again.')
                  }
                }}
                className="mt-2 text-sm text-green-600 font-medium hover:underline"
              >
                Look up this address →
              </button>
            )}
          </div>

          {/* Location confirmed */}
          {lat !== null && lng !== null && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Location set — {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          )}

          {/* Radius slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Check-in radius</label>
              <span className="text-sm font-semibold text-green-600">{radius} metres</span>
            </div>
            <input
              type="range"
              min={50}
              max={500}
              step={10}
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full accent-green-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>50m</span>
              <span>500m</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Employees must be within {radius}m of your workplace to check in.</p>
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
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}