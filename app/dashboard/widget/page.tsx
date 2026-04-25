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
  launcher_label?: string | null
  launcher_icon?: string | null
  launcher_color?: string | null
  launcher_position?: string | null
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
  launcher_label: 'Book Now',
  launcher_icon: 'calendar',
  launcher_color: '#FF9F43',
  launcher_position: 'right',
}

const launcherIcons: Record<string, string> = {
  calendar: '📅',
  clock: '⏱️',
  arrow: '→',
  none: '',
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
        name: widget.name || defaultWidgetForm.name,
        headline: widget.headline || defaultWidgetForm.headline,
        subheadline: widget.subheadline || defaultWidgetForm.subheadline,
        button_label: widget.button_label || defaultWidgetForm.button_label,
        accent_color: widget.accent_color || defaultWidgetForm.accent_color,
        background_color: widget.background_color || defaultWidgetForm.background_color,
        text_color: widget.text_color || defaultWidgetForm.text_color,
        confirmation_message:
          widget.confirmation_message || defaultWidgetForm.confirmation_message,
        logo_url: widget.logo_url || '',
        launcher_label: widget.launcher_label || defaultWidgetForm.launcher_label,
        launcher_icon: widget.launcher_icon || defaultWidgetForm.launcher_icon,
        launcher_color: widget.launcher_color || defaultWidgetForm.launcher_color,
        launcher_position:
          widget.launcher_position || defaultWidgetForm.launcher_position,
      })

      setLoading(false)
    }

    fetchWidget()
  }, [router, supabase])

  function updateField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
        launcher_label: form.launcher_label,
        launcher_icon: form.launcher_icon,
        launcher_color: form.launcher_color,
        launcher_position: form.launcher_position,
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
    return new Set(
      [1, 2, 4, 6, 9].map((offset) => {
        const d = new Date()
        d.setDate(d.getDate() + offset)
        return toLocalDateString(d)
      })
    )
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
                These settings control the public widget and the floating launcher button.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-4 text-lg font-semibold">Launcher Button</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Launcher Label
                    </label>
                    <input
                      name="launcher_label"
                      value={form.launcher_label}
                      onChange={updateField}
                      placeholder="Book Now"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Launcher Icon
                    </label>
                    <select
                      name="launcher_icon"
                      value={form.launcher_icon}
                      onChange={updateField}
                    >
                      <option value="calendar">Calendar</option>
                      <option value="clock">Clock</option>
                      <option value="arrow">Arrow</option>
                      <option value="none">None</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Launcher Color
                    </label>
                    <input
                      type="color"
                      name="launcher_color"
                      value={form.launcher_color}
                      onChange={updateField}
                      className="h-12 cursor-pointer rounded-xl p-1"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Launcher Position
                    </label>
                    <select
                      name="launcher_position"
                      value={form.launcher_position}
                      onChange={updateField}
                    >
                      <option value="right">Bottom Right</option>
                      <option value="left">Bottom Left</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
                  <p className="mb-4 text-sm font-medium text-[var(--text-secondary)]">
                    Launcher Preview
                  </p>

                  <div className="relative h-36 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <button
                      type="button"
                      className={`absolute bottom-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] ${
                        form.launcher_position === 'left' ? 'left-5' : 'right-5'
                      }`}
                      style={{ backgroundColor: form.launcher_color }}
                    >
                      {launcherIcons[form.launcher_icon] && (
                        <span>{launcherIcons[form.launcher_icon]}</span>
                      )}
                      <span>{form.launcher_label || 'Book Now'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Widget Name
                </label>
                <input name="name" value={form.name} onChange={updateField} required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Headline</label>
                <input
                  name="headline"
                  value={form.headline}
                  onChange={updateField}
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
                  className="min-h-[110px]"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Main Button Label
                </label>
                <input
                  name="button_label"
                  value={form.button_label}
                  onChange={updateField}
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
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Logo URL</label>
                  <input
                    name="logo_url"
                    value={form.logo_url}
                    onChange={updateField}
                    placeholder="https://your-site.com/logo.png"
                  />
                </div>

                {form.logo_url && (
                  <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <img
                      src={form.logo_url}
                      alt="Logo preview"
                      className="h-12 w-auto max-w-[180px] object-contain"
                    />
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
                  <label className="mb-2 block text-sm font-medium">Background</label>
                  <input
                    type="color"
                    name="background_color"
                    value={form.background_color}
                    onChange={updateField}
                    className="h-12 cursor-pointer rounded-xl p-1"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Text Color</label>
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
              className="rounded-[34px] border p-6 shadow-[0_30px_90px_rgba(0,0,0,0.10)] md:p-8"
              style={{
                backgroundColor: form.background_color,
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

                <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-8" style={{ color: mutedTextColor }}>
                  {form.subheadline || 'Choose a service, select a day, and book your time.'}
                </p>
              </div>

              <div className="space-y-8 pt-8">
                <section className="space-y-4">
                  <label className="block text-[15px] font-semibold" style={{ color: form.text_color }}>
                    Choose a service
                  </label>

                  <div
                    className="rounded-[26px] border p-5"
                    style={{
                      borderColor: form.accent_color,
                      backgroundColor: accentSoft,
                    }}
                  >
                    <p className="text-[18px] font-semibold">Lawn Care Estimate</p>
                    <p className="mt-3 text-[15px] leading-7" style={{ color: mutedTextColor }}>
                      On-site quote for mowing, cleanup, or regular property service.
                    </p>
                  </div>
                </section>

                <section className="space-y-4">
                  <label className="block text-[15px] font-semibold" style={{ color: form.text_color }}>
                    Choose a date
                  </label>

                  <div className="rounded-[28px] border p-5" style={{ borderColor: softBorderColor }}>
                    <div className="mb-5 text-center">
                      <p className="text-[17px] font-semibold">{formatPreviewMonth(previewMonth)}</p>
                      <p className="mt-1 text-xs" style={{ color: mutedTextColor }}>
                        Select an available day
                      </p>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {previewDays.slice(0, 28).map((day) => {
                        const dateStr = toLocalDateString(day)
                        const inCurrentMonth = isSameMonth(day, previewMonth)
                        const isAvailable = inCurrentMonth && previewAvailableDates.has(dateStr)
                        const isSelected = dateStr === previewSelectedDate

                        return (
                          <div
                            key={dateStr}
                            className="flex aspect-square items-center justify-center rounded-[18px] border text-sm font-medium"
                            style={{
                              borderColor: isSelected ? form.accent_color : softerBorderColor,
                              backgroundColor: isSelected ? form.accent_color : isAvailable ? softSurface : 'transparent',
                              color: isSelected ? '#111111' : form.text_color,
                              opacity: inCurrentMonth ? 1 : 0.35,
                            }}
                          >
                            {day.getDate()}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>

                <section className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[15px] font-semibold">Name</label>
                    <div className="rounded-[18px] border px-4 py-3.5" style={{ borderColor: softBorderColor, backgroundColor: softSurface }}>
                      John Smith
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[15px] font-semibold">Email</label>
                    <div className="rounded-[18px] border px-4 py-3.5" style={{ borderColor: softBorderColor, backgroundColor: softSurface }}>
                      john@email.com
                    </div>
                  </div>
                </section>

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

                <div className="rounded-[24px] border p-4" style={{ borderColor: softBorderColor, backgroundColor: softSurface }}>
                  <p className="text-sm" style={{ color: mutedTextColor }}>
                    <span className="font-semibold" style={{ color: form.text_color }}>
                      Confirmation preview:
                    </span>{' '}
                    {form.confirmation_message}
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