import { useRef } from 'react';
import { ClipboardList, Radar, Handshake, Truck } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    title: 'LIST',
    body: 'Businesses list recyclable materials with quantity, quality, photos, and pickup availability.',
    icon: ClipboardList,
  },
  {
    n: '02',
    title: 'DISCOVER',
    body: 'Verified recyclers discover available materials through the marketplace.',
    icon: Radar,
  },
  {
    n: '03',
    title: 'TRADE',
    body: 'Recyclers submit offers and generators select the preferred offer.',
    icon: Handshake,
  },
  {
    n: '04',
    title: 'PICKUP',
    body: 'Pickup is scheduled and the transaction is completed digitally.',
    icon: Truck,
  },
] as const;

/**
 * The four-step flow — this content genuinely is a sequence, so numbered
 * markers are information, not decoration. The connecting line draws itself
 * in when the section enters the viewport.
 */
export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="hiw-heading">
      <div className="mx-auto max-w-6xl px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">How it works</p>
        <h2 id="hiw-heading" className="mt-3 max-w-xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          From byproduct to balance sheet in four steps
        </h2>

        <div ref={ref} className="relative mt-12">
          {/* animated connector — desktop only, draws itself in */}
          <div
            className="absolute left-0 right-0 top-[26px] hidden h-px origin-left bg-gradient-to-r from-accent-line via-line-strong to-line motion-safe:animate-[grow_1.2s_ease-out_forwards]"
            aria-hidden
          />
          <style>{`@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>

          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((step, i) => (
              <li key={step.n} className="relative">
                <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                  <span
                    className="relative z-10 grid h-[52px] w-[52px] shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink shadow-[0_0_0_6px_var(--color-void)]"
                    aria-hidden
                  >
                    <step.icon size={20} strokeWidth={1.6} />
                  </span>
                  <p className="font-mono text-[11px] tracking-[0.2em] text-accent lg:mt-5">{step.n}</p>
                </div>
                <h3 className="mt-3 font-display text-[17px] font-semibold tracking-wide text-ink">{step.title}</h3>
                <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-ink-soft">{step.body}</p>
                <span
                  className="mt-4 block h-px w-8 bg-accent/50 motion-safe:animate-[grow_0.6s_ease-out_both]"
                  style={{ animationDelay: `${0.3 + i * 0.25}s` }}
                  aria-hidden
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
