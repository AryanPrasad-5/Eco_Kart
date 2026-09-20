import { useState } from 'react';
import { MATERIALS, MATERIAL_SPECS, type Material } from '../../types';
import { formatPricePerKg } from '../../lib/format';

/**
 * Material categories — hover/select a material to inspect its market spec.
 * Data viz instead of icons: each row carries its own 7-point price sparkline.
 */
export function MaterialsExplorer() {
  const [active, setActive] = useState<Material>('plastic');
  const spec = MATERIAL_SPECS[active];

  return (
    <section id="materials" className="scroll-mt-20 border-y border-line bg-surface/40 py-20 sm:py-24" aria-labelledby="materials-heading">
      <div className="mx-auto max-w-6xl px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">Material categories</p>
        <h2 id="materials-heading" className="mt-3 max-w-xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Six materials. One transparent price surface.
        </h2>

        <div className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* selector list */}
          <ul className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Materials">
            {MATERIALS.map((m) => {
              const s = MATERIAL_SPECS[m];
              const selected = m === active;
              return (
                <li key={m} className="shrink-0 lg:shrink">
                  <button
                    onMouseEnter={() => setActive(m)}
                    onFocus={() => setActive(m)}
                    onClick={() => setActive(m)}
                    aria-pressed={selected}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors duration-150 ${
                      selected ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface hover:border-line-strong'
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`text-sm font-semibold capitalize ${selected ? 'text-ink' : 'text-ink-soft'}`}>{m}</span>
                      <span className={`tabular font-mono text-xs ${selected ? 'text-accent' : 'text-ink-faint'}`}>
                        {formatPricePerKg(s.avgPrice)}
                      </span>
                    </span>
                    <span className="mt-2 flex items-end gap-[3px]" aria-hidden>
                      {s.priceHistory.map((p, i) => {
                        const min = Math.min(...s.priceHistory);
                        const max = Math.max(...s.priceHistory);
                        const h = 5 + ((p - min) / Math.max(1, max - min)) * 16;
                        return (
                          <span
                            key={i}
                            className={`w-[6px] rounded-[1px] ${i === s.priceHistory.length - 1 ? (selected ? 'bg-accent' : 'bg-ink-faint') : selected ? 'bg-accent/40' : 'bg-surface-3'}`}
                            style={{ height: `${h}px` }}
                          />
                        );
                      })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* spec panel */}
          <div className="rounded-lg border border-line bg-surface" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <h3 className="font-display text-xl font-semibold capitalize text-ink">{active}</h3>
                <p className="mt-1 text-sm text-ink-soft">Market specification · Bengaluru zone</p>
              </div>
              <p className="tabular font-display text-2xl font-semibold text-accent">{formatPricePerKg(spec.avgPrice)}</p>
            </div>

            <dl className="grid gap-x-8 gap-y-5 px-6 py-6 sm:grid-cols-2">
              <div>
                <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">Typical quantity</dt>
                <dd className="tabular mt-1 text-[15px] font-medium text-ink">{spec.typicalQty}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">Demand</dt>
                <dd className="mt-1 flex items-center gap-2 text-[15px] font-medium text-ink">
                  {spec.demand}
                  <span className="flex gap-[3px]" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-4 rounded-full ${
                          i < (spec.demand === 'High' ? 3 : spec.demand === 'Moderate' ? 2 : 1) ? 'bg-accent' : 'bg-surface-3'
                        }`}
                      />
                    ))}
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
                  Recyclability
                  <span className="tabular text-ink">{spec.recyclability}%</span>
                </dt>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`Recyclability ${spec.recyclability} percent`}>
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                    style={{ width: `${spec.recyclability}%` }}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">Example use cases</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {spec.useCases.map((u) => (
                    <span key={u} className="rounded-md border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink-soft">
                      {u}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
