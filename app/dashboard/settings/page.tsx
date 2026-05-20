'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const supabase = createClient()
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [radius, setRadius] = useState(150)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [businessId, setBusinessId] = useState<string | null>(null)

  // Location state
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [locationAddress, setLocationAddress] = useState('')
  const [locationSaving, setLocationSaving] = useState(false)
  const [locationSuccess, setLocationSuccess] = useState('')
  const [locationError, setLocationError] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, owner_name, checkin_radius_metres, workplace_lat, workplace_lng')
      .eq('owner_id', user.id)
      .single()

    if (!business) return
    setBusinessId(business.id)
    setBusinessName(business.name ?? '')
    setOwnerName(business.owner_name ?? '')
    setRadius(business.checkin_radius_metres ?? 150)
    if (business.workplace_lat && business.workplace_lng) {
      setLat(business.workplace_lat)
      setLng(business.workplace_lng)
      setLocationAddress(`${business.workplace_lat.toFixed(5)}, ${business.workplace_lng.toFixed(5)}`)
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const { error: dbError } = await supabase
        .from('businesses')
        .update({
          name: businessName,
          owner_name: ownerName,
          checkin_radius_metres: radius,
        })
        .eq('id', businessId!)

      if (dbError) throw dbError
      setSuccess('Settings saved.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleUseMyLocation = () => {
    setLocationError('')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setLocationAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
        setGpsLoading(false)
      },
      () => {
        setLocationError('Could not get your location. Please allow location access and try again.')
        setGpsLoading(false)
      }
    )
  }

  const handleLookupAddress = async () => {
    setLocationError('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationAddress)}`)
      const data = await res.json()
      if (data.length === 0) {
        setLocationError('Address not found. Please try a more specific address.')
        return
      }
      setLat(parseFloat(data[0].lat))
      setLng(parseFloat(data[0].lon))
    } catch {
      setLocationError('Could not look up address. Please try again.')
    }
  }

  const handleSaveLocation = async () => {
    if (lat === null || lng === null) {
      setLocationError('Please set a location first.')
      return
    }
    setLocationError('')
    setLocationSuccess('')
    setLocationSaving(true)

    try {
      const { error: dbError } = await supabase
        .from('businesses')
        .update({
          workplace_lat: lat,
          workplace_lng: lng,
        })
        .eq('id', businessId!)

      if (dbError) throw dbError
      setLocationSuccess('Workplace location updated.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setLocationError(message)
    } finally {
      setLocationSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* Business settings */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Business details</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
            <input
              type="text"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
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
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Workplace location */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Workplace location</h2>
        <p className="text-sm text-gray-500 mb-5">Update the GPS anchor point employees must be near to check in.</p>

        <div className="space-y-4">
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

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or enter address</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={locationAddress}
              onChange={e => { setLocationAddress(e.target.value); setLat(null); setLng(null) }}
              placeholder="e.g. Ilica 10, Zagreb"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleLookupAddress}
              className="px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Look up
            </button>
          </div>

          {lat !== null && lng !== null && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Location set — {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          )}

          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {locationError}
            </div>
          )}

          {locationSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              {locationSuccess}
            </div>
          )}

          <button
            onClick={handleSaveLocation}
            disabled={locationSaving || (lat === null && lng === null)}
            className="px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {locationSaving ? 'Saving…' : 'Save location'}
          </button>
        </div>
      </div>

      {/* Sign out */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Account</h2>
        <p className="text-sm text-gray-500 mb-4">Sign out of your Zummo account.</p>
        <button
          onClick={handleSignOut}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}