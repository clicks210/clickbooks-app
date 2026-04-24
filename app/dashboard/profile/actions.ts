'use server'

import { redirect } from 'next/navigation'
import { createServerClient, createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

function getBaseUrl() {
  const h = headers()
  const origin = h.get('origin')
  if (origin) return origin
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

async function getAuthedSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
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
}

export async function signOutAction() {
  const supabase = await getAuthedSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function sendPasswordResetAction() {
  const supabase = await getAuthedSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/dashboard/profile?error=no-email')
  }

  const baseUrl = getBaseUrl()

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${baseUrl}/reset-password`,
  })

  if (error) {
    redirect('/dashboard/profile?error=password-reset')
  }

  redirect('/dashboard/profile?success=password-reset')
}

export async function deleteAccountAction() {
  const supabase = await getAuthedSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // delete user-owned rows first if your FK constraints require it
  await admin.from('profiles').delete().eq('id', user.id)

  if (profile?.business_id) {
    await admin.from('widgets').delete().eq('business_id', profile.business_id)
    await admin.from('services').delete().eq('business_id', profile.business_id)
    await admin.from('availability').delete().eq('business_id', profile.business_id)
    await admin.from('bookings').delete().eq('business_id', profile.business_id)
    await admin.from('businesses').delete().eq('id', profile.business_id)
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    redirect('/dashboard/profile?error=delete-account')
  }

  await supabase.auth.signOut()
  redirect('/signup')
}