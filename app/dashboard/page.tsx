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

type TimeLog = {
  id: string
  employee_id: string
  type: string
  timestamp: string
}

type EmployeeWithLogs = Employee & {
  checkinTime: string | null
  checkoutTime: string | null
  totalMinutes: number | null
  isCheckedIn: boolean
}

export default function DashboardPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<EmployeeWithLogs[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  // Tick every minute to update live clocks
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
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
      .select('id, full_name, email, status')
      .eq('business_id', business.id)
      .eq('status', 'active')

    if (!emps) return

    // Get today's time logs for all employees
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
      const checkin = empLogs.find(l => l.type === 'checkin')
const checkout = empLogs.filter(l => l.type === 'checkout').pop()

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
    setLoading(false)
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const liveMinutes = (checkinIso: string) =>
    Math.floor((now.getTime() - new Date(checkinIso).getTime()) / 60000)

  const checkedIn = employees.filter(e => e.isCheckedIn)
  const flags = employees.filter(e => e.isCheckedIn && e.checkinTime && liveMinutes(e.checkinTime) > 600)

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
                <div className="text-right">
                  <p className="text-sm text-gray-500">Since {formatTime(emp.checkinTime!)}</p>
                  <p className="text-sm font-semibold text-green-600">
                    {formatDuration(liveMinutes(emp.checkinTime!))}
                  </p>
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
                className={`flex items-center justify-between px-5 py-4 ${
                  !emp.checkinTime ? 'opacity-50' : ''
                }`}
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
      {flags.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Flags</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl divide-y divide-amber-100">
            {flags.map(emp => (
              <div key={emp.id} className="flex items-center justify-between px-5 py-4">
                <span className="font-medium text-amber-900">{emp.full_name}</span>
                <span className="text-sm text-amber-700">
                  Checked in for {formatDuration(liveMinutes(emp.checkinTime!))} — no checkout
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}