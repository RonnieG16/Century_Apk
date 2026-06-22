import { createClient } from '@supabase/supabase-js'

// This route runs server-side only — the Resend API key never reaches the browser.
// Authorization is enforced two ways:
//   1. The caller must send a real Supabase access token.
//   2. That token is used to read the reset_requests row — Row Level Security only
//      allows that read for an actual admin, so a non-admin token gets a 403 here
//      even before we touch email sending.
export async function POST(req) {
  try {
    const { resetId } = await req.json()
    if (!resetId) {
      return Response.json({ error: 'Missing resetId' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: reset, error } = await supabase
      .from('reset_requests')
      .select('*')
      .eq('id', resetId)
      .single()

    if (error || !reset) {
      return Response.json({ error: 'Reset request not found, or you are not authorized to view it' }, { status: 403 })
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json({ error: 'Email sending is not configured (missing RESEND_API_KEY)' }, { status: 500 })
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Century App <onboarding@resend.dev>'

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: reset.email,
        subject: 'Your Century App password reset PIN',
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 420px; margin: 0 auto;">
            <h2 style="color: #7C3AED;">Century App</h2>
            <p>Here is your password reset PIN:</p>
            <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; background: #f5f3ff; color: #7C3AED; padding: 16px; border-radius: 12px; text-align: center;">
              ${reset.pin}
            </p>
            <p>Enter this PIN in the Century App to reset your password.</p>
            <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const errBody = await emailRes.text()
      return Response.json({ error: `Resend error: ${errBody}` }, { status: 502 })
    }

    await supabase.from('reset_requests').update({ admin_sent: true }).eq('id', resetId)

    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message || 'Unknown error' }, { status: 500 })
  }
}
