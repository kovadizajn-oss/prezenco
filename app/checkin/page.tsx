'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CheckinPage() {
  const supabase = createClient()

  const [employee, setEmployee] = useState<any>(null)
  const [business, setBusiness] = useState<any>(null)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [lastCheckin, setLastCheckin] = useState<string | null>(null)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [weekMinutes, setWeekMinutes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: emp } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!emp) return
    setEmployee(emp)

    const { data: biz } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', emp.business_id)
      .single()

    if (biz) setBusiness(biz)

    // Get today's logs
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todayLogs } = await supabase
      .from('time_logs')
      .select('*')
      .eq('employee_id', emp.id)
      .gte('timestamp', todayStart.toISOString())
      .order('timestamp', { ascending: true })

    if (todayLogs) {
      const checkin = todayLogs.find(l => l.type === 'check-in')
      const checkout = todayLogs.filter(l => l.type === 'check-out').pop()

      if (checkin && !checkout) {
        setIsCheckedIn(true)
        setLastCheckin(checkin.timestamp)
      }

      if (checkin && checkout) {
        const mins = Math.floor(
          (new Date(checkout.timestamp).getTime() - new Date(checkin.timestamp).getTime()) / 60000
        )
        setTodayMinutes(mins)
      }
    }

    // Get this week's logs
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { data: weekLogs } = await supabase
      .from('time_logs')
      .select('*')
      .eq('employee_id', emp.id)
      .gte('timestamp', weekStart.toISOString())
      .order('timestamp', { ascending: true })

    if (weekLogs) {
      let total = 0
      const checkins = weekLogs.filter(l => l.type === 'check-in')
      const checkouts = weekLogs.filter(l => l.type === 'check-out')
      checkins.forEach((ci, i) => {
        const co = checkouts[i]
        if (co) {
          total += Math.floor(
            (new Date(co.timestamp).getTime() - new Date(ci.timestamp).getTime()) / 60000
          )
        }
      })
      setWeekMinutes(total)
    }

    setLoading(false)
  }

  const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    })
  }

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const handleCheckin = async () => {
    setError('')
    setActionLoading(true)

    try {
      const pos = await getLocation()
      const { latitude: lat, longitude: lng } = pos.coords

      const distance = business
        ? getDistance(lat, lng, business.workplace_lat, business.workplace_lng)
        : 0

      const withinRadius = business
        ? distance <= business.checkin_radius_metres
        : true

      if (!withinRadius) {
        setError(`You are ${Math.round(distance)}m away from the workplace. You need to be within ${business.checkin_radius_metres}m to check in.`)
        setActionLoading(false)
        return
      }

      await supabase.from('time_logs').insert({
        employee_id: employee.id,
        business_id: employee.business_id,
        type: 'check-in',
        timestamp: new Date().toISOString(),
        lat,
        lng,
        within_radius: withinRadius,
        manually_adjusted: false,
      })

      setIsCheckedIn(true)
      setLastCheckin(new Date().toISOString())
    } catch (err: any) {
      if (err.code === 1) {
        setError('Location access denied. Please allow location access to check in.')
      } else {
        setError('Could not get your location. Please try again.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckout = async () => {
    setError('')
    setActionLoading(true)

    try {
      const pos = await getLocation()
      const { latitude: lat, longitude: lng } = pos.coords

      await supabase.from('time_logs').insert({
        employee_id: employee.id,
        business_id: employee.business_id,
        type: 'check-out',
        timestamp: new Date().toISOString(),
        lat,
        lng,
        within_radius: true,
        manually_adjusted: false,
      })

      setIsCheckedIn(false)
      if (lastCheckin) {
        const mins = Math.floor(
          (new Date().getTime() - new Date(lastCheckin).getTime()) / 60000
        )
        setTodayMinutes(prev => prev + mins)
        setWeekMinutes(prev => prev + mins)
      }
      setLastCheckin(null)
    } catch {
      setError('Could not get your location. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const liveMinutes = lastCheckin
  ? Math.max(0, Math.floor((now.getTime() - new Date(lastCheckin).getTime()) / 60000))
  : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-500 mb-3">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{business?.name ?? 'Prezenco'}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {employee?.full_name ?? ''}
        </p>
      </div>

      {/* Big check in/out button */}
      <button
        onClick={isCheckedIn ? handleCheckout : handleCheckin}
        disabled={actionLoading}
        className={`w-48 h-48 rounded-full text-white font-bold text-xl shadow-lg transition-all active:scale-95 disabled:opacity-60 ${
          isCheckedIn
            ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
            : 'bg-green-500 hover:bg-green-600 shadow-green-200'
        }`}
      >
        {actionLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isCheckedIn ? (
          'Check Out'
        ) : (
          'Check In'
        )}
      </button>

      {isCheckedIn && lastCheckin && (
        <p className="mt-4 text-green-600 font-medium text-sm">
          Checked in · {formatDuration(liveMinutes)} so far
        </p>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700 max-w-sm text-center">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mt-10 flex gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {isCheckedIn ? formatDuration(todayMinutes + liveMinutes) : formatDuration(todayMinutes)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Today</p>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {isCheckedIn ? formatDuration(weekMinutes + liveMinutes) : formatDuration(weekMinutes)}
          </p>
          <p className="text-sm text-gray-500 mt-1">This week</p>
        </div>
      </div>
    </div>
  )
}