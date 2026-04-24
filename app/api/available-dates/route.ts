import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  generateStartTimesForRange,
  rangesOverlap,
  timeToMinutes,
} from '@/lib/availability'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type AvailabilityRule = {
  id: string
  business_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

type Service = {
  id: string
  duration_minutes: number
}

type Business = {
  id: string
  booking_buffer_minutes: number
}

type PublicBooking = {
  booking_time: string
  service_id: string
}

function formatDateLocal(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const businessId = searchParams.get('business_id')
    const serviceId = searchParams.get('service_id')

    if (!businessId || !serviceId) {
      return NextResponse.json(
        { error: 'Missing business_id or service_id' },
        { status: 400 }
      )
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, booking_buffer_minutes')
      .eq('id', businessId)
      .single<Business>()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const bookingBufferMinutes = Number(business.booking_buffer_minutes || 0)

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, duration_minutes')
      .eq('id', serviceId)
      .eq('business_id', businessId)
      .single<Service>()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: serviceError?.message || 'Service not found' },
        { status: 404 }
      )
    }

    const duration = Number(service.duration_minutes)

    if (!duration || duration <= 0) {
      return NextResponse.json(
        { error: 'Service missing valid duration_minutes' },
        { status: 400 }
      )
    }

    const requestedBlockedMinutes = duration + bookingBufferMinutes

    const { data: rules, error: rulesError } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .returns<AvailabilityRule[]>()

    if (rulesError) {
      return NextResponse.json(
        { error: rulesError.message },
        { status: 500 }
      )
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({ dates: [] })
    }

    const slotIntervalMinutes = 30
    const dates: string[] = []

    for (let offset = 0; offset < 21; offset++) {
      const date = new Date()
      date.setHours(12, 0, 0, 0)
      date.setDate(date.getDate() + offset)

      const dateStr = formatDateLocal(date)
      const dayOfWeek = date.getDay()

      const matchingRules = rules.filter(
        (rule) => Number(rule.day_of_week) === dayOfWeek
      )

      if (matchingRules.length === 0) continue

      const candidateSlots = matchingRules.flatMap((rule) =>
        generateStartTimesForRange(
          String(rule.start_time).slice(0, 5),
          String(rule.end_time).slice(0, 5),
          requestedBlockedMinutes,
          slotIntervalMinutes
        )
      )

      if (candidateSlots.length === 0) continue

      const { data: bookings, error: bookingsError } = await supabase
        .from('public_booking_times')
        .select('booking_time, service_id')
        .eq('business_id', businessId)
        .eq('booking_date', dateStr)
        .returns<PublicBooking[]>()

      if (bookingsError) {
        return NextResponse.json(
          { error: bookingsError.message },
          { status: 500 }
        )
      }

      const bookedServiceIds = [...new Set((bookings || []).map((b) => b.service_id))]
      let bookedServiceDurations = new Map<string, number>()

      if (bookedServiceIds.length > 0) {
        const { data: bookedServices, error: bookedServicesError } = await supabase
          .from('services')
          .select('id, duration_minutes')
          .in('id', bookedServiceIds)
          .returns<Service[]>()

        if (bookedServicesError) {
          return NextResponse.json(
            { error: bookedServicesError.message },
            { status: 500 }
          )
        }

        bookedServiceDurations = new Map(
          (bookedServices || []).map((service) => [
            service.id,
            Number(service.duration_minutes),
          ])
        )
      }

      const availableSlots = [...new Set(candidateSlots)]
        .sort()
        .filter((candidateSlot) => {
          const candidateStart = timeToMinutes(candidateSlot)
          const candidateEnd = candidateStart + requestedBlockedMinutes

          for (const booking of bookings || []) {
            const bookedDuration = bookedServiceDurations.get(booking.service_id)

            if (!bookedDuration || bookedDuration <= 0) continue

            const bookedBlockedMinutes = bookedDuration + bookingBufferMinutes
            const bookedStart = timeToMinutes(
              String(booking.booking_time).slice(0, 5)
            )
            const bookedEnd = bookedStart + bookedBlockedMinutes

            if (
              rangesOverlap(
                candidateStart,
                candidateEnd,
                bookedStart,
                bookedEnd
              )
            ) {
              return false
            }
          }

          return true
        })

      if (availableSlots.length > 0) {
        dates.push(dateStr)
      }
    }

    return NextResponse.json({
      dates,
      booking_buffer_minutes: bookingBufferMinutes,
    })
  } catch (error) {
    console.error('available-dates route error:', error)
    return NextResponse.json(
      { error: 'Unexpected server error in available-dates route' },
      { status: 500 }
    )
  }
}