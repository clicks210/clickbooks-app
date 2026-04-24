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

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const businessId = searchParams.get('business_id')
  const serviceId = searchParams.get('service_id')
  const date = searchParams.get('date')

  if (!businessId || !serviceId || !date) {
    return NextResponse.json(
      { error: 'Missing business_id, service_id, or date' },
      { status: 400 }
    )
  }

  const selectedDate = new Date(`${date}T12:00:00`)
  const dayOfWeek = selectedDate.getDay()

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

  const { data: requestedService, error: requestedServiceError } = await supabase
    .from('services')
    .select('id, duration_minutes')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .single<Service>()

  if (requestedServiceError || !requestedService) {
    return NextResponse.json(
      { error: 'Service not found' },
      { status: 404 }
    )
  }

  const requestedDuration = Number(requestedService.duration_minutes)

  if (!requestedDuration || requestedDuration <= 0) {
    return NextResponse.json(
      { error: 'Service missing valid duration_minutes' },
      { status: 400 }
    )
  }

  const requestedBlockedMinutes = requestedDuration + bookingBufferMinutes

  const { data: rules, error: rulesError } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('business_id', businessId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .returns<AvailabilityRule[]>()

  if (rulesError) {
    return NextResponse.json(
      { error: rulesError.message },
      { status: 500 }
    )
  }

  if (!rules || rules.length === 0) {
    return NextResponse.json({ slots: [] })
  }

  const slotIntervalMinutes = 30

  const allCandidateSlots = rules.flatMap((rule) =>
    generateStartTimesForRange(
      String(rule.start_time).slice(0, 5),
      String(rule.end_time).slice(0, 5),
      requestedBlockedMinutes,
      slotIntervalMinutes
    )
  )

  const uniqueSlots = [...new Set(allCandidateSlots)].sort()

  const { data: bookings, error: bookingsError } = await supabase
    .from('public_booking_times')
    .select('booking_time, service_id')
    .eq('business_id', businessId)
    .eq('booking_date', date)
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

  const availableSlots = uniqueSlots.filter((candidateSlot) => {
    const candidateStart = timeToMinutes(candidateSlot)
    const candidateEnd = candidateStart + requestedBlockedMinutes

    for (const booking of bookings || []) {
      const bookedDuration = bookedServiceDurations.get(booking.service_id)

      if (!bookedDuration || bookedDuration <= 0) continue

      const bookedBlockedMinutes = bookedDuration + bookingBufferMinutes
      const bookedStart = timeToMinutes(String(booking.booking_time).slice(0, 5))
      const bookedEnd = bookedStart + bookedBlockedMinutes

      if (rangesOverlap(candidateStart, candidateEnd, bookedStart, bookedEnd)) {
        return false
      }
    }

    return true
  })

  return NextResponse.json({
    slots: availableSlots,
    duration_minutes: requestedDuration,
    booking_buffer_minutes: bookingBufferMinutes,
    slot_interval_minutes: slotIntervalMinutes,
  })
}