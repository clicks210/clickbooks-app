'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ProfileRow = {
  business_id: string
}

type BusinessRow = {
  id: string
  booking_buffer_minutes: number
  google_connected: boolean
  google_calendar_email: string | null
}

type AvailabilityRule = {
  id: string
  business_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

type DayBlock = {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

const dayLabels = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const defaultDayHours: Record<number, { start: string; end: string }> = {
  0: { start: '09:00', end: '17:00' },
  1: { start: '09:00', end: '17:00' },
  2: { start: '09:00', end: '17:00' },
  3: { start: '09:00', end: '17:00' },
  4: { start: '09:00', end: '17:00' },
  5: { start: '09:00', end: '17:00' },
  6: { start: '09:00', end: '17:00' },
}

const bufferOptions = [0, 15, 30, 45, 60]

function normalizeTime(value: string) {
  return value.slice(0, 5)
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function hasOverlaps(blocks: DayBlock[]) {
  const sorted = [...blocks]
    .filter((b) => b.is_active)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = timeToMinutes(sorted[i].end_time)
    const nextStart = timeToMinutes(sorted[i + 1].start_time)

    if (currentEnd > nextStart) return true
  }

  return false
}

function hasInvalidRanges(blocks: DayBlock[]) {
  return blocks.some(
    (block) => timeToMinutes(block.end_time) <= timeToMinutes(block.start_time)
  )
}

export default function AvailabilityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [rules, setRules] = useState<DayBlock[]>([])
  const [originalRuleIds, setOriginalRuleIds] = useState<string[]>([])
  const [bookingBufferMinutes, setBookingBufferMinutes] = useState(0)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  useEffect(() => {
    const googleStatus = searchParams.get('google')

    if (googleStatus === 'success') {
      setMessage('Google Calendar connected successfully.')
      setMessageType('success')
    } else if (googleStatus === 'error') {
      setMessage('There was a problem connecting Google Calendar.')
      setMessageType('error')
    }
  }, [searchParams])

  useEffect(() => {
    async function loadAvailability() {
      setLoading(true)

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

      setBusinessId(profile.business_id)

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select(
          'id, booking_buffer_minutes, google_connected, google_calendar_email'
        )
        .eq('id', profile.business_id)
        .single<BusinessRow>()

      if (businessError || !business) {
        setMessage('Could not load your scheduling settings.')
        setMessageType('error')
        setLoading(false)
        return
      }

      setBookingBufferMinutes(Number(business.booking_buffer_minutes || 0))
      setGoogleConnected(Boolean(business.google_connected))
      setGoogleCalendarEmail(business.google_calendar_email || '')

      const { data: availabilityRows, error: availabilityError } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('business_id', profile.business_id)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (availabilityError) {
        setMessage(`Error loading availability: ${availabilityError.message}`)
        setMessageType('error')
        setLoading(false)
        return
      }

      const mapped = ((availabilityRows || []) as AvailabilityRule[]).map(
        (row) => ({
          id: row.id,
          day_of_week: row.day_of_week,
          start_time: normalizeTime(row.start_time),
          end_time: normalizeTime(row.end_time),
          is_active: row.is_active,
        })
      )

      setRules(mapped)
      setOriginalRuleIds(mapped.map((rule) => rule.id!).filter(Boolean))
      setLoading(false)
    }

    loadAvailability()
  }, [router, supabase])

  const groupedRules = useMemo(() => {
    return dayLabels.map((label, dayIndex) => ({
      dayIndex,
      label,
      blocks: rules
        .filter((rule) => rule.day_of_week === dayIndex && rule.is_active)
        .sort(
          (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        ),
    }))
  }, [rules])

  function addBlock(dayIndex: number) {
    setRules((prev) => [
      ...prev,
      {
        day_of_week: dayIndex,
        start_time: defaultDayHours[dayIndex].start,
        end_time: defaultDayHours[dayIndex].end,
        is_active: true,
      },
    ])
  }

  function updateBlock(
    dayIndex: number,
    blockIndex: number,
    field: 'start_time' | 'end_time',
    value: string
  ) {
    setRules((prev) => {
      const matching = prev
        .map((rule, index) => ({ rule, index }))
        .filter(({ rule }) => rule.day_of_week === dayIndex && rule.is_active)

      const target = matching[blockIndex]
      if (!target) return prev

      const next = [...prev]
      next[target.index] = {
        ...next[target.index],
        [field]: value,
      }
      return next
    })
  }

  function deleteBlock(dayIndex: number, blockIndex: number) {
    setRules((prev) => {
      const matching = prev
        .map((rule, index) => ({ rule, index }))
        .filter(({ rule }) => rule.day_of_week === dayIndex && rule.is_active)

      const target = matching[blockIndex]
      if (!target) return prev

      const next = [...prev]
      next.splice(target.index, 1)
      return next
    })
  }

  function enableDay(dayIndex: number) {
    const hasAny = rules.some(
      (rule) => rule.day_of_week === dayIndex && rule.is_active
    )
    if (hasAny) return
    addBlock(dayIndex)
  }

  function disableDay(dayIndex: number) {
    setRules((prev) => prev.filter((rule) => rule.day_of_week !== dayIndex))
  }

  async function handleSave() {
    if (!businessId) {
      setMessage('No business found for this account.')
      setMessageType('error')
      return
    }

    for (let day = 0; day < 7; day++) {
      const dayBlocks = rules.filter((rule) => rule.day_of_week === day)
      if (hasInvalidRanges(dayBlocks)) {
        setMessage(
          `Invalid time range on ${dayLabels[day]}. End time must be after start time.`
        )
        setMessageType('error')
        return
      }
      if (hasOverlaps(dayBlocks)) {
        setMessage(`Overlapping working hours on ${dayLabels[day]}.`)
        setMessageType('error')
        return
      }
    }

    setSaving(true)
    setMessage('Saving...')
    setMessageType('')

    const { error: businessUpdateError } = await supabase
      .from('businesses')
      .update({
        booking_buffer_minutes: bookingBufferMinutes,
      })
      .eq('id', businessId)

    if (businessUpdateError) {
      setMessage(
        `Error saving scheduling settings: ${businessUpdateError.message}`
      )
      setMessageType('error')
      setSaving(false)
      return
    }

    const currentIds = rules.map((rule) => rule.id).filter(Boolean) as string[]
    const idsToDelete = originalRuleIds.filter((id) => !currentIds.includes(id))

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('availability_rules')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        setMessage(`Error deleting old rules: ${deleteError.message}`)
        setMessageType('error')
        setSaving(false)
        return
      }
    }

    const existingRules = rules.filter((rule) => rule.id)
    for (const rule of existingRules) {
      const { error } = await supabase
        .from('availability_rules')
        .update({
          start_time: rule.start_time,
          end_time: rule.end_time,
          is_active: true,
        })
        .eq('id', rule.id!)

      if (error) {
        setMessage(`Error updating availability: ${error.message}`)
        setMessageType('error')
        setSaving(false)
        return
      }
    }

    const newRules = rules.filter((rule) => !rule.id)
    if (newRules.length > 0) {
      const payload = newRules.map((rule) => ({
        business_id: businessId,
        day_of_week: rule.day_of_week,
        start_time: rule.start_time,
        end_time: rule.end_time,
        is_active: true,
      }))

      const { error: insertError } = await supabase
        .from('availability_rules')
        .insert(payload)

      if (insertError) {
        setMessage(`Error creating availability: ${insertError.message}`)
        setMessageType('error')
        setSaving(false)
        return
      }
    }

    const { data: refreshedRows, error: refreshError } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (refreshError) {
      setMessage(`Saved, but failed to refresh: ${refreshError.message}`)
      setMessageType('error')
      setSaving(false)
      return
    }

    const mapped = ((refreshedRows || []) as AvailabilityRule[]).map((row) => ({
      id: row.id,
      day_of_week: row.day_of_week,
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
      is_active: row.is_active,
    }))

    setRules(mapped)
    setOriginalRuleIds(mapped.map((rule) => rule.id!).filter(Boolean))
    setMessage('Availability and scheduling settings saved successfully.')
    setMessageType('success')
    setSaving(false)
  }

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="card p-6">
          <p>Loading availability...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-8">
      <div>
        
        <h1 className="text-3xl font-semibold md:text-4xl">
          Set your working hours
        </h1>
        
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="card p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Weekly Hours</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Add one or multiple working hour ranges for each day of the week.
            </p>
          </div>

          <div className="space-y-4">
            {groupedRules.map(({ dayIndex, label, blocks }) => {
              const isEnabled = blocks.length > 0

              return (
                <div
                  key={dayIndex}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="w-full max-w-[180px]">
                      <p className="font-medium">{label}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {isEnabled
                          ? `${blocks.length} hour range${
                              blocks.length > 1 ? 's' : ''
                            }`
                          : 'Unavailable'}
                      </p>
                    </div>

                    <div className="flex-1 space-y-3">
                      {!isEnabled ? (
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3">
                          <p className="text-sm text-[var(--text-secondary)]">
                            Not available
                          </p>
                          <button
                            type="button"
                            onClick={() => enableDay(dayIndex)}
                            className="btn-secondary text-sm"
                          >
                            Add hours
                          </button>
                        </div>
                      ) : (
                        <>
                          {blocks.map((block, blockIndex) => (
                            <div
                              key={block.id || `${dayIndex}-${blockIndex}`}
                              className="flex flex-col gap-3 md:flex-row md:items-center"
                            >
                              <input
                                type="time"
                                value={block.start_time}
                                onChange={(e) =>
                                  updateBlock(
                                    dayIndex,
                                    blockIndex,
                                    'start_time',
                                    e.target.value
                                  )
                                }
                                className="md:max-w-[180px]"
                              />

                              <div className="text-sm text-[var(--text-secondary)]">
                                to
                              </div>

                              <input
                                type="time"
                                value={block.end_time}
                                onChange={(e) =>
                                  updateBlock(
                                    dayIndex,
                                    blockIndex,
                                    'end_time',
                                    e.target.value
                                  )
                                }
                                className="md:max-w-[180px]"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  deleteBlock(dayIndex, blockIndex)
                                }
                                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
                              >
                                Remove
                              </button>
                            </div>
                          ))}

                          <div className="flex flex-wrap gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => addBlock(dayIndex)}
                              className="btn-secondary text-sm"
                            >
                              Add hours
                            </button>

                            <button
                              type="button"
                              onClick={() => disableDay(dayIndex)}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/15"
                            >
                              Mark unavailable
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Availability'}
            </button>

            {message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  messageType === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : messageType === 'error'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-white/10 bg-white/5 text-[var(--text-secondary)]'
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Google Calendar</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Connect your calendar so bookings can be pushed directly into
                your schedule.
              </p>
            </div>

            {googleConnected ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <p className="text-sm font-medium text-emerald-400">
                  Calendar connected
                </p>

                {googleCalendarEmail && (
                  <p className="mt-2 text-sm text-[var(--text-primary)]">
                    {googleCalendarEmail}
                  </p>
                )}

                <p className="mt-3 text-xs text-[var(--text-secondary)]">
                  New bookings will automatically be added to your calendar.
                </p>

                <div className="mt-4">
                  <a
                    href={`/api/google/connect?business_id=${businessId}`}
                    className="text-xs text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
                  >
                    Reconnect calendar
                  </a>
                </div>
              </div>
            ) : (
              businessId && (
                <a
                  href={`/api/google/connect?business_id=${businessId}`}
                  className="btn-primary inline-flex"
                >
                  Connect Google Calendar
                </a>
              )
            )}
          </div>

          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Scheduling Settings</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Control how much time is blocked between bookings.
              </p>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium">
                Buffer between bookings
              </label>

              <div className="grid grid-cols-2 gap-3">
                {bufferOptions.map((option) => {
                  const isSelected = bookingBufferMinutes === option

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBookingBufferMinutes(option)}
                      className="rounded-xl border px-4 py-3 text-sm font-medium transition"
                      style={{
                        borderColor: isSelected
                          ? 'var(--blue)'
                          : 'rgba(255,255,255,0.08)',
                        backgroundColor: isSelected
                          ? 'var(--blue-soft)'
                          : 'rgba(255,255,255,0.03)',
                        color: isSelected
                          ? 'var(--blue)'
                          : 'var(--text-primary)',
                      }}
                    >
                      {option === 0 ? 'No buffer' : `${option} min`}
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Add extra time after each booking for travel, prep, cleanup, or
                admin time between appointments.
              </p>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">How this works</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Your hours define when you are open. Services and buffer
                settings determine which times can actually be booked.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Step 1
                </p>
                <p className="mt-2 font-medium">Set your working hours</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Example: Monday from 9:00 AM to 5:00 PM.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Step 2
                </p>
                <p className="mt-2 font-medium">Services define duration</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  A 30 minute service and a 90 minute service will generate
                  different valid start times automatically.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Step 3
                </p>
                <p className="mt-2 font-medium">Buffer blocks extra time</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  If you add a 15 minute buffer, ClickBooks will automatically
                  leave that gap between appointments.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Step 4
                </p>
                <p className="mt-2 font-medium">
                  Calendar keeps everything aligned
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Connected calendars let ClickBooks push bookings directly into
                  your schedule so everything stays in one place.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Timezone
              </p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">
                Pacific Time - Canada
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Timezone selection can be added next. Weekly hours, buffer
                settings, and calendar sync are the key scheduling controls for
                now.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}