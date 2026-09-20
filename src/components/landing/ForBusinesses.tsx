import { ShieldCheck, FileCheck2, Scale, CalendarClock, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

const POINTS = [
  {
    icon: ShieldCheck,
    title: 'Verified counterparties',
    body: 'Every recycler passes KYC, consent-to-operate, and site checks before their first bid. Compliance paperwork is attached to the profile, not buried in email.',
  },
  {
    icon: Scale,
    title: 'Transparent pricing',
    body: 'Live index pricing by material and grade. Offers are itemised — price, quantity, pickup terms — so comparison takes seconds, not calls.',
  },
  {
    icon: FileCheck2,
    title: 'Audit-ready records',
    body: 'Weight slips, EPR documentation, and settlement records stored per transaction. Export the quarter when the auditor asks.',
  },
  {
    icon: CalendarClock,
    title: 'Scheduled pickup',
    body: 'Slot-based logistics with the recycler\'s own fleet or partner transport. Reschedule without a phone tree.',
  },
] as const;

export function ForBusinesses() {
  return (
    <section id="for-businesses" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="biz-heading">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">For businesses</p>
          <h2 id="biz-heading" className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for facilities, parks, and campuses that move tonnes
          </h2>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-soft">
            SmartSort is infrastructure, not a directory. The compliance, pricing, and logistics layers that
            make waste tradable at scale are part of the product — with the controls your finance team expects.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => (window.location.hash = '#/create-listing')} icon={<ArrowRight size={15} />}>
              List your first load
            </Button>
            <Button variant="outline" onClick={() => (window.location.hash = '#/dashboard')}>
              See the dashboard
            </Button>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {POINTS.map((p) => (
            <li key={p.title} className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong">
              <p.icon size={19} strokeWidth={1.6} className="text-accent" aria-hidden />
              <h3 className="mt-3 text-[15px] font-semibold text-ink">{p.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
