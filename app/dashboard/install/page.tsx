'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ProfileRow = {
  business_id: string
}

type BusinessRow = {
  id: string
  name: string
  slug: string
}

type WidgetRow = {
  launcher_label: string | null
  launcher_icon: string | null
  launcher_color: string | null
  launcher_position: string | null
}

export default function InstallPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [widget, setWidget] = useState<WidgetRow | null>(null)

  useEffect(() => {
    async function loadInstallData() {
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

      const { data: businessRow, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('id', profile.business_id)
        .single<BusinessRow>()

      if (businessError || !businessRow) {
        setMessage('Could not load your install settings.')
        setMessageType('error')
        setLoading(false)
        return
      }

      const { data: widgetRow, error: widgetError } = await supabase
        .from('widgets')
        .select('launcher_label, launcher_icon, launcher_color, launcher_position')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<WidgetRow>()

      if (widgetError) {
        setMessage('Could not load launcher settings.')
        setMessageType('error')
        setLoading(false)
        return
      }

      setBusiness(businessRow)
      setWidget(widgetRow)
      setLoading(false)
    }

    loadInstallData()
  }, [router, supabase])

   // FORCE production URL (no localhost fallback)
  const baseUrl = useMemo(() => {
    const envUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL

    if (envUrl) return envUrl.replace(/\/$/, '')

    // HARD fallback (only used if env is missing)
    if (typeof window !== 'undefined') {
      return window.location.origin
    }

    return ''
  }, [])

  const widgetUrl = useMemo(() => {
    if (!business || !baseUrl) return ''
    return `${baseUrl}/widget/${business.slug}`
  }, [baseUrl, business])

  const embedCode = useMemo(() => {
    if (!business || !baseUrl) return ''

    return `<script
  src="${baseUrl}/embed.js"
  data-slug="${business.slug}"
  data-label="${widget?.launcher_label || 'Book Now'}"
  data-position="${widget?.launcher_position || 'right'}"
  data-color="${widget?.launcher_color || '#FF9F43'}"
  data-icon="${widget?.launcher_icon || 'calendar'}"
></script>`
  }, [baseUrl, business, widget])

  async function handleCopy() {
    if (!embedCode) return

    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage('Could not copy install code.')
      setMessageType('error')
    }
  }

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="card p-6">
          <p>Loading install options...</p>
        </div>
      </main>
    )
  }

  if (!business) {
    return (
      <main className="space-y-8">
        <div className="card p-6">
          <p>Could not load business install data.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">
          Install your booking launcher
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

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Install Script</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Copy and paste this script into the site where you want your
                booking launcher to appear.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-primary)]">
                {embedCode}
              </pre>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={handleCopy} className="btn-primary">
                {copied ? 'Copied' : 'Copy Script'}
              </button>

              <a
                href={widgetUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                Open Live Widget
              </a>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">How to Install</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The launcher script adds a floating booking button and handles
                the modal automatically.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Step 1
                </p>
                <p className="mt-2 font-medium">Copy the script</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Use the install snippet above. It already includes your
                  business slug and launcher settings.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Step 2
                </p>
                <p className="mt-2 font-medium">Paste it into the site</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Add it before the closing <code>{'</body>'}</code> tag or in a
                  custom code section of the website.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Step 3
                </p>
                <p className="mt-2 font-medium">Launch the widget</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  A floating booking button will appear in the selected corner.
                  Clicking it opens your booking widget in a modal.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Your Widget</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Quick reference details for this install.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Business
                </p>
                <p className="mt-2 text-sm text-[var(--text-primary)]">
                  {business.name}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Slug
                </p>
                <p className="mt-2 break-all text-sm text-[var(--text-primary)]">
                  {business.slug}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Widget URL
                </p>
                <p className="mt-2 break-all text-sm text-[var(--text-primary)]">
                  {widgetUrl}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Launcher
                </p>
                <p className="mt-2 text-sm text-[var(--text-primary)]">
                  {widget?.launcher_label || 'Book Now'} ·{' '}
                  {widget?.launcher_icon || 'calendar'} ·{' '}
                  {widget?.launcher_position || 'right'}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Install Notes</h2>
            </div>

            <div className="space-y-4 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                The launcher script keeps styling isolated by loading your
                booking experience inside a modal iframe.
              </p>
              <p>
                This makes installs cleaner and avoids CSS conflicts with the
                client’s website.
              </p>
              <p>
                You can customize the widget itself from the{' '}
                <Link href="/dashboard/widget" className="underline">
                  Widget Builder
                </Link>{' '}
                and manage services from the{' '}
                <Link href="/dashboard/services" className="underline">
                  Services
                </Link>{' '}
                page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}