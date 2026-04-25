'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2,
  Clock3,
  DollarSign,
  Inbox,
  Plus,
  Power,
  Trash2,
  Wrench,
} from 'lucide-react'

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

function EmptyState() {
  return (
    <div className="surface rounded-[24px] bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-[var(--text-muted)]">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-[var(--text-primary)]">No services yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
        Add your first service to make your booking widget usable for customers.
      </p>
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return <span className="badge-success">Active</span>
  }

  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
      Inactive
    </span>
  )
}

export default function ServicesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState(defaultForm)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
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
        .select('id, name, description, duration_minutes, price_label, is_active')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })
        .returns<Service[]>()

      if (servicesError) {
        setMessage(`Error loading services: ${servicesError.message}`)
        setMessageType('error')
      } else {
        setServices(serviceRows ?? [])
      }

      setLoading(false)
    }

    loadServices()
  }, [router, supabase])

  function updateField(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
    setMessage('')
    setMessageType('')

    const { data, error } = await supabase
      .from('services')
      .insert({
        business_id: businessId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        duration_minutes: Number(form.duration_minutes),
        price_label: form.price_label.trim() || null,
        is_active: true,
      })
      .select('id, name, description, duration_minutes, price_label, is_active')
      .single<Service>()

    if (error) {
      setMessage(`Error creating service: ${error.message}`)
      setMessageType('error')
    } else if (data) {
      setServices((prev) => [data, ...prev])
      setForm(defaultForm)
      setMessage('Service created successfully.')
      setMessageType('success')
    }

    setSaving(false)
  }

  async function toggleServiceActive(serviceId: string, currentValue: boolean) {
    setWorkingId(serviceId)
    setMessage('')
    setMessageType('')

    const { error } = await supabase
      .from('services')
      .update({ is_active: !currentValue })
      .eq('id', serviceId)

    if (error) {
      setMessage(`Error updating service: ${error.message}`)
      setMessageType('error')
      setWorkingId(null)
      return
    }

    setServices((prev) =>
      prev.map((service) =>
        service.id === serviceId ? { ...service, is_active: !currentValue } : service
      )
    )

    setMessage('Service updated successfully.')
    setMessageType('success')
    setWorkingId(null)
  }

  async function deleteService(serviceId: string) {
    const confirmed = window.confirm('Delete this service? This cannot be undone.')

    if (!confirmed) return

    setWorkingId(serviceId)
    setMessage('')
    setMessageType('')

    const { error } = await supabase.from('services').delete().eq('id', serviceId)

    if (error) {
      setMessage(`Error deleting service: ${error.message}`)
      setMessageType('error')
      setWorkingId(null)
      return
    }

    setServices((prev) => prev.filter((service) => service.id !== serviceId))
    setMessage('Service deleted successfully.')
    setMessageType('success')
    setWorkingId(null)
  }

  const activeCount = services.filter((service) => service.is_active).length

  if (loading) {
    return (
      <main className="space-y-8">
        <div className="surface rounded-[24px] bg-white p-6 shadow-sm">
          <p className="text-[var(--text-secondary)]">Loading services...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Services</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Create the services customers can book from your widget.
          </p>
        </div>

        <div className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-sm">
          {activeCount} active · {services.length} total
        </div>
      </div>

      {message && (
        <div
          className={
            messageType === 'success'
              ? 'badge-success w-fit rounded-2xl px-4 py-3'
              : 'badge-danger w-fit rounded-2xl px-4 py-3'
          }
        >
          {message}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
        <div className="surface rounded-[28px] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[#dd6b20]">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Add service</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Add a service, estimate, consultation, or appointment type.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateService} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Service name</label>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Lawn Care Estimate"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Description</label>
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
                <label className="mb-2 block text-sm font-medium">Duration</label>
                <input
                  name="duration_minutes"
                  type="number"
                  min="5"
                  step="5"
                  value={form.duration_minutes}
                  onChange={updateField}
                  required
                />
                <p className="mt-2 text-xs text-[var(--text-muted)]">Minutes</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Price label</label>
                <input
                  name="price_label"
                  value={form.price_label}
                  onChange={updateField}
                  placeholder="Free estimate"
                />
                <p className="mt-2 text-xs text-[var(--text-muted)]">Optional</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {saving ? 'Saving...' : 'Add service'}
            </button>
          </form>
        </div>

        <div className="surface rounded-[28px] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Current services</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                These appear in your booking widget when active.
              </p>
            </div>
          </div>

          {services.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-alt)] p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-md)]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[#dd6b20]">
                          <Wrench className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight">{service.name}</h3>
                        <StatusBadge active={service.is_active} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 font-medium">
                          <Clock3 className="h-4 w-4 text-[var(--text-muted)]" />
                          {service.duration_minutes} min
                        </span>

                        {service.price_label && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1 font-medium">
                            <DollarSign className="h-4 w-4 text-[var(--text-muted)]" />
                            {service.price_label}
                          </span>
                        )}
                      </div>

                      {service.description && (
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                          {service.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 lg:justify-end">
                      <button
                        type="button"
                        disabled={workingId === service.id}
                        onClick={() => toggleServiceActive(service.id, service.is_active)}
                        className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {service.is_active ? <Power className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        {workingId === service.id
                          ? 'Saving...'
                          : service.is_active
                            ? 'Deactivate'
                            : 'Activate'}
                      </button>

                      <button
                        type="button"
                        disabled={workingId === service.id}
                        onClick={() => deleteService(service.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--danger)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
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
