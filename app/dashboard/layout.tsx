import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import HeaderActions from '@/components/dashboard/HeaderActions'

const navItems = [
  { href: '/dashboard/widget', label: 'Widget Builder' },
  { href: '/dashboard/availability', label: 'Availability' },
  { href: '/dashboard/services', label: 'Services' },
  { href: '/dashboard/bookings', label: 'Bookings' },
  { href: '/dashboard/install', label: 'Install' },
]

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
          } catch {
            // safe in server component contexts where cookies may be read-only
          }
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

  let businessName = 'Your Business'
  let fullName = ''
  const userEmail = user.email ?? null

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id, full_name')
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

  const initials = getInitials(fullName, userEmail)
  const displayName = fullName || businessName

  return (
    <main className="h-screen overflow-hidden bg-[var(--bg)]">
      <div className="flex h-full">
        <aside className="hidden h-full w-72 shrink-0 border-r border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b border-[var(--border)] px-6 py-7">
              <Link href="/" className="inline-flex items-center">
                <img
                  src="https://cdn.prod.website-files.com/689be253c8ffdea53a0bdafb/69e7a954fc9d03a545c4b114_clickbooks.png"
                  alt="ClickBooks"
                  className="h-16 w-auto object-contain"
                />
              </Link>

              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  ClickBooks
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Business Dashboard
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  Manage bookings, services, availability, and install settings.
                </p>
              </div>
            </div>

            <nav className="flex-1 px-4 py-6">
              <div className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[rgba(255,159,67,0.16)] hover:bg-[linear-gradient(180deg,rgba(255,159,67,0.10),rgba(255,159,67,0.04))] hover:text-[var(--text-primary)] hover:shadow-[0_10px_30px_rgba(255,159,67,0.08)]"
                  >
                    <span className="transition-transform duration-200 group-hover:translate-x-[2px]">
                      {item.label}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-transparent transition-colors duration-200 group-hover:bg-[var(--accent-strong)]" />
                  </Link>
                ))}
              </div>
            </nav>

            <div className="border-t border-[var(--border)] p-4">
              <Link
                href="/dashboard/profile"
                className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)]/80 px-3 py-3 transition-all duration-200 hover:border-[rgba(255,159,67,0.18)] hover:bg-[var(--surface-alt)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-strong),#ffb86b)] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,159,67,0.30)]">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {userEmail || 'Manage your profile'}
                  </p>
                </div>

                <div className="text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-[2px] group-hover:text-[var(--text-primary)]">
                  →
                </div>
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <header className="border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-5 md:px-8">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Dashboard
                </h1>
              </div>

              <HeaderActions />
            </div>
          </header>

          <section className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </section>
        </div>
      </div>
    </main>
  )
}