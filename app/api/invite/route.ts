import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email, employeeName, businessName } = await request.json()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured.' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://zummo.app/invite/accept',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await resend.emails.send({
      from: 'Zummo <onboarding@resend.dev>', 
      to: email,
      subject: `You've been invited to ${businessName} on Zummo`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background:#22c55e;padding:32px 40px;text-align:center;">
                        <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Zummo</p>
                        <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Employee Time Tracking</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding:40px;">
                        <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111827;">You've been invited</h1>
                        <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                          Hi ${employeeName}, <strong>${businessName}</strong> has invited you to track your work hours with Zummo.
                        </p>
                        
                        <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                          Click the button below to set up your account and start checking in.
                        </p>

                        <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                          <tr>
                            <td style="background:#22c55e;border-radius:10px;">
                              <a href="https://zummo.app/invite/accept"
                                 style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                                Accept invitation
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                          This invitation was sent by ${businessName}. If you weren't expecting this, you can ignore this email.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Zummo · zummo.app</p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}