'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Employee = {
  id: string
  full_name: string
}

type ShiftRow = {
  date: string
  checkin: string | null
  checkout: string | null
  checkin_id: string | null
  checkout_id: string | null
  minutes: number | null
  manually_adjusted: boolean
}

type EditingShift = {
  checkin_id: string
  checkout_id: string
  checkin_time: string   // "HH:MM" local
  checkout_time: string  // "HH:MM" local
  date_iso: string       // "YYYY-MM-DD" local, for reconstructing full timestamp
  reason: string
}

export default function HoursPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmp, setSelectedEmp] = useState<string>('')
  const [period, setPeriod] = useState('this_month')
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [shiftsLoading, setShiftsLoading] = useState(false)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [ownerName, setOwnerName] = useState('')

  // Edit modal state
  const [editing, setEditing] = useState<EditingShift | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (selectedEmp) loadShifts()
  }, [selectedEmp, period])

  const loadEmployees = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_name')
      .eq('owner_id', user.id)
      .single()

    if (!business) return

    setOwnerName(business.owner_name ?? '')

    const { data: emps } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .order('full_name')

    setEmployees(emps ?? [])
    if (emps && emps.length > 0) setSelectedEmp(emps[0].id)
    setLoading(false)
  }

  const getDateRange = () => {
    const now = new Date()
    let start: Date
    let end: Date = new Date()

    switch (period) {
      case 'this_week':
        start = new Date()
        start.setDate(now.getDate() - now.getDay())
        start.setHours(0, 0, 0, 0)
        break
      case 'last_week':
        start = new Date()
        start.setDate(now.getDate() - now.getDay() - 7)
        start.setHours(0, 0, 0, 0)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        end.setHours(23, 59, 59, 999)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return { start, end }
  }

  const loadShifts = async () => {
    setShiftsLoading(true)
    const { start, end } = getDateRange()

    const { data: logs } = await supabase
      .from('time_logs')
      .select('id, type, timestamp, manually_adjusted')
      .eq('employee_id', selectedEmp)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp', { ascending: true })

    if (!logs) {
      setShifts([])
      setShiftsLoading(false)
      return
    }

    const rows: ShiftRow[] = []
    let total = 0
    const checkins = logs.filter(l => l.type === 'checkin')
    const checkouts = logs.filter(l => l.type === 'checkout')

    checkins.forEach((ci, i) => {
      const co = checkouts[i] ?? null
      const date = new Date(ci.timestamp).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short'
      })
      const minutes = co
        ? Math.floor((new Date(co.timestamp).getTime() - new Date(ci.timestamp).getTime()) / 60000)
        : null

      if (minutes !== null) total += minutes

      rows.push({
        date,
        checkin: ci.timestamp,
        checkout: co?.timestamp ?? null,
        checkin_id: ci.id,
        checkout_id: co?.id ?? null,
        minutes,
        manually_adjusted: ci.manually_adjusted || co?.manually_adjusted,
      })
    })

    setShifts(rows.reverse())
    setTotalMinutes(total)
    setShiftsLoading(false)
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // Convert ISO timestamp to "HH:MM" in local time
  const toLocalTimeInput = (iso: string) => {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  // Get "YYYY-MM-DD" in local time from ISO string
  const toLocalDateString = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Combine a local date string "YYYY-MM-DD" and time "HH:MM" into a UTC ISO string
  const toISOFromLocalDateTime = (dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)
    const d = new Date(year, month - 1, day, hours, minutes, 0, 0)
    return d.toISOString()
  }

  const openEditModal = (shift: ShiftRow) => {
    if (!shift.checkin_id || !shift.checkout_id || !shift.checkin || !shift.checkout) return
    setSaveError('')
    setEditing({
      checkin_id: shift.checkin_id,
      checkout_id: shift.checkout_id,
      checkin_time: toLocalTimeInput(shift.checkin),
      checkout_time: toLocalTimeInput(shift.checkout),
      date_iso: toLocalDateString(shift.checkin),
      reason: '',
    })
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.reason.trim()) {
      setSaveError('Please enter a reason for the adjustment.')
      return
    }

    const newCheckinISO = toISOFromLocalDateTime(editing.date_iso, editing.checkin_time)
    const newCheckoutISO = toISOFromLocalDateTime(editing.date_iso, editing.checkout_time)

    if (new Date(newCheckoutISO) <= new Date(newCheckinISO)) {
      setSaveError('Check-out time must be after check-in time.')
      return
    }

    setSaving(true)
    setSaveError('')

    // Fetch original timestamps before overwriting
    const { data: origLogs } = await supabase
      .from('time_logs')
      .select('id, timestamp')
      .in('id', [editing.checkin_id, editing.checkout_id])

    const origCheckin = origLogs?.find(l => l.id === editing.checkin_id)?.timestamp ?? null
    const origCheckout = origLogs?.find(l => l.id === editing.checkout_id)?.timestamp ?? null

    // Update check-in row
    const { error: err1 } = await supabase
      .from('time_logs')
      .update({
        timestamp: newCheckinISO,
        manually_adjusted: true,
        adjusted_by: ownerName,
        adjustment_reason: editing.reason.trim(),
        original_timestamp: origCheckin,
      })
      .eq('id', editing.checkin_id)

    if (err1) {
      setSaveError('Failed to save. Please try again.')
      setSaving(false)
      return
    }

    // Update check-out row
    const { error: err2 } = await supabase
      .from('time_logs')
      .update({
        timestamp: newCheckoutISO,
        manually_adjusted: true,
        adjusted_by: ownerName,
        adjustment_reason: editing.reason.trim(),
        original_timestamp: origCheckout,
      })
      .eq('id', editing.checkout_id)

    if (err2) {
      setSaveError('Failed to save check-out. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    setEditing(null)
    await loadShifts()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Hours</h1>

      {employees.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-12 text-center text-gray-400 text-sm">
          No active employees yet.
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <select
              value={selectedEmp}
              onChange={e => setSelectedEmp(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>

            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="this_week">This week</option>
              <option value="last_week">Last week</option>
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
            </select>
          </div>

          {/* Total */}
          {!shiftsLoading && shifts.length > 0 && (
            <div className="mb-4 text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-900">{formatDuration(totalMinutes)}</span>
              {' '}across {shifts.length} shift{shifts.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Shifts table */}
          {shiftsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl px-6 py-12 text-center text-gray-400 text-sm">
              No shifts recorded for this period.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
              <div className="grid grid-cols-5 px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <span>Date</span>
                <span>Check in</span>
                <span>Check out</span>
                <span className="text-right">Duration</span>
                <span></span>
              </div>
              {shifts.map((shift, i) => (
                <div key={i} className="grid grid-cols-5 px-5 py-4 text-sm items-center">
                  <span className="font-medium text-gray-900">{shift.date}</span>
                  <span className="text-gray-600">{shift.checkin ? formatTime(shift.checkin) : '—'}</span>
                  <span className="text-gray-600">
                    {shift.checkout ? formatTime(shift.checkout) : (
                      <span className="text-green-600 font-medium">still in</span>
                    )}
                  </span>
                  <span className="text-right font-semibold text-gray-900">
                    {shift.minutes !== null ? formatDuration(shift.minutes) : '—'}
                    {shift.manually_adjusted && (
                      <span className="ml-1 text-xs text-amber-500">✎</span>
                    )}
                  </span>
                  <span className="text-right">
                    {shift.checkin_id && shift.checkout_id && (
                      <button
                        onClick={() => openEditModal(shift)}
                        className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!saving) setEditing(null) }}
          />

          {/* Modal card */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Adjust shift times</h2>
            <p className="text-xs text-gray-400 mb-5">
              Original times will be saved for reference.
            </p>

            {/* Check-in time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Check-in time
              </label>
              <input
                type="time"
                value={editing.checkin_time}
                onChange={e => setEditing({ ...editing, checkin_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Check-out time */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Check-out time
              </label>
              <input
                type="time"
                value={editing.checkout_time}
                onChange={e => setEditing({ ...editing, checkout_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Reason */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={editing.reason}
                onChange={e => setEditing({ ...editing, reason: e.target.value })}
                placeholder="e.g. Employee forgot to check out"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {saveError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {saveError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </>
                ) : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}