import { MARKET_STATS } from '../../data/listings';
import { useCountUp } from '../../hooks/useCountUp';
import { formatInrMillions, formatCompact, formatNumber } from '../../lib/format';

const STATS = [
  { label: 'Material traded', value: MARKET_STATS.materialTradedInr, format: (v: number) => `${formatInrMillions(v)}+` },
  { label: 'Tonnes diverted', value: MARKET_STATS.tonnesDiverted, format: (v: number) => `${formatCompact(v)}+` },
  { label: 'Businesses', value: MARKET_STATS.businesses, format: (v: number) => `${formatNumber(v)}+` },
  { label: 'Cities', value: MARKET_STATS.cities, format: (v: number) => `${Math.round(v)}` },
];

export function Stats() {
  return (
    <section className="border-y border-line bg-surface/40 py-14" aria-label="Platform statistics">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 lg:grid-cols-4">
        {STATS.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </dl>
    </section>
  );
}

function Stat({ label, value, format }: { label: string; value: number; format: (v: number) => string }) {
  const { ref, value: animated } = useCountUp(value);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center lg:text-left">
      <dd className="tabular font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-none tracking-tight text-ink">
        {format(animated)}
      </dd>
      <dt className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{label}</dt>
    </div>
  );
}
