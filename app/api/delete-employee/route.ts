import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { employeeId } = await req.json()

  // Verify this employee belongs to the owner's business
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const { data: emp } = await supabase
    .from('employees')
    .select('id, user_id')
    .eq('id', employeeId)
    .eq('business_id', business.id)
    .single()

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  // Delete time logs
  await supabase.from('time_logs').delete().eq('employee_id', emp.id)

  // Delete correction requests
  await supabase.from('correction_requests').delete().eq('employee_id', emp.id)

  // Delete employee row
  await supabase.from('employees').delete().eq('id', emp.id)

  // Delete auth user (requires service role key)
  if (emp.user_id) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await admin.auth.admin.deleteUser(emp.user_id)
  }

  return NextResponse.json({ success: true })
}