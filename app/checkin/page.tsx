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
  const [showConfirm, setShowConfirm] = useState(false)

  // Report an issue state
  const [showReport, setShowReport] = useState(false)
  const [reportDate, setReportDate] = useState('')
  const [reportMessage, setReportMessage] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportSuccess, setReportSuccess] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadData()

    let subscription: any

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!emp) return

      subscription = supabase
        .channel('time_logs_changes')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'time_logs',
          filter: `employee_id=eq.${emp.id}`,
        }, (payload: any) => {
          if (payload.new?.type === 'checkout') {
            loadData()
          }
        })
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (subscription) supabase.removeChannel(subscription)
    }
  }, [])

  // Set default report date to today when modal opens
  useEffect(() => {
    if (showReport) {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      setReportDate(`${yyyy}-${mm}-${dd}`)
      setReportMessage('')
      setReportError('')
      setReportSuccess(false)
    }
  }, [showReport])

  const loadData = async () => {
    setIsCheckedIn(false)
    setLastCheckin(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: emp } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .single()

      if (emp?.status === 'inactive') {
        const { data: logs } = await supabase
          .from('time_logs')
          .select('id, type')
          .eq('employee_id', emp.id)
          .order('timestamp', { ascending: false })
          .limit(2)
  
        const lastLog = logs?.[0]
        if (lastLog?.type === 'checkin') {
          await supabase.from('time_logs').insert({
            employee_id: emp.id,
            business_id: emp.business_id,
            type: 'checkout',
            lat: 0,
            lng: 0,
            within_radius: false,
            manually_adjusted: false,
            adjusted_by: 'System',
            adjustment_reason: 'Employee deactivated while checked in',
          })
        }
  
        await supabase.auth.signOut()
        window.location.href = '/login'
        return
      }

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
      const lastCheckinLog = [...todayLogs].reverse().find(l => l.type === 'checkin')
      const checkoutAfter = lastCheckinLog
        ? todayLogs.find(l => l.type === 'checkout' && l.timestamp > lastCheckinLog.timestamp)
        : null

        if (lastCheckinLog && !checkoutAfter) {
          setIsCheckedIn(true)
          setLastCheckin(lastCheckinLog.timestamp)
        } else {
          setIsCheckedIn(false)
          setLastCheckin(null)
        }

      const checkins = todayLogs.filter(l => l.type === 'checkin')
      const checkouts = todayLogs.filter(l => l.type === 'checkout')
      let todayTotal = 0
      checkins.forEach((ci, i) => {
        const co = checkouts[i]
        if (co) todayTotal += Math.max(0, Math.floor(
          (new Date(co.timestamp).getTime() - new Date(ci.timestamp).getTime()) / 60000
        ))
      })
      setTodayMinutes(todayTotal)
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
      const checkins = weekLogs.filter(l => l.type === 'checkin')
      const checkouts = weekLogs.filter(l => l.type === 'checkout')
      checkins.forEach((ci, i) => {
        const co = checkouts[i]
        if (co) {
          total += Math.max(0, Math.floor(
            (new Date(co.timestamp).getTime() - new Date(ci.timestamp).getTime()) / 60000
          ))
        }
      })
      setWeekMinutes(total)
    }

    setLoading(false)
  }

  const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000,
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
        setError(`You are ${Math.round(distance)}m away from your workplace. Please make sure you are at work before checking in.`)
        setActionLoading(false)
        return
      }

      const { error: insertError } = await supabase.from('time_logs').insert({
        employee_id: employee.id,
        business_id: employee.business_id,
        type: 'checkin',
        timestamp: new Date().toISOString(),
        lat,
        lng,
        within_radius: withinRadius,
        manually_adjusted: false,
      })

      if (insertError) throw insertError

      setIsCheckedIn(true)
      setLastCheckin(new Date().toISOString())
    } catch (err: any) {
      if (err.code === 1) {
        setError('Location access denied. Please allow location access to check in.')
      } else if (err.code === 2) {
        setError(`Location unavailable (code 2). ${err.message}`)
      } else if (err.code === 3) {
        setError(`Location timed out (code 3). ${err.message}`)
      } else {
        setError(`Error: ${err.message || JSON.stringify(err)}`)
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
        type: 'checkout',
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

  const handleReport = async () => {
    if (!reportDate) {
      setReportError('Please select a date.')
      return
    }
    if (!reportMessage.trim()) {
      setReportError('Please describe the issue.')
      return
    }

    setReportLoading(true)
    setReportError('')

    const { error: insertError } = await supabase.from('correction_requests').insert({
      employee_id: employee.id,
      business_id: employee.business_id,
      date: reportDate,
      message: reportMessage.trim(),
      status: 'pending',
    })

    if (insertError) {
      setReportError('Failed to send. Please try again.')
      setReportLoading(false)
      return
    }

    setReportLoading(false)
    setReportSuccess(true)
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
    <div className="h-screen bg-white flex flex-col items-center justify-center px-6 overflow-y-auto overscroll-none">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-xl font-bold text-gray-900">{business?.name ?? 'Zummo'}</h1>
        <p className="text-gray-500 text-sm mt-1">{employee?.full_name ?? ''}</p>
      </div>

      {/* Big check in/out button */}
      {/* Hourglass check in/out button */}
      <style>{`
        @keyframes grain {
          0%   { transform: translateY(0); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(8px); opacity: 0; }
        }
        .grain-dot {
          animation: grain 1.2s linear infinite;
        }
        .grain-dot2 {
          animation: grain 1.2s linear infinite;
          animation-delay: 0.6s;
        }
      `}</style>

      <button
        onClick={isCheckedIn ? () => setShowConfirm(true) : handleCheckin}
        disabled={actionLoading}
        className="transition-all active:scale-95 disabled:opacity-60"
        style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: isCheckedIn ? '#ef4444' : '#22c55e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
          transition: 'background 0.3s, box-shadow 0.3s',
boxShadow: isCheckedIn ? '0 8px 32px rgba(239,68,68,0.45), 0 2px 8px rgba(239,68,68,0.3)' : '0 8px 32px rgba(34,197,94,0.45), 0 2px 8px rgba(34,197,94,0.3)',
        }}
      >
        {actionLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isCheckedIn ? (
                <path d="M15 6H9M20 21H19M19 21H5M19 21C19 18.4898 17.7877 16.1341 15.7451 14.675L12 12M5 21H4M5 21C5 18.4898 6.21228 16.1341 8.25493 14.675L12 12M20 3H19M19 3H5M19 3C19 5.51022 17.7877 7.86592 15.7451 9.32495L12 12M5 3H4M5 3C5 5.51022 6.21228 7.86592 8.25493 9.32495L12 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M15 18H9M20 3H19M19 3H5M19 3C19 5.51022 17.7877 7.86592 15.7451 9.32495L12 12M5 3H4M5 3C5 5.51022 6.21228 7.86592 8.25493 9.32495L12 12M20 21H19M19 21H5M19 21C19 18.4898 17.7877 16.1341 15.7451 14.675L12 12M5 21H4M5 21C5 18.4898 6.21228 16.1341 8.25493 14.675L12 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              )}
              {isCheckedIn && (
                <>
                  <circle className="grain-dot" cx="12" cy="12.5" r="0.6" fill="white"/>
                  <circle className="grain-dot2" cx="12" cy="12.5" r="0.6" fill="white"/>
                </>
              )}
            </svg>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.09em',
              color: '#fff',
            }}>
              {isCheckedIn ? 'CHECK OUT' : 'CHECK IN'}
            </span>
          </>
        )}
      </button>

      {isCheckedIn && lastCheckin && (
        <p className="mt-4 text-red-500 font-medium text-sm">
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

      {/* Report an issue button */}
      <button
        onClick={() => setShowReport(true)}
        className="mt-10 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
      >
        Report an issue with my hours
      </button>

      {/* Sign out */}
      <button
        onClick={async () => {
          if (isCheckedIn) {
            setError('Please check out before signing out.')
            return
          }
          await supabase.auth.signOut()
          window.location.href = '/login'
        }}
        className="mt-3 text-sm text-gray-300 hover:text-gray-500 transition-colors"
      >
        Sign out
      </button>

      {/* Checkout confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 pb-8 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Check out?</h3>
            <p className="text-gray-500 text-sm mb-6">Are you sure you want to check out?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); handleCheckout() }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Yes, check out
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report an issue modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 pb-8 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            {reportSuccess ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Request sent</h3>
                <p className="text-gray-500 text-sm mb-6">Your employer will review your hours.</p>
                <button
                  onClick={() => setShowReport(false)}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Report an issue</h3>
                <p className="text-gray-500 text-sm mb-5">Let your employer know about a problem with your hours.</p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">What's the issue?</label>
                  <textarea
                    value={reportMessage}
                    onChange={e => setReportMessage(e.target.value)}
                    placeholder="e.g. I forgot to check out on Friday"
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>

                {reportError && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {reportError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReport(false)}
                    disabled={reportLoading}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={reportLoading}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {reportLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}