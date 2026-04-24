import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  deleteAccountAction,
  sendPasswordResetAction,
  signOutAction,
} from './actions'

function getInitials(fullName: string, email?: string | null) {
  if (fullName.trim()) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }

  if (email) {
    return email.slice(0, 2).toUpperCase()
  }

  return 'CB'
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>
}) {
  const params = (await searchParams) ?? {}

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {}
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let fullName = ''
  let businessName = ''

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_id')
    .eq('id', user.id)
    .single()

  if (profile?.full_name) {
    fullName = profile.full_name
  }

  if (profile?.business_id) {
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', profile.business_id)
      .single()

    if (business?.name) {
      businessName = business.name
    }
  }

  const initials = getInitials(fullName, user.email)
  const displayName = fullName || 'Account Owner'

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Account
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Manage your account and business settings.
          </p>
        </div>

        {params.success === 'password-reset' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)]">
            Password reset email sent.
          </div>
        )}

        {params.error && (
          <div className="rounded-2xl border border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.08)] px-4 py-3 text-sm text-[#dc2626]">
            Something went wrong. Please try again.
          </div>
        )}

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="border-b border-[var(--border)] px-6 py-6 md:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff9f43,#ffb86b)] text-lg font-semibold text-white shadow-[0_14px_34px_rgba(255,159,67,0.28)]">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                  {displayName}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {user.email}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Update the core details tied to your ClickBooks account.
                </p>
              </div>
            </div>
          </div>

          <form className="px-6 py-6 md:px-8 md:py-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue={fullName}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[#ff9f43] focus:ring-4 focus:ring-[rgba(255,159,67,0.10)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Business Name
                </label>
                <input
                  type="text"
                  defaultValue={businessName}
                  placeholder="Your business name"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[#ff9f43] focus:ring-4 focus:ring-[rgba(255,159,67,0.10)]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email ?? ''}
                  disabled
                  className="w-full cursor-not-allowed rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text-secondary)] outline-none"
                />
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Your login email is currently read-only here.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                Changes will update the account information shown across your dashboard.
              </p>

              <button
                type="submit"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff9f43,#ffb86b)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(255,159,67,0.26)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_38px_rgba(255,159,67,0.34)]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Account Actions
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage password, session, and account access.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <form action={sendPasswordResetAction}>
              <button
                type="submit"
                className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg)]"
              >
                New Password
              </button>
            </form>

            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg)]"
              >
                Sign Out
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Account Summary
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Account Name
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                {displayName}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Email
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                {user.email}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Business
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                {businessName || 'No business found'}
              </p>
            </div>
          </div>
        </section>

        <div className="flex justify-center pt-2">
          <form action={deleteAccountAction}>
            <button
              type="submit"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.08)] px-6 py-3 text-sm font-semibold text-[#dc2626] transition hover:bg-[rgba(220,38,38,0.12)]"
            >
              Delete Account
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}