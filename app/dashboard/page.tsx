'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Employee = {
  id: string
  full_name: string
  email: string
  status: string
}

type EmployeeWithLogs = Employee & {
  checkinTime: string | null
  checkoutTime: string | null
  totalMinutes: number | null
  isCheckedIn: boolean
}

type CorrectionRequest = {
  id: string
  employee_id: string
  date: string
  message: string
  status: string
  created_at: string
  employee_name: string
}

type ForceCheckout = {
  employee_id: string
  employee_name: string
  business_id: string
  checkout_time: string
  reason: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<EmployeeWithLogs[]>([])
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState('')
  const [ownerName, setOwnerName] = useState('')

  // Force checkout modal
  const [forceCheckout, setForceCheckout] = useState<ForceCheckout | null>(null)
  const [forceSaving, setForceSaving] = useState(false)
  const [forceError, setForceError] = useState('')

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_name')
      .eq('owner_id', user.id)
      .single()

    if (!business) return
    setBusinessId(business.id)
    setOwnerName(business.owner_name ?? '')

    const { data: emps } = await supabase
      .from('employees')
      .select('id, full_name, email, status')
      .eq('business_id', business.id)
      .eq('status', 'active')

    if (!emps) return

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: logs } = await supabase
      .from('time_logs')
      .select('id, employee_id, type, timestamp')
      .eq('business_id', business.id)
      .gte('timestamp', todayStart.toISOString())
      .order('timestamp', { ascending: true })

    const enriched: EmployeeWithLogs[] = emps.map((emp) => {
      const empLogs = (logs || []).filter(l => l.employee_id === emp.id)
      const lastCheckin = [...empLogs].reverse().find(l => l.type === 'checkin')
      const checkin = lastCheckin ?? null
      const checkout = lastCheckin
        ? empLogs.find(l => l.type === 'checkout' && l.timestamp > lastCheckin.timestamp) ?? null
        : null

      let totalMinutes: number | null = null
      if (checkin && checkout) {
        totalMinutes = Math.floor(
          (new Date(checkout.timestamp).getTime() - new Date(checkin.timestamp).getTime()) / 60000
        )
      }

      const isCheckedIn = !!checkin && !checkout

      return {
        ...emp,
        checkinTime: checkin?.timestamp ?? null,
        checkoutTime: checkout?.timestamp ?? null,
        totalMinutes,
        isCheckedIn,
      }
    })

    setEmployees(enriched)

    const { data: requests } = await supabase
      .from('correction_requests')
      .select('id, employee_id, date, message, status, created_at')
      .eq('business_id', business.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (requests && requests.length > 0) {
      const withNames: CorrectionRequest[] = requests.map(r => {
        const emp = emps.find(e => e.id === r.employee_id)
        return { ...r, employee_name: emp?.full_name ?? 'Unknown employee' }
      })
      setCorrections(withNames)
    } else {
      setCorrections([])
    }

    setLoading(false)
  }

  const handleResolve = async (id: string) => {
    setResolvingId(id)
    await supabase.from('correction_requests').update({ status: 'resolved' }).eq('id', id)
    setCorrections(prev => prev.filter(r => r.id !== id))
    setResolvingId(null)
  }

  const openForceCheckout = (emp: EmployeeWithLogs) => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setForceError('')
    setForceCheckout({
      employee_id: emp.id,
      employee_name: emp.full_name,
      business_id: businessId,
      checkout_time: `${hh}:${mm}`,
      reason: '',
    })
  }

  const handleForceCheckout = async () => {
    if (!forceCheckout) return
    if (!forceCheckout.reason.trim()) {
      setForceError('Please enter a reason.')
      return
    }

    setForceSaving(true)
    setForceError('')

    const [hours, minutes] = forceCheckout.checkout_time.split(':').map(Number)
    const checkoutDate = new Date()
    checkoutDate.setHours(hours, minutes, 0, 0)

    const { error } = await supabase.from('time_logs').insert({
      employee_id: forceCheckout.employee_id,
      business_id: forceCheckout.business_id,
      type: 'checkout',
      timestamp: checkoutDate.toISOString(),
      lat: 0,
      lng: 0,
      within_radius: true,
      manually_adjusted: true,
      adjusted_by: ownerName,
      adjustment_reason: forceCheckout.reason.trim(),
    })

    if (error) {
      setForceError('Failed to check out. Please try again.')
      setForceSaving(false)
      return
    }

    setForceSaving(false)
    setForceCheckout(null)
    await loadDashboard()
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const liveMinutes = (checkinIso: string) =>
    Math.floor((now.getTime() - new Date(checkinIso).getTime()) / 60000)

  const checkedIn = employees.filter(e => e.isCheckedIn)
  const longShiftFlags = employees.filter(e => e.isCheckedIn && e.checkinTime && liveMinutes(e.checkinTime) > 600)
  const showFlags = longShiftFlags.length > 0 || corrections.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">

      {/* Live Now */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Live Now</h2>
        {checkedIn.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-8 text-center text-gray-400 text-sm">
            Nobody is checked in right now.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
            {checkedIn.map(emp => (
              <div key={emp.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium text-gray-900">{emp.full_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Since {formatTime(emp.checkinTime!)}</p>
                    <p className="text-sm font-semibold text-green-600">
                      {formatDuration(liveMinutes(emp.checkinTime!))}
                    </p>
                  </div>
                  <button
                    onClick={() => openForceCheckout(emp)}
                    className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-2.5 py-1 transition-colors"
                  >
                    Check out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Today's Overview */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Today's Overview</h2>
        {employees.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-8 text-center text-gray-400 text-sm">
            No active employees yet.{' '}
            <a href="/dashboard/employees" className="text-green-600 font-medium hover:underline">
              Add your first employee →
            </a>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
            {employees.map(emp => (
              <div
                key={emp.id}
                className={`flex items-center justify-between px-5 py-4 ${!emp.checkinTime ? 'opacity-50' : ''}`}
              >
                <span className="font-medium text-gray-900">{emp.full_name}</span>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>{emp.checkinTime ? formatTime(emp.checkinTime) : '—'}</span>
                  <span>{emp.checkoutTime ? formatTime(emp.checkoutTime) : emp.isCheckedIn ? (
                    <span className="text-green-600 font-medium">checked in</span>
                  ) : '—'}</span>
                  <span className="font-semibold text-gray-700 w-16 text-right">
                    {emp.isCheckedIn && emp.checkinTime
                      ? formatDuration(liveMinutes(emp.checkinTime))
                      : emp.totalMinutes !== null
                      ? formatDuration(emp.totalMinutes)
                      : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Flags */}
      {showFlags && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Flags</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl divide-y divide-amber-100">
            {longShiftFlags.map(emp => (
              <div key={emp.id} className="flex items-center justify-between px-5 py-4">
                <span className="font-medium text-amber-900">{emp.full_name}</span>
                <span className="text-sm text-amber-700">
                  Checked in for {formatDuration(liveMinutes(emp.checkinTime!))} — no checkout
                </span>
              </div>
            ))}
            {corrections.map(req => (
              <div key={req.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-amber-900">{req.employee_name}</span>
                      <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Hours issue</span>
                    </div>
                    <p className="text-sm text-amber-700 mb-0.5">{formatDate(req.date)}</p>
                    <p className="text-sm text-amber-800">{req.message}</p>
                  </div>
                  <button
                    onClick={() => handleResolve(req.id)}
                    disabled={resolvingId === req.id}
                    className="shrink-0 text-xs px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    {resolvingId === req.id ? 'Resolving…' : 'Mark resolved'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Force Checkout Modal */}
      {forceCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!forceSaving) setForceCheckout(null) }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Check out {forceCheckout.employee_name}
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Set the actual checkout time and enter a reason.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Checkout time</label>
              <input
                type="time"
                value={forceCheckout.checkout_time}
                onChange={e => setForceCheckout({ ...forceCheckout, checkout_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={forceCheckout.reason}
                onChange={e => setForceCheckout({ ...forceCheckout, reason: e.target.value })}
                placeholder="e.g. Employee forgot to check out"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {forceError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {forceError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setForceCheckout(null)}
                disabled={forceSaving}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleForceCheckout}
                disabled={forceSaving}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {forceSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </>
                ) : 'Check out'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}