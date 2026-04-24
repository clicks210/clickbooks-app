'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SignOutButton from '@/components/dashboard/SignOutButton'

export default function HeaderActions() {
  const supabase = useMemo(() => createClient(), [])
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
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
  }, [supabase])

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

      <SignOutButton />
    </div>
  )
}