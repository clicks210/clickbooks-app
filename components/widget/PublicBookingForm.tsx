'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatTimeLabel } from '@/lib/availability'

type Service = {
  id: string
  name: string
  description: string | null
  duration_minutes?: number
  price_label?: string | null
  is_active: boolean
}

type Widget = {
  accent_color: string
  text_color: string
  background_color?: string
  button_label: string
  confirmation_message?: string
  headline?: string
  subheadline?: string
  logo_url?: string | null
}

type Business = {
  id: string
  name: string
}

function formatFullDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfCalendarGrid(date: Date) {
  const first = startOfMonth(date)
  const day = first.getDay()
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - day)
  return gridStart
}

function buildCalendarDays(currentMonth: Date) {
  const start = startOfCalendarGrid(currentMonth)
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    return day
  })
}

export default function PublicBookingForm({
  business,
  widget,
  services,
  success,
  error,
}: {
  business: Business
  widget: Widget
  services: Service[]
  success?: boolean
  error?: boolean
}) {
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))

  const [loadingDates, setLoadingDates] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [datesError, setDatesError] = useState('')
  const [slotsError, setSlotsError] = useState('')

  const mutedTextColor = useMemo(() => `${widget.text_color}B3`, [widget.text_color])
  const subtleTextColor = useMemo(() => `${widget.text_color}80`, [widget.text_color])
  const softBorderColor = useMemo(() => `${widget.text_color}1F`, [widget.text_color])
  const softerBorderColor = useMemo(() => `${widget.text_color}12`, [widget.text_color])
  const softSurface = useMemo(() => `${widget.text_color}08`, [widget.text_color])
  const accentSoft = useMemo(() => `${widget.accent_color}14`, [widget.accent_color])
  const accentBorder = useMemo(() => `${widget.accent_color}33`, [widget.accent_color])

  const shellStyle = {
    maxHeight: 'calc(88vh - 28px)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    paddingBottom: '20px',
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
  }

  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates])
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth])

  useEffect(() => {
    async function loadDates() {
      if (!selectedServiceId) {
        setAvailableDates([])
        setSelectedDate('')
        setSelectedTime('')
        setAvailableSlots([])
        setDatesError('')
        return
      }

      setLoadingDates(true)
      setDatesError('')
      setSelectedDate('')
      setSelectedTime('')
      setAvailableSlots([])

      try {
        const res = await fetch(
          `/api/available-dates?business_id=${business.id}&service_id=${selectedServiceId}`
        )
        const data = await res.json()

        if (!res.ok) {
          setDatesError(data.error || 'Failed to load available dates.')
          setAvailableDates([])
        } else {
          const dates = [...(data.dates || [])].sort()
          setAvailableDates(dates)

          if (dates.length > 0) {
            const firstAvailable = new Date(`${dates[0]}T12:00:00`)
            setCurrentMonth(startOfMonth(firstAvailable))
          } else {
            setCurrentMonth(startOfMonth(new Date()))
          }
        }
      } catch {
        setDatesError('Failed to load available dates.')
        setAvailableDates([])
      }

      setLoadingDates(false)
    }

    loadDates()
  }, [business.id, selectedServiceId])

  useEffect(() => {
    async function loadSlots() {
      if (!selectedServiceId || !selectedDate) {
        setAvailableSlots([])
        setSelectedTime('')
        setSlotsError('')
        return
      }

      setLoadingSlots(true)
      setSlotsError('')
      setSelectedTime('')

      try {
        const res = await fetch(
          `/api/availability?business_id=${business.id}&service_id=${selectedServiceId}&date=${selectedDate}`
        )
        const data = await res.json()

        if (!res.ok) {
          setSlotsError(data.error || 'Failed to load available times.')
          setAvailableSlots([])
        } else {
          setAvailableSlots(data.slots || [])
        }
      } catch {
        setSlotsError('Failed to load available times.')
        setAvailableSlots([])
      }

      setLoadingSlots(false)
    }

    loadSlots()
  }, [business.id, selectedServiceId, selectedDate])

  const canGoPrevMonth = useMemo(() => {
    if (availableDates.length === 0) return true
    const firstAvailable = new Date(`${availableDates[0]}T12:00:00`)
    return currentMonth > startOfMonth(firstAvailable)
  }, [availableDates, currentMonth])

  const canGoNextMonth = useMemo(() => {
    if (availableDates.length === 0) return true
    const lastAvailable = new Date(`${availableDates[availableDates.length - 1]}T12:00:00`)
    return currentMonth < startOfMonth(lastAvailable)
  }, [availableDates, currentMonth])

  if (success) {
    return (
      <div
        style={{ ...shellStyle, height: '100%' }}
        className="mx-auto flex h-full w-full max-w-2xl flex-col cb-scroll-shell"
      >
        <div
          className="cb-fade-up flex min-h-[720px] w-full flex-1 flex-col justify-center rounded-[34px] border bg-white p-6 shadow-[0_30px_90px_rgba(0,0,0,0.10)] md:p-10"
          style={{
            color: widget.text_color,
            borderColor: softerBorderColor,
          }}
        >
          <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
            {widget.logo_url && (
              <div className="mb-6">
                <img
                  src={widget.logo_url}
                  alt={`${business.name} logo`}
                  className="h-24 w-auto max-w-[260px] object-contain"
                />
              </div>
            )}

            <div
              className="mb-4 inline-flex rounded-full border px-4 py-2 text-sm font-semibold cb-pop-in"
              style={{
                borderColor: accentBorder,
                backgroundColor: accentSoft,
                color: widget.accent_color,
              }}
            >
              Booking Confirmed
            </div>

            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
              You’re all set
            </h2>

            <p className="mt-4 max-w-md text-base leading-7" style={{ color: mutedTextColor }}>
              {widget.confirmation_message ||
                'Thanks, your booking request has been received.'}
            </p>

            <div
              className="mt-8 w-full rounded-[24px] border p-5 text-left"
              style={{
                borderColor: softBorderColor,
                backgroundColor: softSurface,
              }}
            >
              <p className="text-sm font-semibold" style={{ color: widget.text_color }}>
                {business.name} has received your request.
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: mutedTextColor }}>
                You can close this window, or submit another booking below.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href)
                  url.searchParams.delete('success')
                  url.searchParams.delete('error')
                  window.location.href = url.toString()
                }}
                className="cb-button-lift inline-flex rounded-2xl px-5 py-3 text-sm font-semibold transition"
                style={{
                  backgroundColor: widget.accent_color,
                  color: '#111111',
                }}
              >
                Book another time
              </button>

              <button
                type="button"
                onClick={() => window.history.back()}
                className="cb-button-lift inline-flex rounded-2xl border px-5 py-3 text-sm font-medium transition"
                style={{
                  borderColor: softBorderColor,
                  color: widget.text_color,
                  backgroundColor: 'transparent',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <style>{`
          .cb-scroll-shell {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .cb-scroll-shell::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }

          .cb-fade-up {
            animation: cbFadeUp 320ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .cb-pop-in {
            animation: cbPopIn 360ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .cb-button-lift:hover {
            transform: translateY(-1px);
          }

          .cb-button-lift:active {
            transform: translateY(0);
          }

          @keyframes cbFadeUp {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.985);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes cbPopIn {
            from {
              opacity: 0;
              transform: scale(0.96);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={shellStyle} className="mx-auto w-full max-w-2xl cb-scroll-shell">
      <form
        action="/api/bookings"
        method="POST"
        className="cb-fade-up min-h-[720px] space-y-8 rounded-[34px] border bg-white p-6 shadow-[0_30px_90px_rgba(0,0,0,0.10)] md:p-10"
        style={{
          borderColor: softerBorderColor,
        }}
      >
        <input type="hidden" name="business_id" value={business.id} />
        <input type="hidden" name="service_id" value={selectedServiceId} />
        <input type="hidden" name="booking_date" value={selectedDate} />
        <input type="hidden" name="booking_time" value={selectedTime} />

        <div className="pb-8 text-center" style={{ borderBottom: `1px solid ${softerBorderColor}` }}>
          {widget.logo_url && (
            <div className="mb-6 flex justify-center">
              <img
                src={widget.logo_url}
                alt={`${business.name} logo`}
                className="h-24 w-auto max-w-[260px] object-contain"
              />
            </div>
          )}

          <h2
            className="text-[2.4rem] font-semibold leading-none tracking-[-0.04em] md:text-[3.3rem]"
            style={{ color: widget.text_color }}
          >
            {widget.headline || business.name}
          </h2>

          <p
            className="mx-auto mt-5 max-w-2xl text-[17px] leading-8"
            style={{ color: mutedTextColor }}
          >
            {widget.subheadline || 'Choose a service, select a day, and book your time.'}
          </p>
        </div>

        {error && (
          <div className="rounded-[22px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            Something went wrong while submitting your booking. Please try again.
          </div>
        )}

        <section className="space-y-4">
          <label className="block text-[15px] font-semibold" style={{ color: widget.text_color }}>
            Choose a service
          </label>

          <div className="grid gap-4">
            {services.map((service) => {
              const isSelected = selectedServiceId === service.id

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className="rounded-[26px] border p-5 text-left transition"
                  style={{
                    borderColor: isSelected ? widget.accent_color : softBorderColor,
                    backgroundColor: isSelected ? accentSoft : 'transparent',
                    color: widget.text_color,
                    boxShadow: isSelected ? '0 10px 24px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p
                        className="text-[18px] font-semibold"
                        style={{ color: isSelected ? widget.text_color : subtleTextColor }}
                      >
                        {service.name}
                      </p>
                      {service.description && (
                        <p className="mt-3 text-[15px] leading-7" style={{ color: mutedTextColor }}>
                          {service.description}
                        </p>
                      )}
                    </div>

                    <div
                      className="mt-1 h-5 w-5 rounded-full border"
                      style={{
                        borderColor: isSelected ? widget.accent_color : `${widget.text_color}33`,
                        backgroundColor: isSelected ? widget.accent_color : 'transparent',
                      }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <label className="block text-[15px] font-semibold" style={{ color: widget.text_color }}>
            Choose a date
          </label>

          {!selectedServiceId ? (
            <div
              className="rounded-[24px] border p-4 text-sm"
              style={{
                borderColor: softBorderColor,
                backgroundColor: softSurface,
                color: mutedTextColor,
              }}
            >
              Select a service to see available dates.
            </div>
          ) : loadingDates ? (
            <div
              className="rounded-[24px] border p-4 text-sm"
              style={{
                borderColor: softBorderColor,
                backgroundColor: softSurface,
                color: mutedTextColor,
              }}
            >
              Loading available dates...
            </div>
          ) : datesError ? (
            <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {datesError}
            </div>
          ) : availableDates.length === 0 ? (
            <div
              className="rounded-[24px] border p-4 text-sm"
              style={{
                borderColor: softBorderColor,
                backgroundColor: softSurface,
                color: mutedTextColor,
              }}
            >
              No available dates for this service.
            </div>
          ) : (
            <div
              className="rounded-[28px] border p-5"
              style={{
                borderColor: softBorderColor,
                backgroundColor: 'transparent',
              }}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                    )
                  }
                  disabled={!canGoPrevMonth}
                  className="cb-calendar-arrow inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: softBorderColor,
                    color: widget.text_color,
                    backgroundColor: '#FFFFFF',
                  }}
                  aria-label="Previous month"
                >
                  ←
                </button>

                <div className="text-center">
                  <p className="text-[17px] font-semibold" style={{ color: widget.text_color }}>
                    {formatMonthLabel(currentMonth)}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: mutedTextColor }}>
                    Select an available day
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                    )
                  }
                  disabled={!canGoNextMonth}
                  className="cb-calendar-arrow inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: softBorderColor,
                    color: widget.text_color,
                    backgroundColor: '#FFFFFF',
                  }}
                  aria-label="Next month"
                >
                  →
                </button>
              </div>

              <div className="mb-3 grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: mutedTextColor }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const dateStr = toLocalDateString(day)
                  const inCurrentMonth = isSameMonth(day, currentMonth)
                  const isPast = day < today
                  const isAvailable = inCurrentMonth && availableDateSet.has(dateStr)
                  const isSelected = selectedDate === dateStr
                  const isToday = dateStr === toLocalDateString(today)

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        if (!isAvailable) return
                        setSelectedDate(dateStr)
                      }}
                      disabled={!isAvailable}
                      className="cb-calendar-day relative aspect-square rounded-[20px] border text-sm font-medium transition disabled:cursor-not-allowed"
                      style={{
                        borderColor: isSelected
                          ? widget.accent_color
                          : isToday
                            ? accentBorder
                            : softerBorderColor,
                        backgroundColor: isSelected
                          ? widget.accent_color
                          : isAvailable
                            ? '#FFFFFF'
                            : 'transparent',
                        color: !inCurrentMonth
                          ? `${widget.text_color}30`
                          : isSelected
                            ? '#111111'
                            : isAvailable
                              ? widget.text_color
                              : isPast
                                ? `${widget.text_color}35`
                                : `${widget.text_color}55`,
                        opacity: inCurrentMonth ? 1 : 0.45,
                        boxShadow: isSelected ? '0 10px 24px rgba(0,0,0,0.12)' : 'none',
                      }}
                    >
                      <span>{day.getDate()}</span>

                      {isToday && !isSelected && (
                        <span
                          className="pointer-events-none absolute inset-[3px] rounded-[16px] border"
                          style={{ borderColor: accentBorder }}
                        />
                      )}

                      {isAvailable && !isSelected && (
                        <span
                          className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                          style={{ backgroundColor: widget.accent_color }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              {selectedDate && (
                <div
                  className="mt-5 rounded-[22px] border px-4 py-3 text-sm"
                  style={{
                    borderColor: accentBorder,
                    backgroundColor: accentSoft,
                    color: widget.text_color,
                  }}
                >
                  Selected: <span className="font-semibold">{formatFullDateLabel(selectedDate)}</span>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <label className="block text-[15px] font-semibold" style={{ color: widget.text_color }}>
            Choose a time
          </label>

          {!selectedServiceId || !selectedDate ? (
            <div
              className="rounded-[24px] border p-4 text-sm"
              style={{
                borderColor: softBorderColor,
                backgroundColor: softSurface,
                color: mutedTextColor,
              }}
            >
              Select a service and day on the calendar to see available times.
            </div>
          ) : loadingSlots ? (
            <div
              className="rounded-[24px] border p-4 text-sm"
              style={{
                borderColor: softBorderColor,
                backgroundColor: softSurface,
                color: mutedTextColor,
              }}
            >
              Loading available times...
            </div>
          ) : slotsError ? (
            <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {slotsError}
            </div>
          ) : availableSlots.length === 0 ? (
            <div
              className="rounded-[24px] border p-4 text-sm"
              style={{
                borderColor: softBorderColor,
                backgroundColor: softSurface,
                color: mutedTextColor,
              }}
            >
              No available times for this date.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {availableSlots.map((slot) => {
                const isSelected = selectedTime === slot

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className="rounded-2xl border px-4 py-3.5 text-sm font-medium transition"
                    style={{
                      borderColor: isSelected ? widget.accent_color : softBorderColor,
                      backgroundColor: isSelected ? accentSoft : 'transparent',
                      color: isSelected ? widget.accent_color : widget.text_color,
                    }}
                  >
                    {formatTimeLabel(slot)}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {selectedDate && selectedTime && (
          <div
            className="rounded-[24px] border p-5"
            style={{
              borderColor: accentBorder,
              backgroundColor: accentSoft,
            }}
          >
            <p className="text-sm font-semibold" style={{ color: widget.text_color }}>
              Selected appointment
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: mutedTextColor }}>
              {formatFullDateLabel(selectedDate)} at {formatTimeLabel(selectedTime)}
            </p>
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-[15px] font-semibold" style={{ color: widget.text_color }}>
              Name
            </label>
            <input
              name="customer_name"
              placeholder="John Smith"
              required
              className="cb-input"
              style={{
                width: '100%',
                borderRadius: '18px',
                border: `1px solid ${softBorderColor}`,
                backgroundColor: softSurface,
                color: widget.text_color,
                padding: '14px 16px',
                transition: 'all 160ms ease',
              }}
            />
          </div>

          <div>
            <label className="mb-2 block text-[15px] font-semibold" style={{ color: widget.text_color }}>
              Email
            </label>
            <input
              name="customer_email"
              type="email"
              placeholder="john@company.com"
              required
              className="cb-input"
              style={{
                width: '100%',
                borderRadius: '18px',
                border: `1px solid ${softBorderColor}`,
                backgroundColor: softSurface,
                color: widget.text_color,
                padding: '14px 16px',
                transition: 'all 160ms ease',
              }}
            />
          </div>
        </section>

        <section>
          <label className="mb-2 block text-[15px] font-semibold" style={{ color: widget.text_color }}>
            Phone
          </label>
          <input
            name="customer_phone"
            placeholder="(555) 555-5555"
            className="cb-input"
            style={{
              width: '100%',
              borderRadius: '18px',
              border: `1px solid ${softBorderColor}`,
              backgroundColor: softSurface,
              color: widget.text_color,
              padding: '14px 16px',
              transition: 'all 160ms ease',
            }}
          />
        </section>

        <section>
          <label className="mb-2 block text-[15px] font-semibold" style={{ color: widget.text_color }}>
            Notes
          </label>
          <textarea
            name="notes"
            placeholder="Add any details about the job, property, or request"
            className="cb-textarea min-h-[130px]"
            style={{
              width: '100%',
              borderRadius: '18px',
              border: `1px solid ${softBorderColor}`,
              backgroundColor: softSurface,
              color: widget.text_color,
              padding: '14px 16px',
              transition: 'all 160ms ease',
            }}
          />
        </section>

        <div className="space-y-5 pt-2">
          <button
            type="submit"
            disabled={!selectedServiceId || !selectedDate || !selectedTime}
            className="cb-submit-button w-full rounded-[20px] px-4 py-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: widget.accent_color,
              color: '#111111',
            }}
          >
            {widget.button_label || 'Book now'}
          </button>

          <div
            className="flex items-center justify-center gap-2 pt-4"
            style={{
              borderTop: `1px solid ${softBorderColor}`,
            }}
          >
            <span
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{
                color: mutedTextColor,
                fontWeight: 500,
              }}
            >
              Powered by
            </span>

            <img
              src="https://cdn.prod.website-files.com/689be253c8ffdea53a0bdafb/69e653b95fea092b0ad7f92d_ChatGPT%20Image%20Apr%2020%2C%202026%20at%2009_25_20%20AM.png"
              alt="Click"
              className="h-4 w-auto object-contain opacity-90"
            />
          </div>
        </div>
      </form>

      <style>{`
        .cb-scroll-shell {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .cb-scroll-shell::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }

        .cb-fade-up {
          animation: cbFadeUp 320ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cb-pop-in {
          animation: cbPopIn 360ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cb-submit-button {
          box-shadow: 0 14px 30px rgba(0,0,0,0.12);
        }

        .cb-submit-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 36px rgba(0,0,0,0.16);
        }

        .cb-submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .cb-calendar-arrow:hover:not(:disabled),
        .cb-calendar-day:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .cb-input:focus,
        .cb-textarea:focus {
          outline: none;
          box-shadow: 0 0 0 4px ${accentSoft};
          border-color: ${widget.accent_color};
        }

        @keyframes cbFadeUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cbPopIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}