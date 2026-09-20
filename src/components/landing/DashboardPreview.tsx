import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { VOLUME_SERIES, MATERIAL_MIX } from '../../data/listings';
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '../ui/ChartCard';
import { formatInr, formatTonnes } from '../../lib/format';

const MIX_COLORS = ['#34e27a', '#7fd0e0', '#c9b48a', '#aeb9bd', '#5f7fd0', '#575e5a'] as const;
const mixColor = (i: number) => MIX_COLORS[i] ?? '#575e5a';

const KPI = [
  { label: 'Total revenue', value: '₹6.12L', delta: '+12.4%', sub: 'this month' },
  { label: 'Waste listed', value: '23.4 t', delta: '+8.9%', sub: 'this month' },
  { label: 'Waste sold', value: '20.6 t', delta: '+15.2%', sub: 'this month' },
  { label: 'CO₂ diverted', value: '14.8 t', delta: '+11.0%', sub: 'this month' },
];

/**
 * "What it looks like after login" — a real rendered mini-dashboard,
 * not a screenshot: live Recharts instances at dashboard scale.
 */
export function DashboardPreview() {
  return (
    <section id="dashboard-preview" className="scroll-mt-20 border-y border-line bg-surface/40 py-20 sm:py-24" aria-labelledby="dp-heading">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">The dashboard</p>
          <h2 id="dp-heading" className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Every tonne, tracked like capital
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            Volumes, revenue, recovery rates, and CO₂ — one operating picture for your waste streams.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {/* fake app chrome */}
          <div className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-surface-3" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-surface-3" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-surface-3" aria-hidden />
            <span className="ml-3 font-mono text-[11px] text-ink-faint">smartsort.app/dashboard</span>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.6fr_1fr]">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
              {KPI.map((k) => (
                <div key={k.label} className="rounded-lg border border-line bg-surface-2/40 p-3.5">
                  <p className="text-xs text-ink-soft">{k.label}</p>
                  <p className="tabular mt-1 font-display text-xl font-semibold text-ink">{k.value}</p>
                  <p className="mt-0.5 text-[11px]">
                    <span className="text-up">{k.delta}</span> <span className="text-ink-faint">{k.sub}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* volume chart */}
            <div className="rounded-lg border border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">Waste volume</p>
                <p className="font-mono text-[10.5px] text-ink-faint">tonnes / month</p>
              </div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={VOLUME_SERIES} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dpVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" {...AXIS_PROPS} interval={2} />
                    <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => `${v}t`} width={44} />
                    {GRID_PROPS.vertical && null}
                    <Tooltip
                      cursor={{ stroke: CHART_COLORS.line }}
                      contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`${formatTonnes(Number(v))}`, 'Volume']}
                    />
                    <Area type="monotone" dataKey="volume" stroke={CHART_COLORS.accent} strokeWidth={2} fill="url(#dpVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* material mix */}
            <div className="rounded-lg border border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">Material mix</p>
                <p className="font-mono text-[10.5px] text-ink-faint">% of tonnes</p>
              </div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MATERIAL_MIX} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                    <XAxis type="number" hide domain={[0, 40]} />
                    <YAxis
                      type="category"
                      dataKey="material"
                      width={72}
                      {...AXIS_PROPS}
                      tick={{ fill: '#9aa39d', fontSize: 10.5 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#ffffff06' }}
                      contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`${v}%`, 'Share']}
                    />
                    <Bar dataKey="share" radius={[0, 4, 4, 0]} barSize={13}>
                      {MATERIAL_MIX.map((_, i) => (
                        <Cell key={i} fill={mixColor(i)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* footer strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2/40 px-4 py-3 lg:col-span-2">
              <p className="text-xs text-ink-soft">
                Revenue <span className="tabular font-semibold text-ink">{formatInr(612_000)}</span> in September — best month so far
              </p>
              <p className="font-mono text-[10.5px] text-ink-faint">recovery rate 94% · settlement T+2</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
