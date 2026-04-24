export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import PublicBookingForm from '@/components/widget/PublicBookingForm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Business = {
  id: string
  name: string
  slug: string
  email: string | null
}

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
  created_at: string
}

type Service = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_label: string | null
  is_active: boolean
}

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ success?: string; error?: string; embed?: string }>
}) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams

  const success = resolvedSearchParams.success === '1'
  const error = resolvedSearchParams.error === '1'
  const embed = resolvedSearchParams.embed === '1'

  // --- business ---
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, name, slug, email')
    .eq('slug', slug)
    .single<Business>()

  if (businessError || !business) return notFound()

  // --- widget ---
  const { data: widget, error: widgetError } = await supabase
    .from('widgets')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Widget>()

  if (widgetError || !widget) return notFound()

  // --- services ---
  const { data: services } = await supabase
    .from('services')
    .select('id, name, description, duration_minutes, price_label, is_active')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .returns<Service[]>()

  const content = (
    <PublicBookingForm
      business={business}
      widget={widget}
      services={services || []}
      success={success}
      error={error}
    />
  )

  // --- EMBED MODE ---
  if (embed) {
    return (
      <main
        style={{
          backgroundColor: widget.background_color || '#ffffff',
          color: widget.text_color,
          minHeight: '100vh',
        }}
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-8">
          {content}
        </div>
      </main>
    )
  }

  // --- FULL PAGE MODE ---
  return (
    <main
      className="px-4 py-8 md:px-6 md:py-14"
      style={{
        backgroundColor: widget.background_color || '#f9fafb',
        minHeight: '100vh',
      }}
    >
      <div className="mx-auto w-full max-w-2xl">
        {content}
      </div>
    </main>
  )
}