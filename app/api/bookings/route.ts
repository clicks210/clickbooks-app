import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createGoogleCalendarEvent } from '@/lib/google'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

function formatDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTimeLabel(time: string) {
  const [hourStr, minuteStr] = time.slice(0, 5).split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)

  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12

  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${suffix}`
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatIcsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function buildGoogleCalendarLink({
  title,
  details,
  start,
  end,
}: {
  title: string
  details: string
  start: Date
  end: Date
}) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details,
    dates: `${formatIcsDate(start)}/${formatIcsDate(end)}`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function buildIcsFile({
  uid,
  title,
  description,
  start,
  end,
  organizerName,
  organizerEmail,
}: {
  uid: string
  title: string
  description: string
  start: Date
  end: Date
  organizerName: string
  organizerEmail?: string | null
}) {
  const dtStamp = formatIcsDate(new Date())
  const dtStart = formatIcsDate(start)
  const dtEnd = formatIcsDate(end)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//ClickBooks//Booking Confirmation//EN',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    organizerEmail
      ? `ORGANIZER;CN=${escapeIcsText(organizerName)}:mailto:${escapeIcsText(organizerEmail)}`
      : `ORGANIZER;CN=${escapeIcsText(organizerName)}:mailto:no-reply@clickbooks.app`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.join('\r\n')
}

export async function POST(req: Request) {
  const formData = await req.formData()

  const business_id = String(formData.get('business_id') || '').trim()
  const service_id = String(formData.get('service_id') || '').trim()
  const customer_name = String(formData.get('customer_name') || '').trim()
  const customer_email = String(formData.get('customer_email') || '').trim()
  const customer_phone = String(formData.get('customer_phone') || '').trim()
  const notes = String(formData.get('notes') || '').trim()
  const booking_date = String(formData.get('booking_date') || '').trim()
  const booking_time = String(formData.get('booking_time') || '').trim()

  if (
    !business_id ||
    !service_id ||
    !customer_name ||
    !customer_email ||
    !booking_date ||
    !booking_time
  ) {
    return NextResponse.json(
      { error: 'Missing required booking fields' },
      { status: 400 }
    )
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      slug,
      email,
      booking_buffer_minutes,
      google_connected,
      google_access_token,
      google_refresh_token
    `)
    .eq('id', business_id)
    .single()

  if (businessError || !business?.slug) {
    return NextResponse.json(
      { error: 'Business not found' },
      { status: 404 }
    )
  }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, name, duration_minutes')
    .eq('id', service_id)
    .eq('business_id', business_id)
    .single()

  if (serviceError || !service) {
    return NextResponse.redirect(
      new URL(`/widget/${business.slug}?error=1`, req.url),
      303
    )
  }

  const { data: insertedBooking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      business_id,
      service_id,
      customer_name,
      customer_email,
      customer_phone: customer_phone || null,
      notes: notes || null,
      booking_date,
      booking_time,
      status: 'scheduled',
      archived: false,
    })
    .select('id')
    .single()

  if (error || !insertedBooking) {
    console.error('booking insert error:', error)

    return NextResponse.redirect(
      new URL(`/widget/${business.slug}?error=1`, req.url),
      303
    )
  }

  const duration = Number(service.duration_minutes || 0)
  const buffer = Number(business.booking_buffer_minutes || 0)

  const startDateTime = `${booking_date}T${booking_time}:00`
  const start = new Date(startDateTime)
  const end = new Date(start.getTime() + duration * 60 * 1000)

  const calendarTitle = `${service.name} - ${business.name}`
  const calendarDescription = [
    `Booking with ${business.name}`,
    `Service: ${service.name}`,
    `Customer: ${customer_name}`,
    `Email: ${customer_email}`,
    `Phone: ${customer_phone || 'Not provided'}`,
    notes ? `Notes: ${notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const googleCalendarLink = buildGoogleCalendarLink({
    title: calendarTitle,
    details: calendarDescription,
    start,
    end,
  })

  const icsFile = buildIcsFile({
    uid: `${insertedBooking.id}@clickbooks`,
    title: calendarTitle,
    description: calendarDescription,
    start,
    end,
    organizerName: business.name,
    organizerEmail: business.email,
  })

  const icsBase64 = Buffer.from(icsFile, 'utf-8').toString('base64')

  if (
    business.google_connected &&
    business.google_access_token &&
    business.google_refresh_token
  ) {
    try {
      await createGoogleCalendarEvent({
        accessToken: business.google_access_token,
        refreshToken: business.google_refresh_token,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        summary: `${service.name} - ${customer_name}`,
        description: [
          `Customer: ${customer_name}`,
          `Email: ${customer_email}`,
          `Phone: ${customer_phone || 'Not provided'}`,
          `Service: ${service.name}`,
          notes ? `Notes: ${notes}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      })
    } catch (googleError) {
      console.error('google calendar event error:', googleError)
    }
  }

  if (
    business.email &&
    process.env.RESEND_API_KEY &&
    process.env.BOOKING_FROM_EMAIL
  ) {
    try {
      await resend.emails.send({
        from: `ClickBooks <${process.env.BOOKING_FROM_EMAIL}>`,
        to: business.email,
        replyTo: customer_email,
        subject: `New booking: ${customer_name} • ${service.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
            <h2 style="margin: 0 0 16px;">New booking received</h2>

            <p style="margin: 0 0 20px;">
              A new booking was submitted through your ClickBooks widget.
            </p>

            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px;"><strong>Business:</strong> ${business.name}</p>
              <p style="margin: 0 0 8px;"><strong>Service:</strong> ${service.name}</p>
              <p style="margin: 0 0 8px;"><strong>Date:</strong> ${formatDateLabel(booking_date)}</p>
              <p style="margin: 0 0 8px;"><strong>Time:</strong> ${formatTimeLabel(booking_time)}</p>
              <p style="margin: 0 0 8px;"><strong>Duration:</strong> ${duration} min</p>
              ${
                buffer > 0
                  ? `<p style="margin: 0 0 8px;"><strong>Buffer:</strong> ${buffer} min</p>`
                  : ''
              }
              <p style="margin: 0;"><strong>Status:</strong> Scheduled</p>
            </div>

            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px;"><strong>Customer:</strong> ${customer_name}</p>
              <p style="margin: 0 0 8px;"><strong>Email:</strong> ${customer_email}</p>
              <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${customer_phone || 'Not provided'}</p>
              <p style="margin: 0;"><strong>Notes:</strong> ${notes || 'None provided'}</p>
            </div>

            <p style="margin: 0; color: #6b7280;">
              Reply directly to this email to contact the customer.
            </p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('booking email error:', emailError)
    }
  }

  if (process.env.RESEND_API_KEY && process.env.BOOKING_FROM_EMAIL) {
    try {
      await resend.emails.send({
        from: `ClickBooks <${process.env.BOOKING_FROM_EMAIL}>`,
        to: customer_email,
        subject: `Your booking is confirmed — ${service.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
            <h2 style="margin: 0 0 16px;">Your booking is confirmed ✅</h2>

            <p style="margin: 0 0 20px;">
              Hi ${customer_name},
            </p>

            <p style="margin: 0 0 20px;">
              Your booking with <strong>${business.name}</strong> has been successfully scheduled.
            </p>

            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px;"><strong>Service:</strong> ${service.name}</p>
              <p style="margin: 0 0 8px;"><strong>Date:</strong> ${formatDateLabel(booking_date)}</p>
              <p style="margin: 0 0 8px;"><strong>Time:</strong> ${formatTimeLabel(booking_time)}</p>
              <p style="margin: 0;"><strong>Duration:</strong> ${duration} min</p>
            </div>

            ${
              notes
                ? `
                  <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <p style="margin: 0;"><strong>Your notes:</strong> ${notes}</p>
                  </div>
                `
                : ''
            }

            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 12px;"><strong>Add this booking to your calendar:</strong></p>
              <p style="margin: 0 0 10px;">
                <a
                  href="${googleCalendarLink}"
                  style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 10px; font-weight: 600;"
                >
                  Add to Google Calendar
                </a>
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                An Apple / Outlook calendar file is attached to this email.
              </p>
            </div>

            <p style="margin: 0 0 16px;">
              If you need to make any changes, please contact the business directly.
            </p>

            ${
              business.email
                ? `<p style="margin: 0 0 8px;"><strong>Email:</strong> ${business.email}</p>`
                : ''
            }

            <p style="margin-top: 24px; color: #6b7280;">
              Thanks for booking with ${business.name} — see you soon.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `booking-${insertedBooking.id}.ics`,
            content: icsBase64,
          },
        ],
      })
    } catch (customerEmailError) {
      console.error('customer confirmation email error:', customerEmailError)
    }
  }

  return NextResponse.redirect(
    new URL(`/widget/${business.slug}?success=1`, req.url),
    303
  )
}