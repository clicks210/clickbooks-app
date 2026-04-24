'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const defaultForm = {
  accent_color: '#FF9F43',
  background_color: '#E5E7EB',
  text_color: '#111111',
}

function formatPreviewFullDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPreviewMonth(date: Date) {
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

export default function ClickBooksHeroCustomizer() {
  const [form, setForm] = useState(defaultForm)

  const ctaRef = useRef<HTMLElement | null>(null)

  const { scrollYProgress } = useScroll({
    target: ctaRef,
    offset: ['start end', 'end start'],
  })

  const sectionOpacity = useTransform(scrollYProgress, [0, 0.25, 0.6], [0.55, 0.9, 1])
  const sectionScale = useTransform(scrollYProgress, [0, 0.6], [0.985, 1])
  const glowOpacity = useTransform(scrollYProgress, [0, 0.4, 0.8], [0.08, 0.18, 0.32])
  const cardY = useTransform(scrollYProgress, [0, 0.7], [28, 0])
  const cardScale = useTransform(scrollYProgress, [0, 0.7], [0.985, 1])
  const lineOpacity = useTransform(scrollYProgress, [0, 0.3, 0.8], [0.08, 0.18, 0.3])
  const lineY = useTransform(scrollYProgress, [0, 1], [24, -10])

  function updateField(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const mutedTextColor = useMemo(() => `${form.text_color}B3`, [form.text_color])
  const subtleTextColor = useMemo(() => `${form.text_color}80`, [form.text_color])
  const softBorderColor = useMemo(() => `${form.text_color}1F`, [form.text_color])
  const softerBorderColor = useMemo(() => `${form.text_color}12`, [form.text_color])
  const softSurface = useMemo(() => `${form.text_color}08`, [form.text_color])
  const accentSoft = useMemo(() => `${form.accent_color}14`, [form.accent_color])
  const accentBorder = useMemo(() => `${form.accent_color}33`, [form.accent_color])

  const previewMonth = useMemo(() => startOfMonth(new Date()), [])
  const previewDays = useMemo(() => buildCalendarDays(previewMonth), [previewMonth])
  const previewSelectedDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return toLocalDateString(d)
  }, [])

  const previewAvailableDates = useMemo(() => {
    const d1 = new Date()
    d1.setDate(d1.getDate() + 1)

    const d2 = new Date()
    d2.setDate(d2.getDate() + 2)

    const d3 = new Date()
    d3.setDate(d3.getDate() + 4)

    const d4 = new Date()
    d4.setDate(d4.getDate() + 6)

    return new Set([
      toLocalDateString(d1),
      toLocalDateString(d2),
      toLocalDateString(d3),
      toLocalDateString(d4),
    ])
  }, [])

  return (
    <main className="min-h-screen">
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid items-start gap-10 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-xl pt-1 md:pt-3 xl:pt-6">
              

              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Turn any website into a professional booking experience
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-[var(--text-secondary)]">
                ClickBooks lets businesses build, customize, and embed a branded
                booking widget that updates live from one central dashboard.
              </p>

              <div className="card mt-8 p-5 md:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">Try the colors live</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Adjust the widget styling and watch the preview update instantly.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Accent
                    </label>
                    <input
                      type="color"
                      name="accent_color"
                      value={form.accent_color}
                      onChange={updateField}
                      className="h-12 w-full cursor-pointer rounded-xl p-1"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Background
                    </label>
                    <input
                      type="color"
                      name="background_color"
                      value={form.background_color}
                      onChange={updateField}
                      className="h-12 w-full cursor-pointer rounded-xl p-1"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Text
                    </label>
                    <input
                      type="color"
                      name="text_color"
                      value={form.text_color}
                      onChange={updateField}
                      className="h-12 w-full cursor-pointer rounded-xl p-1"
                    />
                  </div>
                </div>

                <button className="btn-primary mt-6">
                  Create Your Widget
                </button>

                <p className="mt-4 text-sm text-[var(--text-secondary)]">
                  Compatible with most sites · Built for service businesses · No-code
                </p>
              </div>
            </div>

            <div className="xl:pl-4">
              <div className="mx-auto max-w-[620px]">
                <div
                  className="rounded-[28px] border p-4 shadow-[0_24px_70px_rgba(0,0,0,0.08)] md:p-5"
                  style={{
                    backgroundColor: form.background_color,
                    borderColor: softerBorderColor,
                    color: form.text_color,
                  }}
                >
                  <div
                    className="mb-6 flex items-center justify-between gap-4 border-b pb-5"
                    style={{ borderColor: softerBorderColor }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="inline-flex rounded-2xl border bg-white px-3 py-2">
                        <img
                          src="https://cdn.prod.website-files.com/689be253c8ffdea53a0bdafb/69e7bf6921a40cf6dd69cc1a_Adobe%20Express%20-%20file.png"
                          alt="ClickBooks logo"
                          className="h-5 w-auto object-contain"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold">Customize w ClickBooks</p>
                        <p className="text-xs" style={{ color: mutedTextColor }}>
                          Professional booking widget
                        </p>
                      </div>
                    </div>

                    <div
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: accentSoft,
                        color: form.accent_color,
                        borderColor: accentBorder,
                      }}
                    >
                      Live Preview
                    </div>
                  </div>

                  <div
                    className="pb-6 text-center"
                    style={{ borderBottom: `1px solid ${softerBorderColor}` }}
                  >
                    <h2
                      className="text-3xl font-semibold tracking-tight md:text-4xl"
                      style={{ color: form.text_color }}
                    >
                      Book your service
                    </h2>

                    <p
                      className="mx-auto mt-3 max-w-xl text-sm leading-7 md:text-[15px]"
                      style={{ color: mutedTextColor }}
                    >
                      Choose a service, select a day, and lock in your booking with a
                      widget customized to match your brand.
                    </p>
                  </div>

                  <div className="space-y-6 pt-6">
                    <section className="space-y-3">
                      <label className="block text-sm font-semibold">
                        Choose a service
                      </label>

                      <div className="grid gap-3">
                        <div
                          className="rounded-[22px] border p-4"
                          style={{
                            borderColor: form.accent_color,
                            backgroundColor: accentSoft,
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-base font-semibold">
                                Lawn Care Estimate
                              </p>
                              <p
                                className="mt-2 text-sm leading-6"
                                style={{ color: mutedTextColor }}
                              >
                                On-site quote for mowing, cleanup, or regular property service.
                              </p>
                            </div>

                            <div
                              className="mt-1 h-4 w-4 rounded-full border"
                              style={{
                                borderColor: form.accent_color,
                                backgroundColor: form.accent_color,
                              }}
                            />
                          </div>
                        </div>

                        <div
                          className="rounded-[22px] border p-4"
                          style={{
                            borderColor: softBorderColor,
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <p
                              className="text-base font-semibold"
                              style={{ color: subtleTextColor }}
                            >
                              Spring Cleanup
                            </p>

                            <div
                              className="mt-1 h-4 w-4 rounded-full border"
                              style={{
                                borderColor: `${form.text_color}33`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <label className="block text-sm font-semibold">
                        Choose a date
                      </label>

                      <div
                        className="rounded-[24px] border p-4"
                        style={{ borderColor: softBorderColor }}
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-base font-medium"
                            style={{
                              borderColor: softBorderColor,
                              color: form.text_color,
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            ←
                          </button>

                          <div className="text-center">
                            <p className="text-sm font-semibold">
                              {formatPreviewMonth(previewMonth)}
                            </p>
                            <p className="mt-1 text-[11px]" style={{ color: mutedTextColor }}>
                              Select an available day
                            </p>
                          </div>

                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-base font-medium"
                            style={{
                              borderColor: softBorderColor,
                              color: form.text_color,
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            →
                          </button>
                        </div>

                        <div className="mb-2 grid grid-cols-7 gap-1.5">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div
                              key={day}
                              className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em]"
                              style={{ color: mutedTextColor }}
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1.5">
                          {previewDays.map((day) => {
                            const dateStr = toLocalDateString(day)
                            const inCurrentMonth = isSameMonth(day, previewMonth)
                            const isAvailable =
                              inCurrentMonth && previewAvailableDates.has(dateStr)
                            const isSelected = dateStr === previewSelectedDate

                            return (
                              <div
                                key={dateStr}
                                className="relative flex aspect-square items-center justify-center rounded-[16px] border text-xs font-medium"
                                style={{
                                  borderColor: isSelected
                                    ? form.accent_color
                                    : softerBorderColor,
                                  backgroundColor: isSelected
                                    ? form.accent_color
                                    : isAvailable
                                      ? '#FFFFFF'
                                      : 'transparent',
                                  color: !inCurrentMonth
                                    ? `${form.text_color}30`
                                    : isSelected
                                      ? '#111111'
                                      : isAvailable
                                        ? form.text_color
                                        : `${form.text_color}55`,
                                  opacity: inCurrentMonth ? 1 : 0.45,
                                }}
                              >
                                <span>{day.getDate()}</span>

                                {isAvailable && !isSelected && (
                                  <span
                                    className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                                    style={{ backgroundColor: form.accent_color }}
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>

                        <div
                          className="mt-4 rounded-[18px] border px-4 py-3 text-sm"
                          style={{
                            borderColor: accentBorder,
                            backgroundColor: accentSoft,
                          }}
                        >
                          Selected:{' '}
                          <span className="font-semibold">
                            {formatPreviewFullDate(
                              new Date(`${previewSelectedDate}T12:00:00`)
                            )}
                          </span>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <label className="block text-sm font-semibold">
                        Choose a time
                      </label>

                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {['9:00 AM', '10:30 AM', '1:00 PM', '2:30 PM'].map((time, index) => {
                          const isSelected = index === 1

                          return (
                            <div
                              key={time}
                              className="rounded-xl border px-3 py-3 text-center text-xs font-medium"
                              style={{
                                borderColor: isSelected ? form.accent_color : softBorderColor,
                                backgroundColor: isSelected ? accentSoft : 'transparent',
                                color: isSelected ? form.accent_color : form.text_color,
                              }}
                            >
                              {time}
                            </div>
                          )
                        })}
                      </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold">Name</label>
                        <div
                          className="rounded-2xl border px-4 py-3 text-sm"
                          style={{
                            borderColor: softBorderColor,
                            backgroundColor: softSurface,
                          }}
                        >
                          John Smith
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">Email</label>
                        <div
                          className="rounded-2xl border px-4 py-3 text-sm"
                          style={{
                            borderColor: softBorderColor,
                            backgroundColor: softSurface,
                          }}
                        >
                          john@email.com
                        </div>
                      </div>
                    </section>

                    <button
                      type="button"
                      className="w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                      style={{
                        backgroundColor: form.accent_color,
                        color: '#111111',
                      }}
                    >
                      Book now
                    </button>

                    <div
                      className="flex items-center justify-center gap-2 pt-4"
                      style={{ borderTop: `1px solid ${softBorderColor}` }}
                    >
                      <span
                        className="text-[11px] uppercase tracking-[0.18em]"
                        style={{ color: mutedTextColor }}
                      >
                        Powered by
                      </span>

                      <img
                        src="https://cdn.prod.website-files.com/689be253c8ffdea53a0bdafb/69e7bf6921a40cf6dd69cc1a_Adobe%20Express%20-%20file.png"
                        alt="ClickBooks"
                        className="h-4 w-auto object-contain opacity-90"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-24">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10 max-w-2xl">
                <div className="badge-accent mb-4 inline-flex rounded-full border px-3 py-1 text-sm font-medium">
                  Why ClickBooks
                </div>
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Built to make booking dead simple
                </h2>
                <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
                  ClickBooks gives service businesses a smoother way to get booked,
                  stay organized, and look far more professional online.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="card rounded-[24px] p-6">
                  <h3 className="text-lg font-semibold">No Code Deployment</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    Use our online tool to build and customize your booking system
                    without touching code or hiring a developer.
                  </p>
                </div>

                <div className="card rounded-[24px] p-6">
                  <h3 className="text-lg font-semibold">
                    Built for service based businesses
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    Enjoy custom availability logic, service-focused booking flows,
                    and integration with your favourite calendar app.
                  </p>
                </div>

                <div className="card rounded-[24px] p-6">
                  <h3 className="text-lg font-semibold">All in One dashboard</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    Everything you need to manage services, availability, and your
                    bookings all in one place.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-24">
            <div className="mx-auto max-w-6xl">
              <div className="overflow-hidden rounded-[32px] border border-gray-200 bg-white px-6 py-10 text-black shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:px-10 md:py-12">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div>
                    <div className="mb-4 inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                      Zero → Hero
                    </div>

                    <h2 className="text-3xl font-semibold tracking-tight md:text-5xl text-black">
                      Start with ClickBooks. End up with a full website too.
                    </h2>

                    <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600">
                      When you sign up for a year of ClickBooks, we’ll throw in a
                      brand new customized website for free. Not a template dumpster
                      fire. A real website built to make your business look legit and
                      turn visitors into booked jobs.
                    </p>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                        Custom-branded site built around your business
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                        Booking widget fully integrated from day one
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                        Fast setup so you can start taking bookings sooner
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                        One clean system instead of a pile of duct-taped tools
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)]">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Included with annual signup
                    </p>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-2xl bg-white px-5 py-4 text-black shadow-sm">
                        <p className="text-sm text-gray-500">You get</p>
                        <p className="mt-1 text-xl font-semibold">
                          ClickBooks + Free Custom Website
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
                        <p className="text-sm text-gray-500">Best for</p>
                        <p className="mt-1 text-base font-semibold text-black">
                          Landscapers, cleaners, detailers, contractors, mobile service businesses
                        </p>
                      </div>

                      <button className="btn-primary mt-2 w-full">
                        Claim Your Free Website
                      </button>

                      <p className="text-center text-xs text-gray-500">
                        Annual ClickBooks signup required
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        <motion.section
  ref={ctaRef}
  className="mt-24 pb-20"
  style={{
    opacity: sectionOpacity,
    scale: sectionScale,
  }}
>
  <div className="mx-auto max-w-6xl">
    <div className="relative overflow-hidden rounded-[36px] border border-gray-200 bg-white px-6 py-16 text-black shadow-[0_30px_100px_rgba(0,0,0,0.12)] md:px-10 md:py-24">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,159,67,0.18),transparent_42%)]"
          style={{ opacity: glowOpacity }}
        />

        <div className="absolute inset-x-0 top-0 h-px bg-gray-200" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gray-200" />

        <motion.div
          className="absolute left-1/2 top-[14%] h-[130%] w-px -translate-x-[170px] rotate-[26deg] bg-gradient-to-b from-transparent via-gray-300 to-transparent"
          style={{ opacity: lineOpacity, y: lineY }}
        />
        <motion.div
          className="absolute left-1/2 top-[14%] h-[130%] w-px translate-x-[170px] rotate-[-26deg] bg-gradient-to-b from-transparent via-gray-300 to-transparent"
          style={{ opacity: lineOpacity, y: lineY }}
        />

        <motion.div
          className="absolute left-1/2 bottom-0 h-44 w-px -translate-x-20 bg-gradient-to-t from-[#FF9F43]/0 via-[#FF9F43]/40 to-[#FF9F43]/0"
          style={{ opacity: glowOpacity }}
        />
        <motion.div
          className="absolute left-1/2 bottom-0 h-56 w-px translate-x-20 bg-gradient-to-t from-[#FF9F43]/0 via-[#FF9F43]/40 to-[#FF9F43]/0"
          style={{ opacity: glowOpacity }}
        />
        <motion.div
          className="absolute left-1/2 bottom-0 h-72 w-[2px] -translate-x-1/2 bg-gradient-to-t from-[#FF9F43]/0 via-[#FF9F43]/65 to-[#FF9F43]/0"
          style={{ opacity: glowOpacity }}
        />

        <motion.div
          animate={{
            scale: [1, 1.18, 1],
            opacity: [0.18, 0.32, 0.18],
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute left-1/2 bottom-10 h-28 w-28 -translate-x-1/2 rounded-full bg-[#FF9F43]/20 blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mb-5 inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm font-medium text-gray-600"
        >
          Final step
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-3xl font-semibold tracking-tight md:text-5xl"
        >
          Ready for takeoff?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-600 md:text-lg"
        >
          Stop losing bookings to slow websites. Launch a cleaner booking flow,
          a better-looking business, and a system that actually helps you win more work.
        </motion.p>

        <motion.div
          style={{ y: cardY, scale: cardScale }}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, delay: 0.15 }}
          animate={{
            y: [0, -6, 0],
          }}
          className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-gray-200 bg-gray-50 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] md:p-6"
        >
          <div className="flex flex-col items-center justify-between gap-5 md:flex-row md:text-left">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-gray-500">
                Launch ClickBooks
              </p>
              <p className="mt-2 text-lg font-semibold text-black">
                Go from website visitor to booked customer
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow: [
                    '0 0 0 rgba(255,159,67,0)',
                    '0 0 24px rgba(255,159,67,0.22)',
                    '0 0 0 rgba(255,159,67,0)',
                  ],
                }}
                transition={{
                  boxShadow: {
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                className="rounded-xl"
              >
                <Link href="/signup" className="btn-primary block px-7 py-3 text-center">
                  Launch Now
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link href="/demo" className="btn-secondary block px-7 py-3 text-center">
                  See It Live
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 px-4 text-xs uppercase tracking-[0.16em] text-gray-400"
        >
          
        </motion.p>
      </div>
    </div>
  </div>
</motion.section>  
        </div>
      </section>
    </main>
  )
}