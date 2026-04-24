import { google } from 'googleapis'

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export async function createGoogleCalendarEvent({
  accessToken,
  refreshToken,
  startDateTime,
  endDateTime,
  summary,
  description,
}: {
  accessToken: string
  refreshToken: string
  startDateTime: string
  endDateTime: string
  summary: string
  description: string
}) {
  const oauth2Client = getGoogleOAuthClient()

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  const calendar = google.calendar({
    version: 'v3',
    auth: oauth2Client,
  })

  return await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Vancouver',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Vancouver',
      },
    },
  })
}