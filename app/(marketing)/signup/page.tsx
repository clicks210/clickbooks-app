'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = useMemo(() => createClient(), [])

  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    email: '',
    password: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  function updateField(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setSuccess(false)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          full_name: form.fullName,
          business_name: form.businessName,
        },
      },
    })

    if (error) {
      setMessage(error.message)
      setSuccess(false)
    } else {
      setMessage(
        `Check ${form.email} to confirm your account and activate ClickBooks.`
      )
      setSuccess(true)
      setForm({
        fullName: '',
        businessName: '',
        email: '',
        password: '',
      })
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen">
      <section className="container flex min-h-[calc(100vh-100px)] items-center py-10 md:py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex rounded-full border border-[#FF9F43]/30 bg-[#FF9F43]/10 px-3 py-1 text-sm font-medium text-[#FF9F43]">
              Create your ClickBooks account
            </div>

            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Launch a booking widget that actually feels professional
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8">
              Build, style, and embed your booking experience from one place.
              No clunky setup. No duct-taped forms.
            </p>

            <div className="mt-8 space-y-4 text-sm text-[var(--text-secondary)]">
              <div className="card p-4">Centralized widget builder</div>
              <div className="card p-4">Embeddable on any website</div>
              <div className="card p-4">Live booking updates from one dashboard</div>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            {!success ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Get started</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Create your account to start building your widget.
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Full name
                    </label>
                    <input
                      name="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={updateField}
                      placeholder="Liam Milovick"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Business name
                    </label>
                    <input
                      name="businessName"
                      type="text"
                      value={form.businessName}
                      onChange={updateField}
                      placeholder="Green Acre Landscaping"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={updateField}
                      placeholder="you@business.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Password
                    </label>
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={updateField}
                      placeholder="Create a secure password"
                      required
                      minLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="mb-4 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                  Check your inbox
                </div>

                <h2 className="text-2xl font-semibold">Confirm your email</h2>

                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  We sent you a confirmation link. Once you confirm, you’ll be
                  taken into ClickBooks to finish setup.
                </p>

                {message && (
                  <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                    {message}
                  </div>
                )}

                <div className="mt-6 text-sm text-[var(--text-secondary)]">
                  Already confirmed?{' '}
                  <Link href="/login" className="text-[#FF9F43] hover:underline">
                    Log in
                  </Link>
                </div>
              </div>
            )}

            {!success && message && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {message}
              </div>
            )}

            {!success && (
              <div className="mt-6 text-sm text-[var(--text-secondary)]">
                Already have an account?{' '}
                <Link href="/login" className="text-[#FF9F43] hover:underline">
                  Log in
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}