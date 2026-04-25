'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  Globe,
  Laptop,
  Mail,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'

const bookingFeatures = [
  'Unlimited bookings',
  'Branded booking widget',
  'Services and availability',
  'Email confirmations',
  'Works on your current website',
  'Simple dashboard',
]

const websiteFeatures = [
  'Everything in ClickBooks',
  'Custom one-page website',
  'Booking system installed',
  'Mobile-ready design',
  'Fast setup and launch',
  'No big upfront website bill',
]

const featureCards = [
  {
    icon: CalendarCheck,
    title: 'Cleaner booking flow',
    body: 'Customers choose a service, pick a time, and send the request without the usual back-and-forth.',
  },
  {
    icon: Laptop,
    title: 'Made for service businesses',
    body: 'A good fit for landscapers, detailers, cleaners, contractors, wellness providers, and mobile services.',
  },
  {
    icon: Globe,
    title: 'Website optional',
    body: 'Add ClickBooks to your existing site, or get a clean site with the booking system already built in.',
  },
]

const faqs = [
  {
    q: 'Do I need a new website?',
    a: 'No. Use ClickBooks with your current site, or choose the website plan if you want the whole thing handled.',
  },
  {
    q: 'Is there a setup fee?',
    a: 'The ClickBooks plan is $59/month. The website plan is $99/month with no large upfront website bill.',
  },
  {
    q: 'Can I cancel?',
    a: 'Yes. No long contract. No weird lock-in.',
  },
  {
    q: 'Who is this for?',
    a: 'Service businesses that want customers to book directly instead of calling, texting, or falling through the cracks.',
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <section className="relative px-6 pb-14 pt-20 sm:pt-24 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[var(--accent)]/20 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-white/70" />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
           

            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Pick the setup that gets you booked faster.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              Add ClickBooks to your current website, or get a clean website with the booking system already installed.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold">
                Start with ClickBooks
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/demo" className="btn-white inline-flex items-center justify-center rounded-full text-sm font-bold">
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <PricingCard
            eyebrow="Already have a website?"
            title="ClickBooks"
            price="$59"
            description="Add a branded booking system to your existing site."
            features={bookingFeatures}
            cta="Get ClickBooks"
            href="/signup"
          />

          <PricingCard
            featured
            eyebrow="Want the whole thing handled?"
            title="ClickBooks + Website"
            price="$99"
            description="A clean website with your booking system built in."
            features={websiteFeatures}
            cta="Get my site built"
            href="/signup?plan=website"
          />
        </div>
      </section>

      <section className="px-6 py-10 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-md)] sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#dd6b20]">
                The math is simple
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                One booked job can cover the month.
              </h2>
            </div>
            <p className="text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              ClickBooks is built for businesses where one new customer can be worth hundreds of dollars. If the booking flow helps one extra person take action, it has already done its job.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <div className="badge-accent mb-4 inline-flex">Why it works</div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Less friction. More booked work.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
              The goal is not more software. The goal is making the next step obvious when a customer is ready.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="card rounded-[24px] p-6">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[#dd6b20]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{feature.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-6 py-10 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <div className="surface rounded-[32px] bg-white p-8 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-[var(--text-primary)]">
              <Wrench className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Have a site?</h2>
            <p className="mt-4 leading-8 text-[var(--text-secondary)]">
              Add ClickBooks to it and send customers to a simple booking flow. No rebuild needed.
            </p>
          </div>

          <div className="rounded-[32px] border border-[var(--accent)]/30 bg-[#fff7ed] p-8 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Need a site?</h2>
            <p className="mt-4 leading-8 text-[var(--text-secondary)]">
              Get a clean website with ClickBooks already installed, so the business looks sharp and customers can book right away.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="badge-accent mb-4 inline-flex">FAQ</div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Quick answers.</h2>
          </div>

          <div className="mt-10 grid gap-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="surface rounded-[24px] bg-white p-6 shadow-sm">
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="mt-2 leading-7 text-[var(--text-secondary)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-8 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[36px] bg-[var(--accent)] p-8 text-center shadow-[var(--shadow-lg)] sm:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 text-[#dd6b20]">
            <Clock className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Stop letting good leads go cold.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-black/70 sm:text-lg">
            Give customers a clear way to book the moment they are ready.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-white inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold">
              Start now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="mailto:hello@clickmade.ca" className="btn-secondary inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold">
              <Mail className="h-4 w-4" />
              Ask a question
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

type PricingCardProps = {
  eyebrow: string
  title: string
  price: string
  description: string
  features: string[]
  cta: string
  href: string
  featured?: boolean
}

function PricingCard({ eyebrow, title, price, description, features, cta, href, featured }: PricingCardProps) {
  return (
    <div
      className={[
        'relative rounded-[32px] border p-7 shadow-sm sm:p-8',
        featured
          ? 'border-[var(--accent)]/60 bg-white shadow-[var(--shadow-lg)] ring-4 ring-[var(--accent)]/15'
          : 'border-[var(--border)] bg-white',
      ].join(' ')}
    >
      {featured && (
        <div className="absolute right-6 top-6 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Best value
        </div>
      )}

      <p className="text-sm font-semibold text-[var(--text-muted)]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 min-h-[56px] max-w-md leading-7 text-[var(--text-secondary)]">{description}</p>

      <div className="mt-8 flex items-end gap-2">
        <span className="text-5xl font-semibold tracking-tight">{price}</span>
        <span className="pb-2 font-semibold text-[var(--text-muted)]">/ month</span>
      </div>

      {featured && (
        <p className="mt-4 rounded-2xl bg-[#fff3e0] px-4 py-3 text-sm font-semibold text-black/70">
          No upfront website cost. No $2,000 rebuild. One simple monthly price.
        </p>
      )}

      <Link
        href={href}
        className={[
          'mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full text-sm font-bold',
          featured ? 'btn-primary' : 'btn-secondary',
        ].join(' ')}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>

      <div className="mt-8 space-y-4">
        {features.map((feature) => (
          <div key={feature} className="flex gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <Check className="h-3.5 w-3.5 text-[#dd6b20]" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-secondary)]">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
