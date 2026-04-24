'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Widget = {
  id: string
  business_id: string
  name: string
  headline: string
  subheadline: string
  button_label: string
  accent_color: string
  background_color: string
  text_color: string
  confirmation_message: string
  logo_url?: string | null
  is_active: boolean
}

type ProfileRow = {
  business_id: string
}

const defaultWidgetForm = {
  name: 'Main Widget',
  headline: 'Book your service',
  subheadline: 'Choose a service, select a day, and book your time.',
  button_label: 'Book now',
  accent_color: '#FF9F43',
  background_color: '#FFFFFF',
  text_color: '#111111',
  confirmation_message: 'Thanks, your booking request has been received.',
  logo_url: '',
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

export default function WidgetPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [widgetId, setWidgetId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultWidgetForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  useEffect(() => {
    async function fetchWidget() {
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

      setBusinessId(profile.business_id)

      const { data: widget, error: widgetError } = await supabase
        .from('widgets')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<Widget>()

      if (widgetError) {
        setMessage(`Error loading widget: ${widgetError.message}`)
        setMessageType('error')
        setLoading(false)
        return
      }

      if (!widget) {
        setMessage('No widget found for this business.')
        setMessageType('error')
        setLoading(false)
        return
      }

      setWidgetId(widget.id)
      setForm({
        name: widget.name || '',
        headline: widget.headline || '',
        subheadline: widget.subheadline || '',
        button_label: widget.button_label || '',
       accent_color: widget.accent_color || '#FF9F43',
background_color: widget.background_color || '#FFFFFF',
text_color: widget.text_color || '#111111',
        confirmation_message:
          widget.confirmation_message ||
          'Thanks, your booking request has been received.',
        logo_url: widget.logo_url || '',
      })

      setLoading(false)
    }

    fetchWidget()
  }, [router, supabase])

  function updateField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleLogoUpload(file: File) {
    if (!businessId) {
      setMessage('Business not loaded yet.')
      setMessageType('error')
      return
    }

    if (!file.type.startsWith('image/')) {
      setMessage('Please upload an image file.')
      setMessageType('error')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Logo must be under 2MB.')
      setMessageType('error')
      return
    }

    setUploadingLogo(true)
    setMessage('Uploading logo...')
    setMessageType('')

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(fileExt)
      ? fileExt
      : 'png'
    const filePath = `${businessId}/${Date.now()}-logo.${safeExt}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || undefined,
      })

    if (uploadError) {
      setMessage(`Logo upload failed: ${uploadError.message}`)
      setMessageType('error')
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath)

    if (!data?.publicUrl) {
      setMessage('Logo uploaded, but public URL could not be created.')
      setMessageType('error')
      setUploadingLogo(false)
      return
    }

    setForm((prev) => ({
      ...prev,
      logo_url: data.publicUrl,
    }))

    setMessage('Logo uploaded successfully.')
    setMessageType('success')
    setUploadingLogo(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!widgetId || !businessId) {
      setMessage('No widget found for this business.')
      setMessageType('error')
      return
    }

    setSaving(true)
    setMessage('Saving...')
    setMessageType('')

    const { error } = await supabase
      .from('widgets')
      .update({
        name: form.name,
        headline: form.headline,
        subheadline: form.subheadline,
        button_label: form.button_label,
        accent_color: form.accent_color,
        background_color: form.background_color,
        text_color: form.text_color,
        confirmation_message: form.confirmation_message,
        logo_url: form.logo_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', widgetId)
      .eq('business_id', businessId)

    if (error) {
      setMessage(`Error saving widget: ${error.message}`)
      setMessageType('error')
    } else {
      setMessage('Widget saved successfully.')
      setMessageType('success')
    }

    setSaving(false)
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

    const d5 = new Date()
    d5.setDate(d5.getDate() + 9)

    return new Set([
      toLocalDateString(d1),
      toLocalDateString(d2),
      toLocalDateString(d3),
      toLocalDateString(d4),
      toLocalDateString(d5),
    ])
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen p-6 md:p-10">
        <div className="container">
          <div className="card p-6">
            <p>Loading widget builder...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="container">
        <div className="mb-8">
          

          <h1 className="text-3xl font-semibold md:text-4xl">
            Customize your booking widget
          </h1>

          
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Widget Settings</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                These settings control the public widget experience.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Widget Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="Main Widget"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Headline
                </label>
                <input
                  name="headline"
                  value={form.headline}
                  onChange={updateField}
                  placeholder="Book your service"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Subheadline
                </label>
                <textarea
                  name="subheadline"
                  value={form.subheadline}
                  onChange={updateField}
                  placeholder="Choose a service, select a day, and book your time."
                  className="min-h-[110px]"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Button Label
                </label>
                <input
                  name="button_label"
                  value={form.button_label}
                  onChange={updateField}
                  placeholder="Book now"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Confirmation Message
                </label>
                <textarea
                  name="confirmation_message"
                  value={form.confirmation_message}
                  onChange={updateField}
                  placeholder="Thanks, your booking request has been received."
                  className="min-h-[110px]"
                  required
                />
              </div>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Logo Upload
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleLogoUpload(file)
                    }}
                    className="block w-full text-sm"
                    disabled={uploadingLogo}
                  />
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Upload a logo image for the booking page. PNG, JPG, WEBP, or SVG. Max 2MB.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Logo URL
                  </label>
                  <input
                    name="logo_url"
                    value={form.logo_url}
                    onChange={updateField}
                    placeholder="https://your-site.com/logo.png"
                  />
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Optional. You can also paste a direct image URL instead of uploading.
                  </p>
                </div>

                {form.logo_url && (
                  <div>
                    <p className="mb-2 block text-sm font-medium">Current Logo</p>
                    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <img
                        src={form.logo_url}
                        alt="Logo preview"
                        className="h-12 w-auto max-w-[180px] object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Accent Color
                  </label>
                  <input
                    type="color"
                    name="accent_color"
                    value={form.accent_color}
                    onChange={updateField}
                    className="h-12 cursor-pointer rounded-xl p-1"
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
                    className="h-12 cursor-pointer rounded-xl p-1"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Text Color
                  </label>
                  <input
                    type="color"
                    name="text_color"
                    value={form.text_color}
                    onChange={updateField}
                    className="h-12 cursor-pointer rounded-xl p-1"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving || uploadingLogo}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Widget'}
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
            </form>
          </div>

          <div className="card p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Live Preview</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This is how your public widget will look.
                </p>
              </div>

              <div
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${form.accent_color}14`,
                  color: form.accent_color,
                  borderColor: `${form.accent_color}33`,
                }}
              >
                Preview
              </div>
            </div>

            <div
              className="rounded-[34px] border bg-white p-6 shadow-[0_30px_90px_rgba(0,0,0,0.10)] md:p-8"
              style={{
                borderColor: softerBorderColor,
                color: form.text_color,
              }}
            >
              <div className="pb-8 text-center" style={{ borderBottom: `1px solid ${softerBorderColor}` }}>
                {form.logo_url && (
                  <div className="mb-6 flex justify-center">
                    <img
                      src={form.logo_url}
                      alt={`${form.name || 'Business'} logo`}
                      className="h-24 w-auto max-w-[260px] object-contain"
                    />
                  </div>
                )}

                <h2
                  className="text-[2.1rem] font-semibold leading-none tracking-[-0.04em] md:text-[2.8rem]"
                  style={{ color: form.text_color }}
                >
                  {form.headline || 'Book your service'}
                </h2>

                <p
                  className="mx-auto mt-5 max-w-2xl text-[16px] leading-8"
                  style={{ color: mutedTextColor }}
                >
                  {form.subheadline || 'Choose a service, select a day, and book your time.'}
                </p>
              </div>

              <div className="space-y-8 pt-8">
                <section className="space-y-4">
                  <label className="block text-[15px] font-semibold" style={{ color: form.text_color }}>
                    Choose a service
                  </label>

                  <div className="grid gap-4">
                    <div
                      className="rounded-[26px] border p-5"
                      style={{
                        borderColor: form.accent_color,
                        backgroundColor: accentSoft,
                        color: form.text_color,
                        boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className="text-[18px] font-semibold"
                            style={{ color: form.text_color }}
                          >
                            Lawn Care Estimate
                          </p>
                          <p className="mt-3 text-[15px] leading-7" style={{ color: mutedTextColor }}>
                            On-site quote for mowing, cleanup, or regular property service.
                          </p>
                        </div>

                        <div
                          className="mt-1 h-5 w-5 rounded-full border"
                          style={{
                            borderColor: form.accent_color,
                            backgroundColor: form.accent_color,
                          }}
                        />
                      </div>
                    </div>

                    <div
                      className="rounded-[26px] border p-5"
                      style={{
                        borderColor: softBorderColor,
                        backgroundColor: 'transparent',
                        color: form.text_color,
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className="text-[18px] font-semibold"
                            style={{ color: subtleTextColor }}
                          >
                            Spring Cleanup
                          </p>
                        </div>

                        <div
                          className="mt-1 h-5 w-5 rounded-full border"
                          style={{
                            borderColor: `${form.text_color}33`,
                            backgroundColor: 'transparent',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <label className="block text-[15px] font-semibold" style={{ color: form.text_color }}>
                    Choose a date
                  </label>

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
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-lg font-medium"
                        style={{
                          borderColor: softBorderColor,
                          color: form.text_color,
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        ←
                      </button>

                      <div className="text-center">
                        <p className="text-[17px] font-semibold" style={{ color: form.text_color }}>
                          {formatPreviewMonth(previewMonth)}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: mutedTextColor }}>
                          Select an available day
                        </p>
                      </div>

                      <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-lg font-medium"
                        style={{
                          borderColor: softBorderColor,
                          color: form.text_color,
                          backgroundColor: '#FFFFFF',
                        }}
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
                      {previewDays.map((day) => {
                        const dateStr = toLocalDateString(day)
                        const inCurrentMonth = isSameMonth(day, previewMonth)
                        const isAvailable = inCurrentMonth && previewAvailableDates.has(dateStr)
                        const isSelected = dateStr === previewSelectedDate
                        const isToday = dateStr === toLocalDateString(new Date())

                        return (
                          <div
                            key={dateStr}
                            className="relative flex aspect-square items-center justify-center rounded-[20px] border text-sm font-medium"
                            style={{
                              borderColor: isSelected
                                ? form.accent_color
                                : isToday
                                  ? accentBorder
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
                                style={{ backgroundColor: form.accent_color }}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div
                      className="mt-5 rounded-[22px] border px-4 py-3 text-sm"
                      style={{
                        borderColor: accentBorder,
                        backgroundColor: accentSoft,
                        color: form.text_color,
                      }}
                    >
                      Selected:{' '}
                      <span className="font-semibold">
                        {formatPreviewFullDate(new Date(`${previewSelectedDate}T12:00:00`))}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <label className="block text-[15px] font-semibold" style={{ color: form.text_color }}>
                    Choose a time
                  </label>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {['9:00 AM', '10:30 AM', '1:00 PM', '2:30 PM'].map((time, index) => {
                      const isSelected = index === 1

                      return (
                        <div
                          key={time}
                          className="rounded-2xl border px-4 py-3.5 text-center text-sm font-medium"
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

                <div
                  className="rounded-[24px] border p-5"
                  style={{
                    borderColor: accentBorder,
                    backgroundColor: accentSoft,
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: form.text_color }}>
                    Selected appointment
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: mutedTextColor }}>
                    {formatPreviewFullDate(new Date(`${previewSelectedDate}T12:00:00`))} at 10:30 AM
                  </p>
                </div>

                <section className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[15px] font-semibold">
                      Name
                    </label>
                    <div
                      className="rounded-[18px] border px-4 py-3.5"
                      style={{
                        borderColor: softBorderColor,
                        backgroundColor: softSurface,
                        color: form.text_color,
                      }}
                    >
                      John Smith
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[15px] font-semibold">
                      Email
                    </label>
                    <div
                      className="rounded-[18px] border px-4 py-3.5"
                      style={{
                        borderColor: softBorderColor,
                        backgroundColor: softSurface,
                        color: form.text_color,
                      }}
                    >
                      john@email.com
                    </div>
                  </div>
                </section>

                <section>
                  <label className="mb-2 block text-[15px] font-semibold">
                    Phone
                  </label>
                  <div
                    className="rounded-[18px] border px-4 py-3.5"
                    style={{
                      borderColor: softBorderColor,
                      backgroundColor: softSurface,
                      color: form.text_color,
                    }}
                  >
                    (555) 555-5555
                  </div>
                </section>

                <section>
                  <label className="mb-2 block text-[15px] font-semibold">
                    Notes
                  </label>
                  <div
                    className="min-h-[130px] rounded-[18px] border px-4 py-3.5"
                    style={{
                      borderColor: softBorderColor,
                      backgroundColor: softSurface,
                      color: mutedTextColor,
                    }}
                  >
                    Add any details about the job, property, or request.
                  </div>
                </section>

                <div className="space-y-5 pt-2">
                  <button
                    type="button"
                    className="w-full rounded-[20px] px-4 py-4 text-sm font-semibold"
                    style={{
                      backgroundColor: form.accent_color,
                      color: '#111111',
                    }}
                  >
                    {form.button_label || 'Book now'}
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

                <div
                  className="rounded-[24px] border p-4"
                  style={{
                    borderColor: softBorderColor,
                    backgroundColor: softSurface,
                  }}
                >
                  <p className="text-sm" style={{ color: mutedTextColor }}>
                    <span className="font-semibold" style={{ color: form.text_color }}>
                      Confirmation preview:
                    </span>{' '}
                    {form.confirmation_message ||
                      'Thanks, your booking request has been received.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}