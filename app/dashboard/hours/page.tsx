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
  adjustment_reason: string | null
}

type EditingShift = {
  checkin_id: string
  checkout_id: string | null  // null = missing checkout, will INSERT instead of UPDATE
  checkin_time: string
  checkout_time: string
  date_iso: string
  reason: string
  employee_id: string
  business_id: string
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
  const [businessId, setBusinessId] = useState('')

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
    setBusinessId(business.id)

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
.select('id, type, timestamp, manually_adjusted, adjustment_reason')      .eq('employee_id', selectedEmp)
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

    checkins.forEach((ci) => {
      // Find the first checkout that comes after this checkin
      const co = checkouts.find(co => co.timestamp > ci.timestamp) ?? null
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
        adjustment_reason: ci.adjustment_reason || co?.adjustment_reason || null,
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

  const toLocalTimeInput = (iso: string) => {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const toLocalDateString = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const toISOFromLocalDateTime = (dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)
    const d = new Date(year, month - 1, day, hours, minutes, 0, 0)
    return d.toISOString()
  }

  const openEditModal = (shift: ShiftRow) => {
    if (!shift.checkin_id || !shift.checkin) return
    setSaveError('')

    // Default checkout: existing checkout time, or checkin + 8h capped at 23:59
    const defaultCheckout = shift.checkout
      ? toLocalTimeInput(shift.checkout)
      : (() => {
          const d = new Date(shift.checkin)
          d.setHours(d.getHours() + 8)
          if (d.getDate() !== new Date(shift.checkin).getDate()) d.setHours(23, 59)
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        })()

    setEditing({
      checkin_id: shift.checkin_id,
      checkout_id: shift.checkout_id,
      checkin_time: toLocalTimeInput(shift.checkin),
      checkout_time: defaultCheckout,
      date_iso: toLocalDateString(shift.checkin),
      reason: '',
      employee_id: selectedEmp,
      business_id: businessId,
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

    // Always update the check-in row
    const { data: origCheckinData } = await supabase
      .from('time_logs')
      .select('timestamp')
      .eq('id', editing.checkin_id)
      .single()

    const { error: err1 } = await supabase
      .from('time_logs')
      .update({
        timestamp: newCheckinISO,
        manually_adjusted: true,
        adjusted_by: ownerName,
        adjustment_reason: editing.reason.trim(),
        original_timestamp: origCheckinData?.timestamp ?? null,
      })
      .eq('id', editing.checkin_id)

    if (err1) {
      setSaveError('Failed to save. Please try again.')
      setSaving(false)
      return
    }

    if (editing.checkout_id) {
      // UPDATE existing checkout row
      const { data: origCheckoutData } = await supabase
        .from('time_logs')
        .select('timestamp')
        .eq('id', editing.checkout_id)
        .single()

      const { error: err2 } = await supabase
        .from('time_logs')
        .update({
          timestamp: newCheckoutISO,
          manually_adjusted: true,
          adjusted_by: ownerName,
          adjustment_reason: editing.reason.trim(),
          original_timestamp: origCheckoutData?.timestamp ?? null,
        })
        .eq('id', editing.checkout_id)

      if (err2) {
        setSaveError('Failed to save check-out. Please try again.')
        setSaving(false)
        return
      }
    } else {
      // INSERT missing checkout row
      const { error: err2 } = await supabase
        .from('time_logs')
        .insert({
          employee_id: editing.employee_id,
          business_id: editing.business_id,
          type: 'checkout',
          timestamp: newCheckoutISO,
          lat: 0,
          lng: 0,
          within_radius: true,
          manually_adjusted: true,
          adjusted_by: ownerName,
          adjustment_reason: editing.reason.trim(),
        })

      if (err2) {
        setSaveError('Failed to add check-out. Please try again.')
        setSaving(false)
        return
      }
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
                <div key={i} className={`px-5 py-4 text-sm ${shift.manually_adjusted ? '' : ''}`}>
                  <div className="grid grid-cols-5 items-center">
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
                    {shift.checkin_id && (
                      <button
                        onClick={() => openEditModal(shift)}
                        className={`text-xs border rounded-lg px-2.5 py-1 transition-colors ${
                          !shift.checkout_id
                            ? 'text-amber-600 border-amber-200 hover:border-amber-400 hover:text-amber-800'
                            : 'text-gray-400 hover:text-gray-700 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {!shift.checkout_id ? 'Add checkout' : 'Edit'}
                      </button>
                    )}
                  </span>
                  </div>
                  {shift.manually_adjusted && shift.adjustment_reason && (
                    <p className="mt-1.5 text-xs text-amber-600 col-span-5">
                      ✎ Adjusted: {shift.adjustment_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit / Add checkout Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!saving) setEditing(null) }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              {editing.checkout_id ? 'Adjust shift times' : 'Add missing checkout'}
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              {editing.checkout_id
                ? 'Original times will be saved for reference.'
                : 'Set the checkout time for this shift.'}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-in time</label>
              <input
                type="time"
                value={editing.checkin_time}
                onChange={e => setEditing({ ...editing, checkin_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-out time</label>
              <input
                type="time"
                value={editing.checkout_time}
                onChange={e => setEditing({ ...editing, checkout_time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

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
