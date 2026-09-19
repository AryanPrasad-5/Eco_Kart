import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../Navbar';

export function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-line py-24 sm:py-28" aria-labelledby="cta-heading">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="absolute inset-x-0 bottom-[-180px] mx-auto h-[360px] w-[720px] rounded-full bg-accent-soft blur-[130px]" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <h2 id="cta-heading" className="font-display text-[clamp(2.2rem,5.5vw,3.6rem)] font-bold leading-[1.05] tracking-[-0.02em]">
          <span className="text-shine">Give your waste a market.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[54ch] text-[16px] leading-relaxed text-ink-soft">
          List your materials, discover verified buyers, and turn waste streams into measurable value.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button size="lg" icon={<ArrowRight size={16} />} onClick={() => (window.location.hash = '#/create-listing')}>
            Start Trading
          </Button>
          <Button size="lg" variant="outline" onClick={() => (window.location.hash = '#/marketplace')}>
            Explore Marketplace
          </Button>
        </div>
      </div>
    </section>
  );
}

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Marketplace', hash: '#/marketplace' },
      { label: 'Create listing', hash: '#/create-listing' },
      { label: 'Dashboard', hash: '#/dashboard' },
      { label: 'Recycler console', hash: '#/recycler' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Impact', hash: '#/impact' },
      { label: 'How it works', hash: '#/' },
      { label: 'For businesses', hash: '#/' },
      { label: 'Analytics', hash: '#/analytics' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Price index', hash: '#/marketplace' },
      { label: 'Transactions', hash: '#/transactions' },
      { label: 'Listing LX-1041', hash: '#/listing/LX-1041' },
      { label: 'Material specs', hash: '#/' },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-ink-soft">
            The financial infrastructure for the circular economy. Waste in, priced, traded, settled.
          </p>
          <p className="mt-6 font-mono text-[11px] text-ink-faint">Bengaluru · Mumbai · Delhi NCR · Pune · Chennai</p>
        </div>
        {FOOTER_COLS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.hash}
                    className="text-sm text-ink-soft transition-colors hover:text-ink"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.hash = l.hash;
                      window.scrollTo({ top: 0 });
                    }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-5">
          <p className="font-mono text-[11px] text-ink-faint">© 2026 SmartSort Technologies Pvt Ltd</p>
          <p className="font-mono text-[11px] text-ink-faint">Prices are indicative market estimates, not offers.</p>
        </div>
      </div>
    </footer>
  );
}
