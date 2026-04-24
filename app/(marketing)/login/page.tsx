'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function updateField(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/widget')
    router.refresh()
  }

  return (
    <main className="min-h-screen">
      <section className="container flex min-h-[calc(100vh-100px)] items-center py-10 md:py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex rounded-full border border-[#FF9F43]/30 bg-[#FF9F43]/10 px-3 py-1 text-sm font-medium text-[#FF9F43]">
              Welcome back
            </div>

            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Log in and get back to building
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8">
              Manage your widget, update your booking flow, and keep everything
              running from one clean dashboard.
            </p>

            <div className="mt-8 space-y-4 text-sm text-[var(--text-secondary)]">
              <div className="card p-4">Update your widget in real time</div>
              <div className="card p-4">Manage bookings from one dashboard</div>
              <div className="card p-4">Embed once, control everything centrally</div>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Log in</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Enter your account details to continue.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
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
                <label className="mb-2 block text-sm font-medium">Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={updateField}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>

            {message && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {message}
              </div>
            )}

            <div className="mt-6 text-sm text-[var(--text-secondary)]">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#FF9F43] hover:underline">
                Create one
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}