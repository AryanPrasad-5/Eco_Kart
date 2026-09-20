import { Area, AreaChart, Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ChartCard, AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '../components/ui/ChartCard';
import { Button } from '../components/ui/Button';
import { VOLUME_SERIES, MATERIAL_MIX, IMPACT } from '../data/listings';
import { formatInr, formatTonnes } from '../lib/format';

const MIX_COLORS = ['#34e27a', '#7fd0e0', '#c9b48a', '#aeb9bd', '#5f7fd0', '#575e5a'] as const;
const mixColor = (i: number) => MIX_COLORS[i] ?? '#575e5a';

const RECOVERY_TREND = VOLUME_SERIES.map((p, i) => ({
  month: p.month,
  rate: 88 + ((i * 7) % 9),
}));

export function Analytics() {
  return (
    <DashboardLayout
      role="generator"
      title="Analytics"
      actions={
        <Button variant="secondary" size="sm" onClick={() => (window.location.hash = '#/impact')}>
          Impact report
        </Button>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Waste volume" subtitle="tonnes per month · trailing 12">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={VOLUME_SERIES} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" {...AXIS_PROPS} interval={1} />
                  <YAxis {...AXIS_PROPS} width={40} tickFormatter={(v: number) => `${v}t`} />
                  {GRID_PROPS.vertical && null}
                  <Tooltip
                    cursor={{ stroke: CHART_COLORS.line }}
                    contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [formatTonnes(Number(v)), 'Volume']}
                  />
                  <Area type="monotone" dataKey="volume" stroke={CHART_COLORS.accent} strokeWidth={2} fill="url(#anVol)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Revenue" subtitle="₹ per month · trailing 12">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={VOLUME_SERIES} margin={{ top: 4, right: 4, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7fd0e0" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#7fd0e0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" {...AXIS_PROPS} interval={1} />
                  <YAxis {...AXIS_PROPS} width={52} tickFormatter={(v: number) => formatInr(v)} />
                  {GRID_PROPS.vertical && null}
                  <Tooltip
                    cursor={{ stroke: CHART_COLORS.line }}
                    contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [formatInr(Number(v)), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#7fd0e0" strokeWidth={2} fill="url(#anRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Material breakdown" subtitle="share of tonnes sold">
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={MATERIAL_MIX} dataKey="share" nameKey="material" innerRadius={52} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                    {MATERIAL_MIX.map((_, i) => (
                      <Cell key={i} fill={mixColor(i)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [`${v}%`, String(name)]}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: '#9aa39d', fontSize: 11, textTransform: 'capitalize' }}>{value}</span>}
                    iconType="circle"
                    iconSize={7}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Recycling rate" subtitle="recovery %, trailing 12">
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={RECOVERY_TREND} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  <XAxis dataKey="month" {...AXIS_PROPS} interval={2} />
                  <YAxis {...AXIS_PROPS} width={38} domain={[80, 100]} tickFormatter={(v: number) => `${v}%`} />
                  {GRID_PROPS.vertical && null}
                  <Tooltip
                    cursor={{ stroke: CHART_COLORS.line }}
                    contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v}%`, 'Recovery']}
                  />
                  <Line type="monotone" dataKey="rate" stroke={CHART_COLORS.accent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Material mix" subtitle="tonnes by material, trailing 12">
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MATERIAL_MIX} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 40]} />
                  <YAxis type="category" dataKey="material" width={74} {...AXIS_PROPS} tick={{ fill: '#9aa39d', fontSize: 10.5 }} />
                  <Tooltip
                    cursor={{ fill: '#ffffff06' }}
                    contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v}%`, 'Share']}
                  />
                  <Bar dataKey="share" radius={[0, 4, 4, 0]} barSize={14}>
                    {MATERIAL_MIX.map((_, i) => (
                      <Cell key={i} fill={mixColor(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <p className="text-center font-mono text-[11px] text-ink-faint">
          Platform recovery rate {IMPACT.recoveryRate}% · figures reconcile with transaction weight slips
        </p>
      </div>
    </DashboardLayout>
  );
}
