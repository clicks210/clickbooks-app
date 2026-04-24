import Link from 'next/link'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/85 backdrop-blur">
        <div className="container flex items-center justify-between py-5">

          {/* LOGO */}
          <Link href="/" className="flex items-center gap-4">
            <img
              src="https://cdn.prod.website-files.com/689be253c8ffdea53a0bdafb/69e7bf6921a40cf6dd69cc1a_Adobe%20Express%20-%20file.png"
              alt="ClickBooks logo"
              className="h-16 w-auto object-contain md:h-20 lg:h-24"
            />
          </Link>

          {/* NAV */}
          <nav className="flex items-center gap-3 md:gap-4">
            <Link
              href="/pricing"
              className="rounded-full px-4 py-2 text-sm font-medium text-black/70 transition hover:bg-black/5 hover:text-black"
            >
              Pricing
            </Link>

            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-black/70 transition hover:bg-black/5 hover:text-black"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="rounded-full bg-[#FF9F43] px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(255,159,67,0.28)]"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1">{children}</main>

      {/* FOOTER */}
      <footer className="border-t border-black/10 bg-white">
        <div className="container py-12 md:py-16">
          <div className="flex flex-col items-center justify-center text-center">

            <Link href="/" className="inline-flex items-center justify-center">
              <img
                src="https://cdn.prod.website-files.com/689be253c8ffdea53a0bdafb/69e7bf6921a40cf6dd69cc1a_Adobe%20Express%20-%20file.png"
                alt="ClickBooks logo"
                className="h-16 w-auto object-contain md:h-20"
              />
            </Link>

            <p className="mt-5 text-sm font-medium tracking-wide text-black/60 md:text-base">
              Empowering Canadian Service Businesses
            </p>

          </div>
        </div>
      </footer>

    </div>
  )
}