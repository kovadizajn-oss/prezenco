import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* HERO */}
      <section className="relative bg-[#22c55e] overflow-hidden">
        <nav className="absolute top-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                  <svg width="18" height="22" viewBox="0 0 52 64" fill="none">
                    <rect x="4" y="2" width="44" height="6" rx="3" fill="#22c55e"/>
                    <rect x="4" y="56" width="44" height="6" rx="3" fill="#22c55e"/>
                    <line x1="8" y1="8" x2="26" y2="32" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"/>
                    <line x1="44" y1="8" x2="26" y2="32" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"/>
                    <line x1="8" y1="56" x2="26" y2="32" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"/>
                    <line x1="44" y1="56" x2="26" y2="32" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"/>
                    <polygon points="26,34 9,57 43,57" fill="#22c55e" opacity="0.7"/>
                  </svg>
                </div>
                <span className="text-white font-bold text-xl tracking-tight">ZUMMO</span>
              </Link>
              <Link href="/login" className="text-white font-medium hover:text-white/80 transition-colors">
                Log in / Sign up
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[600px] lg:min-h-[700px] pt-32 pb-16 lg:pt-0 lg:pb-0">
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[0.95] tracking-tight">
                Time tracking that works for your team.
              </h1>
              <p className="text-xl md:text-2xl text-white/90 max-w-lg leading-relaxed">
                Simple clock-ins. GPS verified. Instant reports. Built for small businesses that move fast.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-lg hover:bg-white hover:text-[#22c55e] transition-colors duration-200"
              >
                Get started
              </Link>
            </div>

            <div className="relative flex justify-center lg:justify-end items-end self-end">
              <div className="relative w-full max-w-md lg:max-w-lg">
                {/* Phone mockup placeholder — replace src with real screenshot */}
                <img src="/hero-phone.png" alt="Zummo app" className="w-full h-auto object-contain max-w-sm lg:max-w-md mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-12 lg:mb-16 text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-900 leading-[1] tracking-tight">
              Your hours sorted.
            </h2>
            <p className="mt-4 text-lg md:text-xl text-zinc-500 max-w-xl mx-auto">
              Employees check in and out. You always know what&apos;s going on.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#166534] text-white rounded-2xl p-10 lg:p-12 min-h-[320px] lg:min-h-[400px] flex flex-col justify-end">
              <div className="space-y-3">
                <h3 className="text-3xl lg:text-4xl font-bold leading-[1.1] tracking-tight">GPS verified. No faking it.</h3>
                <p className="text-lg text-white/80">Know exactly where and when your team clocks in.</p>
              </div>
            </div>
            <div className="bg-zinc-100 text-zinc-900 rounded-2xl p-10 lg:p-12 min-h-[320px] lg:min-h-[400px] flex flex-col justify-end">
              <div className="space-y-3">
                <h3 className="text-3xl lg:text-4xl font-bold leading-[1.1] tracking-tight">See who&apos;s in. Right now.</h3>
                <p className="text-lg text-zinc-500">Real-time dashboard shows your entire team at a glance.</p>
              </div>
            </div>
            <div className="bg-zinc-900 text-white rounded-2xl p-10 lg:p-12 min-h-[320px] lg:min-h-[400px] flex flex-col justify-end">
              <div className="space-y-3">
                <h3 className="text-3xl lg:text-4xl font-bold leading-[1.1] tracking-tight">One click. Your accountant is happy.</h3>
                <p className="text-lg text-white/80">Export timesheets instantly in any format you need.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 lg:py-32 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-900 leading-[0.95] tracking-tight">
              Simple pricing
            </h2>
            <p className="mt-4 text-xl text-zinc-500">No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Starter', price: '€14.99', employees: 'Up to 10 employees', popular: false },
              { name: 'Growth', price: '€29.99', employees: 'Up to 25 employees', popular: true },
              { name: 'Business', price: '€49.99', employees: 'Up to 100 employees', popular: false },
              { name: 'Enterprise', price: 'Custom', employees: 'Unlimited employees', popular: false },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  plan.popular
                    ? 'bg-[#22c55e] text-white ring-4 ring-[#22c55e]/20'
                    : 'bg-white text-zinc-900 border border-zinc-200'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                )}
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${plan.popular ? 'text-white' : 'text-zinc-900'}`}>
                    {plan.name}
                  </h3>
                </div>
                <div className="mb-6">
                  <span className={`text-4xl lg:text-5xl font-bold tracking-tight ${plan.popular ? 'text-white' : 'text-zinc-900'}`}>
                    {plan.price}
                  </span>
                  {plan.price !== 'Custom' && (
                    <span className={`text-base ml-1 ${plan.popular ? 'text-white/80' : 'text-zinc-500'}`}>/month</span>
                  )}
                </div>
                <p className={`text-base mb-8 ${plan.popular ? 'text-white/90' : 'text-zinc-500'}`}>
                  {plan.employees}
                </p>
                <Link
href={plan.price === 'Custom' ? 'mailto:contact@zummo.com' : '/login'}                  className={`mt-auto w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-200 text-center ${
                    plan.popular
                      ? 'bg-white text-[#22c55e] hover:bg-white/90'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {plan.price === 'Custom' ? 'Contact us' : 'Get started'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#22c55e] rounded-md flex items-center justify-center">
                <svg width="12" height="15" viewBox="0 0 52 64" fill="none">
                  <rect x="4" y="2" width="44" height="6" rx="3" fill="white"/>
                  <rect x="4" y="56" width="44" height="6" rx="3" fill="white"/>
                  <line x1="8" y1="8" x2="26" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="44" y1="8" x2="26" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="8" y1="56" x2="26" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="44" y1="56" x2="26" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  <polygon points="26,34 9,57 43,57" fill="white" opacity="0.7"/>
                </svg>
              </div>
              <span className="font-bold text-zinc-900">Zummo</span>
            </div>
            <nav className="flex items-center gap-8">
            <a href="/privacy" className="text-zinc-500 hover:text-zinc-900 transition-colors text-sm font-medium">Privacy Policy</a>
            </nav>
            <div className="text-zinc-500 text-sm">© 2026 Zummo</div>
          </div>
        </div>
      </footer>

    </main>
  )
}