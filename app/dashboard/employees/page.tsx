'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Employee = {
  id: string
  full_name: string
  email: string
  status: string
  invite_accepted: boolean
  created_at: string
}

export default function EmployeesPage() {
  const supabase = createClient()
const [employees, setEmployees] = useState<Employee[]>([])
const [loading, setLoading] = useState(true)
const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string>('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, subscription_status')
      .eq('owner_id', user.id)
      .single()

    if (!business) return
    setBusinessId(business.id)
    setSubscriptionStatus(business.subscription_status)
    setBusinessName(business.name ?? '')

    const { data: emps } = await supabase
      .from('employees')
      .select('id, full_name, email, status, invite_accepted, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true })

    setEmployees(emps ?? [])
    setLoading(false)
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      if (!businessId) throw new Error('Business not found.')

      const { error: empError } = await supabase
        .from('employees')
        .insert({
          full_name: name,
          email,
          business_id: businessId,
          status: 'active',
          invite_accepted: false,
        })

      if (empError) throw empError

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, employeeName: name, businessName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invite email.')
      }

      setSuccess(`Invite sent to ${email}!`)
      setName('')
      setEmail('')
      setShowForm(false)
      loadEmployees()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleResendInvite = async (empEmail: string) => {
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: empEmail }),
      })
      if (!res.ok) throw new Error('Failed to resend invite.')
      setSuccess(`Invite resent to ${empEmail}!`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setError(message)
    }
  }

  const handleDeactivate = async (id: string) => {
    await supabase.from('employees').update({ status: 'inactive' }).eq('id', id)
    loadEmployees()
  }

  const handleReactivate = async (id: string) => {
    await supabase.from('employees').update({ status: 'active' }).eq('id', id)
    loadEmployees()
  }
  const handleDelete = async (emp: Employee) => {
    setDeleting(true)
    await fetch('/api/delete-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: emp.id }),
    })
    setConfirmDeleteId(null)
    setDeleting(false)
    loadEmployees()
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Employees</h1>
        {subscriptionStatus === 'active' || subscriptionStatus === 'trialing' ? (
          <button
            onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            + Add Employee
          </button>
        ) : (
          <a
            href="/dashboard/upgrade"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
          >
            + Add Employee
          </a>
        )}
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Add employee form */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Employee</h2>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Ana Novak"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ana@yourbusiness.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {saving ? 'Sending invite…' : 'Send invite'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee list */}
      {employees.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-12 text-center text-gray-400 text-sm">
          No employees yet. Add your first employee above.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {employees.map(emp => (
            <div key={emp.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className={`font-medium ${emp.status === 'inactive' ? 'text-gray-400' : 'text-gray-900'}`}>
                  {emp.full_name}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{emp.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {emp.status === 'inactive' ? (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
                  ) : emp.invite_accepted ? (
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                  ) : (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Invite pending</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!emp.invite_accepted && emp.status === 'active' && (
                  <button
                    onClick={() => handleResendInvite(emp.email)}
                    className="text-xs text-green-600 hover:underline"
                  >
                    Resend invite
                  </button>
                )}
                {emp.status === 'active' ? (
                  <button
                    onClick={() => handleDeactivate(emp.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-2"
                  >
                    Deactivate
                  </button>
                ) : (
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => handleReactivate(emp.id)}
                      className="text-xs text-gray-400 hover:text-green-500 transition-colors"
                    >
                      Reactivate
                    </button>
                    {confirmDeleteId === emp.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-red-600">Sure?</span>
                        <button
                          onClick={() => handleDelete(emp)}
                          disabled={deleting}
                          className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          {deleting ? 'Deleting…' : 'Yes, delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(emp.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}