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
  minutes: number | null
  manually_adjusted: boolean
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
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!business) return

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
      .select('type, timestamp, manually_adjusted')
      .eq('employee_id', selectedEmp)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp', { ascending: true })

    if (!logs) {
      setShifts([])
      setShiftsLoading(false)
      return
    }

    // Group into shifts by pairing checkin/checkout
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
              <div className="grid grid-cols-4 px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <span>Date</span>
                <span>Check in</span>
                <span>Check out</span>
                <span className="text-right">Duration</span>
              </div>
              {shifts.map((shift, i) => (
                <div key={i} className="grid grid-cols-4 px-5 py-4 text-sm items-center">
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
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}