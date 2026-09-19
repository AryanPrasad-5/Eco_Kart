import { Area, AreaChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IMPACT } from '../../data/listings';
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '../ui/ChartCard';
import { useCountUp } from '../../hooks/useCountUp';
import { formatInrMillions, formatNumber, formatCompact } from '../../lib/format';

const RECOVERY = [{ name: 'recovery', value: IMPACT.recoveryRate, fill: CHART_COLORS.accent }];

const DIVERTED_SERIES = [
  { month: 'Apr', tonnes: 620 },
  { month: 'May', tonnes: 710 },
  { month: 'Jun', tonnes: 780 },
  { month: 'Jul', tonnes: 745 },
  { month: 'Aug', tonnes: 860 },
  { month: 'Sep', tonnes: 940 },
];

function ImpactNumber({ value, format, label }: { value: number; format: (v: number) => string; label: string }) {
  const { ref, value: animated } = useCountUp(value);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <p className="tabular font-display text-[clamp(1.9rem,4vw,2.9rem)] font-bold leading-none tracking-tight text-ink">
        {format(animated)}
      </p>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{label}</p>
    </div>
  );
}

/** Impact as a business metric — quantified, charted, no leaf in sight. */
export function Impact() {
  return (
    <section id="impact" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="impact-heading">
      <div className="mx-auto max-w-6xl px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">Impact</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 id="impact-heading" className="max-w-xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Environmental impact can be measured like a business metric
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            Every transaction on SmartSort settles with a weight slip, so the tonnage below is counted, not estimated.
          </p>
        </div>

        <div className="mt-10 grid gap-3 lg:grid-cols-4">
          <div className="grid content-center gap-8 rounded-lg border border-line bg-surface p-6">
            <ImpactNumber value={IMPACT.wasteDivertedTonnes} format={(v) => `${formatNumber(Math.round(v))} t`} label="Waste diverted" />
            <ImpactNumber value={IMPACT.co2AvoidedTonnes} format={(v) => `${formatNumber(Math.round(v))} t`} label="CO₂ equivalent avoided" />
            <ImpactNumber value={IMPACT.economicValueInr} format={(v) => formatInrMillions(Math.round(v))} label="Economic value created" />
          </div>

          <div className="rounded-lg border border-line bg-surface p-5 lg:col-span-2">
            <p className="text-[13px] font-semibold text-ink">Tonnes diverted per month</p>
            <p className="mt-0.5 font-mono text-[10.5px] text-ink-faint">platform-wide · trailing 6 months</p>
            <div className="mt-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DIVERTED_SERIES} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} width={40} tickFormatter={(v: number) => `${v}t`} />
                  {GRID_PROPS.vertical && null}
                  <Tooltip
                    cursor={{ stroke: CHART_COLORS.line }}
                    contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${formatCompact(Number(v))} t`, 'Diverted']}
                  />
                  <Area type="monotone" dataKey="tonnes" stroke={CHART_COLORS.accent} strokeWidth={2} fill="url(#impGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-line bg-surface p-5">
            <p className="text-[13px] font-semibold text-ink">Material recovery rate</p>
            <p className="mt-0.5 font-mono text-[10.5px] text-ink-faint">collected vs recovered</p>
            <div className="relative mx-auto mt-2 h-[190px] w-full max-w-[220px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="72%" outerRadius="100%" data={RECOVERY} startAngle={90} endAngle={-270}>
                  <RadialBar background={{ fill: CHART_COLORS.line }} dataKey="value" cornerRadius={12} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <RecoveryCounter />
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-ink-soft">
              Measured across completed trades, by weight slip
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecoveryCounter() {
  const { ref, value } = useCountUp(IMPACT.recoveryRate);
  return (
    <p ref={ref as React.RefObject<HTMLParagraphElement>} className="tabular font-display text-3xl font-bold text-ink">
      {Math.round(value)}%
    </p>
  );
}
