import { NextRequest, NextResponse } from 'next/server'
import { getGoogleOAuthClient } from '@/lib/google'

export async function GET(req: NextRequest) {
  const oauth2Client = getGoogleOAuthClient()

  const businessId = req.nextUrl.searchParams.get('business_id')

  if (!businessId) {
    return NextResponse.redirect(new URL('/dashboard/availability?google=error', req.url))
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: businessId,
  })

  return NextResponse.redirect(url)
}