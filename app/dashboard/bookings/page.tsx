'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatTimeLabel } from '@/lib/availability'
import {
  Archive,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Inbox,
  Mail,
  Phone,
  RotateCcw,
  User,
  Wrench,
} from 'lucide-react'

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

function StatusBadge({ status, isToday, archived }: { status: string; isToday: boolean; archived?: boolean }) {
  if (archived) {
    return <span className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">Archived</span>
  }

  if (status === 'complete') {
    return <span className="badge-success">Complete</span>
  }

  if (isToday) {
    return <span className="badge-warning">Today</span>
  }

  return <span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent-faint)] px-3 py-1 text-xs font-semibold text-[#dd6b20]">Scheduled</span>
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface rounded-[24px] bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-[var(--text-muted)]">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
    </div>
  )
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
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
        </div>

        <div className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--text-muted)] shadow-sm">
          {count} item{count === 1 ? '' : 's'}
        </div>
      </div>

      {children}
    </section>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="surface rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[#dd6b20]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
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

  async function updateBooking(id: string, updates: Partial<BookingRow>, successMessage: string) {
    setWorkingId(id)
    setMessage('')
    setMessageType('')

    const { error } = await supabase.from('bookings').update(updates).eq('id', id)

    if (error) {
      setMessage(`Error updating booking: ${error.message}`)
      setMessageType('error')
    } else {
      setBookings((prev) => prev.map((booking) => (booking.id === id ? { ...booking, ...updates } : booking)))
      setMessage(successMessage)
      setMessageType('success')
    }

    setWorkingId(null)
  }

  const todayStr = useMemo(() => getTodayString(), [])

  const activeBookings = useMemo(() => bookings.filter((b) => !b.archived), [bookings])

  const todayBookings = useMemo(
    () => activeBookings.filter((b) => b.booking_date === todayStr && b.status === 'scheduled').sort(sortBookingsAsc),
    [activeBookings, todayStr]
  )

  const scheduledBookings = useMemo(
    () =>
      activeBookings
        .filter((b) => b.status === 'scheduled' && b.booking_date !== todayStr && b.booking_date >= todayStr)
        .sort(sortBookingsAsc),
    [activeBookings, todayStr]
  )

  const completeBookings = useMemo(
    () => activeBookings.filter((b) => b.status === 'complete').sort(sortBookingsDesc),
    [activeBookings]
  )

  const archivedBookings = useMemo(() => bookings.filter((b) => b.archived).sort(sortBookingsDesc), [bookings])

  const scheduledCount = activeBookings.filter((b) => b.status === 'scheduled').length
  const completeCount = activeBookings.filter((b) => b.status === 'complete').length
  const archivedCount = archivedBookings.length

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="surface rounded-[24px] bg-white p-6 shadow-sm">
          <p className="text-[var(--text-secondary)]">Loading bookings...</p>
        </div>
      </main>
    )
  }

  function renderBookingCard(booking: BookingRow) {
    const isToday = booking.booking_date === todayStr
    const isComplete = booking.status === 'complete'
    const isArchived = !!booking.archived

    return (
      <div key={booking.id} className="surface rounded-[28px] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold tracking-tight">{booking.customer_name}</h3>
                  <StatusBadge status={booking.status} isToday={isToday} archived={isArchived} />
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Wrench className="h-4 w-4 text-[var(--text-muted)]" />
                    {booking.services?.name || 'Service'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarCheck className="h-4 w-4 text-[var(--text-muted)]" />
                    {formatDateLabel(booking.booking_date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-[var(--text-muted)]" />
                    {formatTimeLabel(booking.booking_time.slice(0, 5))}
                  </span>
                </div>
              </div>

              <div className="shrink-0 rounded-full bg-[var(--bg-soft)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                Submitted {new Date(booking.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </p>
                <p className="break-all text-sm font-medium text-[var(--text-primary)]">{booking.customer_email}</p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{booking.customer_phone || 'Not provided'}</p>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  <User className="h-3.5 w-3.5" />
                  Notes
                </p>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">{booking.notes}</p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {!isComplete && !isArchived && (
                <button
                  type="button"
                  disabled={workingId === booking.id}
                  onClick={() => updateBooking(booking.id, { status: 'complete' }, 'Booking marked as complete.')}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--success-soft)] px-4 py-2 text-sm font-semibold text-[var(--success)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {workingId === booking.id ? 'Saving...' : 'Mark complete'}
                </button>
              )}

              {!isArchived && (
                <button
                  type="button"
                  disabled={workingId === booking.id}
                  onClick={() => updateBooking(booking.id, { archived: true }, 'Booking archived.')}
                  className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                >
                  <Archive className="h-4 w-4" />
                  {workingId === booking.id ? 'Saving...' : 'Archive'}
                </button>
              )}

              {isArchived && (
                <button
                  type="button"
                  disabled={workingId === booking.id}
                  onClick={() => updateBooking(booking.id, { archived: false }, 'Booking restored.')}
                  className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                >
                  <RotateCcw className="h-4 w-4" />
                  {workingId === booking.id ? 'Saving...' : 'Restore'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
        
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Bookings</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Manage today’s jobs, upcoming appointments, completed work, and archived history.
          </p>
        </div>

        <Link
          href="/dashboard/customers"
          className="btn-secondary inline-flex w-fit items-center justify-center gap-2 rounded-full text-sm font-semibold"
        >
          <User className="h-4 w-4" />
          View customers
        </Link>
      </div>

      {message && (
        <div className={messageType === 'success' ? 'badge-success w-fit rounded-2xl px-4 py-3' : 'badge-danger w-fit rounded-2xl px-4 py-3'}>
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Today" value={todayBookings.length} icon={Clock3} />
        <StatCard label="Scheduled" value={scheduledCount} icon={CalendarCheck} />
        <StatCard label="Complete" value={completeCount} icon={CheckCircle2} />
        <StatCard label="Archived" value={archivedCount} icon={Archive} />
      </div>

      <div className="space-y-10">
        <Section title="Today" subtitle="Bookings happening today that still need attention." count={todayBookings.length}>
          {todayBookings.length === 0 ? <EmptyState message="No bookings for today." /> : <div className="space-y-4">{todayBookings.map(renderBookingCard)}</div>}
        </Section>

        <Section title="Upcoming" subtitle="Future bookings that are active and scheduled." count={scheduledBookings.length}>
          {scheduledBookings.length === 0 ? <EmptyState message="No scheduled upcoming bookings." /> : <div className="space-y-4">{scheduledBookings.map(renderBookingCard)}</div>}
        </Section>

        <Section title="Complete" subtitle="Finished jobs that are still visible in the main dashboard." count={completeBookings.length}>
          {completeBookings.length === 0 ? <EmptyState message="No completed bookings yet." /> : <div className="space-y-4">{completeBookings.map(renderBookingCard)}</div>}
        </Section>

        <Section title="Archived" subtitle="Hidden history you can restore anytime." count={archivedBookings.length}>
          {archivedBookings.length === 0 ? <EmptyState message="No archived bookings." /> : <div className="space-y-4">{archivedBookings.map(renderBookingCard)}</div>}
        </Section>
      </div>
    </main>
  )
}
