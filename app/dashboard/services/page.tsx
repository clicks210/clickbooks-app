'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ProfileRow = {
  business_id: string
}

type Service = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_label: string | null
  is_active: boolean
}

const defaultForm = {
  name: '',
  description: '',
  duration_minutes: '30',
  price_label: '',
}

export default function ServicesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState(defaultForm)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  useEffect(() => {
    async function loadServices() {
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

      const { data: serviceRows, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })

      if (servicesError) {
        setMessage(`Error loading services: ${servicesError.message}`)
        setMessageType('error')
      } else {
        setServices((serviceRows || []) as Service[])
      }

      setLoading(false)
    }

    loadServices()
  }, [router, supabase])

  function updateField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault()

    if (!businessId) {
      setMessage('No business found for this account.')
      setMessageType('error')
      return
    }

    setSaving(true)
    setMessage('Saving...')
    setMessageType('')

    const { data, error } = await supabase
      .from('services')
      .insert({
        business_id: businessId,
        name: form.name,
        description: form.description || null,
        duration_minutes: Number(form.duration_minutes),
        price_label: form.price_label || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      setMessage(`Error creating service: ${error.message}`)
      setMessageType('error')
    } else {
      setServices((prev) => [data as Service, ...prev])
      setForm(defaultForm)
      setMessage('Service created successfully.')
      setMessageType('success')
    }

    setSaving(false)
  }

  async function toggleServiceActive(serviceId: string, currentValue: boolean) {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !currentValue })
      .eq('id', serviceId)

    if (error) {
      setMessage(`Error updating service: ${error.message}`)
      setMessageType('error')
      return
    }

    setServices((prev) =>
      prev.map((service) =>
        service.id === serviceId
          ? { ...service, is_active: !currentValue }
          : service
      )
    )

    setMessage('Service updated successfully.')
    setMessageType('success')
  }

  async function deleteService(serviceId: string) {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      setMessage(`Error deleting service: ${error.message}`)
      setMessageType('error')
      return
    }

    setServices((prev) => prev.filter((service) => service.id !== serviceId))
    setMessage('Service deleted successfully.')
    setMessageType('success')
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="card p-6">
          <p>Loading services...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-8">
      <div>
        
        <h1 className="text-3xl font-semibold md:text-4xl">
          Manage your services
        </h1>
        
      </div>

      <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
        <div className="card p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Add Service</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Create a new service and publish it to your widget.
            </p>
          </div>

          <form onSubmit={handleCreateService} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Service Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Lawn Care Estimate"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Short description of what this service includes"
                className="min-h-[110px]"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Duration (minutes)
                </label>
                <input
                  name="duration_minutes"
                  type="number"
                  min="5"
                  step="5"
                  value={form.duration_minutes}
                  onChange={updateField}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Price Label
                </label>
                <input
                  name="price_label"
                  value={form.price_label}
                  onChange={updateField}
                  placeholder="Free estimate"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Service'}
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
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Current Services</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              These are the services currently attached to your business.
            </p>
          </div>

          {services.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-[var(--text-secondary)]">
                No services yet. Add your first service to make your widget
                bookable.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold">{service.name}</h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            service.is_active
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-white/10 bg-white/5 text-[var(--text-secondary)]'
                          }`}
                        >
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                        <span>{service.duration_minutes} min</span>
                        {service.price_label && <span>{service.price_label}</span>}
                      </div>

                      {service.description && (
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                          {service.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleServiceActive(service.id, service.is_active)
                        }
                        className="btn-secondary text-sm"
                      >
                        {service.is_active ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteService(service.id)}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/15"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}