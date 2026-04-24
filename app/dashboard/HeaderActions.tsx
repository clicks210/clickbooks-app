'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HeaderActions() {
  const router = useRouter()
  const [slug, setSlug] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function loadBusiness() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (!profile?.business_id) return

      const { data: business } = await supabase
        .from('businesses')
        .select('slug')
        .eq('id', profile.business_id)
        .single()

      if (business?.slug) {
        setSlug(business.slug)
      }
    }

    loadBusiness()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    setSigningOut(true)

    await supabase.auth.signOut()

    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      {slug && (
        <Link
          href={`/widget/${slug}`}
          target="_blank"
          className="btn-secondary text-sm"
        >
          View Widget
        </Link>
      )}

      <Link href="/dashboard/widget" className="btn-primary text-sm">
        Edit Widget
      </Link>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
      >
        {signingOut ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  )
}