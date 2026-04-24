import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { getGoogleOAuthClient } from '@/lib/google'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const businessId = req.nextUrl.searchParams.get('state')

    if (!code || !businessId) {
      return NextResponse.redirect(
        new URL('/dashboard/availability?google=error', req.url)
      )
    }

    const oauth2Client = getGoogleOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    })

    const { data: me } = await oauth2.userinfo.get()

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        google_access_token: tokens.access_token || null,
        google_refresh_token: tokens.refresh_token || null,
        google_token_expiry: tokens.expiry_date || null,
        google_connected: true,
        google_calendar_email: me.email || null,
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('google callback update error:', updateError)
      return NextResponse.redirect(
        new URL('/dashboard/availability?google=error', req.url)
      )
    }

    return NextResponse.redirect(
      new URL('/dashboard/availability?google=success', req.url)
    )
  } catch (error) {
    console.error('google callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/availability?google=error', req.url)
    )
  }
}