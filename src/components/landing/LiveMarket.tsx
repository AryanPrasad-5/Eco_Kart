import { ArrowUpRight } from 'lucide-react';
import { LISTINGS } from '../../data/listings';
import { formatDateShort, formatPricePerKg, formatQuantity } from '../../lib/format';
import { GradeBadge } from '../ui/Badge';

/** 8 of the 12 listings, ranked by freshness — the "market depth" panel. */
const FEATURED = [...LISTINGS].sort((a, b) => b.listedAt.localeCompare(a.listedAt)).slice(0, 8);

const TICKER_ROWS = FEATURED.map((l) => ({
  id: l.id,
  label: `${l.material} ${formatPricePerKg(l.pricePerKg)}`,
  delta: `${((l.pricePerKg % 7) - 2.4).toFixed(1)}%`,
  up: l.pricePerKg % 7 > 2.4,
}));

function TickerStrip() {
  const row = (
    <div className="flex shrink-0 items-center">
      {TICKER_ROWS.map((t) => (
        <span key={t.id} className="tabular mx-6 inline-flex items-center gap-2 font-mono text-[11.5px] text-ink-soft">
          <span className="uppercase">{t.label}</span>
          <span className={t.up ? 'text-up' : 'text-down'}>{t.up ? '▲' : '▼'} {t.delta}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative overflow-hidden border-y border-line bg-surface/60" aria-hidden>
      <div className="animate-ticker flex w-max">
        {row}
        {row}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-void to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-void to-transparent" />
    </div>
  );
}

export function LiveMarket() {
  return (
    <section className="relative py-16 sm:py-20" aria-labelledby="live-market-heading">
      <TickerStrip />
      <div className="mx-auto mt-12 max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              Live marketplace
            </p>
            <h2 id="live-market-heading" className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              On the exchange right now
            </h2>
          </div>
          <button
            onClick={() => (window.location.hash = '#/marketplace')}
            className="group flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-accent"
          >
            Open full market depth
            <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED.map((l, i) => (
            <button
              key={l.id}
              onClick={() => (window.location.hash = `#/listing/${l.id}`)}
              className="group relative overflow-hidden rounded-lg border border-line bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-line hover:bg-surface-2"
              style={{ transitionDelay: `${i * 12}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">{l.material}</p>
                <GradeBadge grade={l.quality} />
              </div>
              <p className="tabular mt-3 font-display text-[26px] font-semibold leading-none text-ink">
                {formatQuantity(l.quantityTonnes)}
              </p>
              <p className="tabular mt-1.5 text-sm font-medium text-accent">{formatPricePerKg(l.pricePerKg)}</p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[11.5px] text-ink-faint">
                <span className="truncate">{l.locality}</span>
                <span className="tabular shrink-0 pl-2">from {formatDateShort(l.pickupFrom)}</span>
              </div>
              <span
                className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
