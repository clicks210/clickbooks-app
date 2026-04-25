'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  CalendarCheck,
  Mail,
  Phone,
  User,
  Users,
} from 'lucide-react'

type ProfileRow = {
  business_id: string
}

type BookingRow = {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  booking_date: string
  booking_time: string
  status: 'scheduled' | 'complete' | string
  archived?: boolean | null
  created_at: string
  services?: {
    name: string
  } | null
}

type CustomerRow = {
  key: string
  name: string
  email: string
  phone: string | null
  bookingCount: number
  lastBookingDate: string
  lastService: string
  hasUpcoming: boolean
}

function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface rounded-[24px] bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-[var(--text-muted)]">
        <Users className="h-6 w-6" />
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{message}</p>
    </div>
  )
}

export default function CustomersPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')

  async function loadCustomers() {
    setLoading(true)
    setMessage('')

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
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        booking_date,
        booking_time,
        status,
        archived,
        created_at,
        services (
          name
        )
      `)
      .eq('business_id', profile.business_id)
      .order('customer_name', { ascending: true })
      .returns<BookingRow[]>()

    if (error) {
      setMessage(`Error loading customers: ${error.message}`)
    } else {
      setBookings(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadCustomers()
  }, [router, supabase])

  const todayStr = useMemo(() => getTodayString(), [])

  const customers = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow>()

    bookings.forEach((booking) => {
      const emailKey = booking.customer_email?.trim().toLowerCase()
      const nameKey = booking.customer_name?.trim().toLowerCase()
      const key = emailKey || nameKey || booking.id
      const existing = map.get(key)

      const isUpcoming =
        !booking.archived &&
        booking.status === 'scheduled' &&
        booking.booking_date >= todayStr

      const serviceName = booking.services?.name || 'Service'

      if (!existing) {
        map.set(key, {
          key,
          name: booking.customer_name || 'Unnamed customer',
          email: booking.customer_email || 'No email',
          phone: booking.customer_phone,
          bookingCount: 1,
          lastBookingDate: booking.booking_date,
          lastService: serviceName,
          hasUpcoming: isUpcoming,
        })
        return
      }

      const isNewer = booking.booking_date > existing.lastBookingDate

      map.set(key, {
        ...existing,
        phone: existing.phone || booking.customer_phone,
        bookingCount: existing.bookingCount + 1,
        lastBookingDate: isNewer ? booking.booking_date : existing.lastBookingDate,
        lastService: isNewer ? serviceName : existing.lastService,
        hasUpcoming: existing.hasUpcoming || isUpcoming,
      })
    })

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [bookings, todayStr])

  const filteredCustomers = useMemo(() => {
    const term = query.trim().toLowerCase()

    if (!term) return customers

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        (customer.phone || '').toLowerCase().includes(term)
      )
    })
  }, [customers, query])

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="surface rounded-[24px] bg-white p-6 shadow-sm">
          <p className="text-[var(--text-secondary)]">Loading customers...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/dashboard/bookings"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to bookings
          </Link>

          
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Customers</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Everyone who has booked with you, sorted alphabetically.
          </p>
        </div>
      </div>

      {message && (
        <div className="badge-danger w-fit rounded-2xl px-4 py-3">
          {message}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            {filteredCustomers.length} customer{filteredCustomers.length === 1 ? '' : 's'}
          </p>

          <div className="w-full md:max-w-sm">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers..."
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <EmptyState message={query ? 'No customers match your search.' : 'No customers yet.'} />
        ) : (
          <div className="surface overflow-hidden rounded-[28px] bg-white shadow-sm">
            <div className="hidden grid-cols-[1.2fr_1.4fr_1fr_0.8fr_1fr] border-b border-[var(--border)] bg-[var(--surface-alt)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] md:grid">
              <div>Name</div>
              <div>Email</div>
              <div>Phone</div>
              <div>Bookings</div>
              <div>Last booking</div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.key}
                  className="grid gap-4 px-5 py-5 transition hover:bg-[var(--surface-alt)] md:grid-cols-[1.2fr_1.4fr_1fr_0.8fr_1fr] md:items-center"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[#dd6b20]">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text-primary)]">{customer.name}</p>
                        {customer.hasUpcoming && (
                          <p className="mt-1 text-xs font-semibold text-[#dd6b20]">
                            Upcoming booking
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 text-sm text-[var(--text-secondary)]">
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] md:hidden">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </p>
                    <p className="truncate">{customer.email}</p>
                  </div>

                  <div className="text-sm text-[var(--text-secondary)]">
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] md:hidden">
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </p>
                    <p>{customer.phone || 'Not provided'}</p>
                  </div>

                  <div>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                      {customer.bookingCount} booking{customer.bookingCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="text-sm text-[var(--text-secondary)]">
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] md:hidden">
                      <CalendarCheck className="h-3.5 w-3.5" />
                      Last booking
                    </p>
                    <p>{formatDateLabel(customer.lastBookingDate)}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{customer.lastService}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
