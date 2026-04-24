'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatTimeLabel } from '@/lib/availability'

type ProfileRow = {
  business_id: string
}

type BookingRow = {
  id: string
  business_id: string
  service_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  notes: string | null
  booking_date: string
  booking_time: string
  status: 'scheduled' | 'complete' | string
  archived?: boolean
  created_at: string
  services?: {
    name: string
  } | null
}

function formatDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sortBookingsAsc(a: BookingRow, b: BookingRow) {
  const aValue = `${a.booking_date}T${a.booking_time}`
  const bValue = `${b.booking_date}T${b.booking_time}`
  return aValue.localeCompare(bValue)
}

function sortBookingsDesc(a: BookingRow, b: BookingRow) {
  const aValue = `${a.booking_date}T${a.booking_time}`
  const bValue = `${b.booking_date}T${b.booking_time}`
  return bValue.localeCompare(aValue)
}

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string
  subtitle?: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
          {count} item{count === 1 ? '' : 's'}
        </div>
      </div>

      {children}
    </section>
  )
}

export default function BookingsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [workingId, setWorkingId] = useState<string | null>(null)

  async function loadBookings() {
    setLoading(true)
    setMessage('')
    setMessageType('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      router.push('/login')
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single<ProfileRow>()

    if (profileError || !profile?.business_id) {
      setMessage('Could not load your business profile.')
      setMessageType('error')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          name
        )
      `)
      .eq('business_id', profile.business_id)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })

    if (error) {
      setMessage(`Error loading bookings: ${error.message}`)
      setMessageType('error')
    } else {
      setBookings((data || []) as BookingRow[])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadBookings()
  }, [router, supabase])

  async function updateBooking(
    id: string,
    updates: Partial<BookingRow>,
    successMessage: string
  ) {
    setWorkingId(id)
    setMessage('')
    setMessageType('')

    const { error } = await supabase.from('bookings').update(updates).eq('id', id)

    if (error) {
      setMessage(`Error updating booking: ${error.message}`)
      setMessageType('error')
    } else {
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id ? { ...booking, ...updates } : booking
        )
      )
      setMessage(successMessage)
      setMessageType('success')
    }

    setWorkingId(null)
  }

  const todayStr = useMemo(() => getTodayString(), [])

  const activeBookings = useMemo(
    () => bookings.filter((b) => !b.archived),
    [bookings]
  )

  const todayBookings = useMemo(
    () =>
      activeBookings
        .filter((b) => b.booking_date === todayStr && b.status === 'scheduled')
        .sort(sortBookingsAsc),
    [activeBookings, todayStr]
  )

  const scheduledBookings = useMemo(
    () =>
      activeBookings
        .filter(
          (b) =>
            b.status === 'scheduled' &&
            b.booking_date !== todayStr &&
            b.booking_date >= todayStr
        )
        .sort(sortBookingsAsc),
    [activeBookings, todayStr]
  )

  const completeBookings = useMemo(
    () =>
      activeBookings
        .filter((b) => b.status === 'complete')
        .sort(sortBookingsDesc),
    [activeBookings]
  )

  const archivedBookings = useMemo(
    () => bookings.filter((b) => b.archived).sort(sortBookingsDesc),
    [bookings]
  )

  const scheduledCount = activeBookings.filter((b) => b.status === 'scheduled').length
  const completeCount = activeBookings.filter((b) => b.status === 'complete').length
  const archivedCount = archivedBookings.length

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="card p-6">
          <p>Loading bookings...</p>
        </div>
      </main>
    )
  }

  function renderBookingCard(booking: BookingRow) {
    const isToday = booking.booking_date === todayStr
    const isComplete = booking.status === 'complete'
    const isArchived = !!booking.archived

    return (
      <div
        key={booking.id}
        className="rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold">{booking.customer_name}</h3>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  isComplete
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                }`}
              >
                {isComplete ? 'Complete' : 'Scheduled'}
              </span>

              {isToday && !isArchived && (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                  Today
                </span>
              )}

              {isArchived && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  Archived
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
              <span>{booking.services?.name || 'Service'}</span>
              <span>{formatDateLabel(booking.booking_date)}</span>
              <span>{formatTimeLabel(booking.booking_time.slice(0, 5))}</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Email
                </p>
                <p className="mt-2 break-all text-sm">{booking.customer_email}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Phone
                </p>
                <p className="mt-2 text-sm">
                  {booking.customer_phone || 'Not provided'}
                </p>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-4 rounded-xl border border-white/10 bg-[var(--surface)] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Notes
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {booking.notes}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {!isComplete && !isArchived && (
                <button
                  type="button"
                  disabled={workingId === booking.id}
                  onClick={() =>
                    updateBooking(
                      booking.id,
                      { status: 'complete' },
                      'Booking marked as complete.'
                    )
                  }
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {workingId === booking.id ? 'Saving...' : 'Mark as complete'}
                </button>
              )}

              {!isArchived && (
                <button
                  type="button"
                  disabled={workingId === booking.id}
                  onClick={() =>
                    updateBooking(
                      booking.id,
                      { archived: true },
                      'Booking archived.'
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {workingId === booking.id ? 'Saving...' : 'Archive'}
                </button>
              )}

              {isArchived && (
                <button
                  type="button"
                  disabled={workingId === booking.id}
                  onClick={() =>
                    updateBooking(
                      booking.id,
                      { archived: false },
                      'Booking restored.'
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {workingId === booking.id ? 'Saving...' : 'Unarchive'}
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-[var(--text-muted)]">
            Submitted {new Date(booking.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="space-y-8">
      <div>
        
        <h1 className="text-3xl font-semibold md:text-4xl">
          Bookings
        </h1>
        
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            messageType === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Today
          </p>
          <p className="mt-2 text-3xl font-semibold">{todayBookings.length}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Scheduled
          </p>
          <p className="mt-2 text-3xl font-semibold">{scheduledCount}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Complete
          </p>
          <p className="mt-2 text-3xl font-semibold">{completeCount}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Archived
          </p>
          <p className="mt-2 text-3xl font-semibold">{archivedCount}</p>
        </div>
      </div>

      <div className="space-y-10">
        <Section
          title="Today"
          subtitle="Bookings happening today that still need attention."
          count={todayBookings.length}
        >
          {todayBookings.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-[var(--text-secondary)]">
                No bookings for today.
              </p>
            </div>
          ) : (
            <div className="space-y-4">{todayBookings.map(renderBookingCard)}</div>
          )}
        </Section>

        <Section
          title="Scheduled / Upcoming"
          subtitle="Future bookings that are booked and active."
          count={scheduledBookings.length}
        >
          {scheduledBookings.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-[var(--text-secondary)]">
                No scheduled upcoming bookings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">{scheduledBookings.map(renderBookingCard)}</div>
          )}
        </Section>

        <Section
          title="Complete"
          subtitle="Finished jobs that are still visible in the main dashboard."
          count={completeBookings.length}
        >
          {completeBookings.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-[var(--text-secondary)]">
                No completed bookings yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">{completeBookings.map(renderBookingCard)}</div>
          )}
        </Section>

        <Section
          title="Archived"
          subtitle="Hidden history you can restore anytime."
          count={archivedBookings.length}
        >
          {archivedBookings.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-[var(--text-secondary)]">
                No archived bookings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">{archivedBookings.map(renderBookingCard)}</div>
          )}
        </Section>
      </div>
    </main>
  )
}