'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Employee = {
  id: string
  full_name: string
  email: string
}

export default function ReportsPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (!business) return
    setBusinessId(business.id)
    setBusinessName(business.name)

    const { data: emps } = await supabase
      .from('employees')
      .select('id, full_name, email')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .order('full_name')

    setEmployees(emps ?? [])
    setLoading(false)
  }

  const handleExport = async () => {
    setGenerating(true)

    try {
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999)

      const { data: logs } = await supabase
        .from('time_logs')
        .select('employee_id, type, timestamp, manually_adjusted, adjusted_by')
        .eq('business_id', businessId!)
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString())
        .order('timestamp', { ascending: true })

      // Build rows for CSV
      const rows: string[][] = []
      rows.push(['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Minutes', 'Adjusted'])

      employees.forEach(emp => {
        const empLogs = (logs ?? []).filter(l => l.employee_id === emp.id)
        const checkins = empLogs.filter(l => l.type === 'checkin')
        const checkouts = empLogs.filter(l => l.type === 'checkout')

        checkins.forEach((ci, i) => {
          const co = checkouts[i] ?? null
          const date = new Date(ci.timestamp).toLocaleDateString('en-GB')
          const checkinTime = new Date(ci.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          const checkoutTime = co ? new Date(co.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
          const minutes = co ? Math.floor((new Date(co.timestamp).getTime() - new Date(ci.timestamp).getTime()) / 60000) : 0
          const hours = (minutes / 60).toFixed(2)
          const adjusted = (ci.manually_adjusted || co?.manually_adjusted) ? 'Yes' : 'No'

          rows.push([emp.full_name, date, checkinTime, checkoutTime, hours, String(minutes), adjusted])
        })

        // Add total row per employee
        const totalMins = checkins.reduce((sum, ci, i) => {
          const co = checkouts[i]
          if (!co) return sum
          return sum + Math.floor((new Date(co.timestamp).getTime() - new Date(ci.timestamp).getTime()) / 60000)
        }, 0)

        if (checkins.length > 0) {
          rows.push([emp.full_name, 'TOTAL', '', '', (totalMins / 60).toFixed(2), String(totalMins), ''])
          rows.push([]) // empty row between employees
        }
      })

      // Convert to CSV
      const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const monthName = new Date(year, month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      a.href = url
      a.download = `${businessName} - Hours ${monthName}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const monthName = new Date(year, month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: new Date(year, i).toLocaleDateString('en-GB', { month: 'long' })
  }))

  const years = [now.getFullYear() - 1, now.getFullYear()]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Reports</h1>
      <p className="text-gray-500 text-sm mb-8">Export a monthly hours report for your accountant.</p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Monthly Hours Export</h2>

        <div className="flex gap-3 mb-6">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">What's included:</p>
          <ul className="space-y-1">
            <li>• All {employees.length} active employee{employees.length !== 1 ? 's' : ''}</li>
            <li>• Every shift in {monthName}</li>
            <li>• Check-in and check-out times</li>
            <li>• Total hours per shift and per employee</li>
            <li>• Flags for manually adjusted entries</li>
          </ul>
        </div>

        <button
          onClick={handleExport}
          disabled={generating || employees.length === 0}
          className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {generating ? 'Generating…' : `Download ${monthName} report`}
        </button>

        {employees.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-3">Add employees first to generate a report.</p>
        )}
      </div>
    </div>
  )
}