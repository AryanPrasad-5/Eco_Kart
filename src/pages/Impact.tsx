import { Area, AreaChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS, ChartCard } from '../components/ui/ChartCard';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { DEMAND_INDEX, IMPACT, VOLUME_SERIES } from '../data/listings';
import { formatCompact, formatNumber, formatInrMillions } from '../lib/format';

const DIVERTED_BY_CITY = [
  { city: 'Bengaluru', tonnes: 5_240, co2: 3_440 },
  { city: 'Mumbai', tonnes: 2_860, co2: 1_880 },
  { city: 'Delhi NCR', tonnes: 2_180, co2: 1_430 },
  { city: 'Pune', tonnes: 1_410, co2: 925 },
  { city: 'Chennai', tonnes: 1_150, co2: 745 },
];

const RECOVERY = [{ name: 'recovery', value: IMPACT.recoveryRate, fill: CHART_COLORS.accent }];

export function ImpactPage() {
  return (
    <DashboardLayout
      role="generator"
      title="Impact"
      actions={
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => window.print()}>
          Export report
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Waste diverted" value={IMPACT.wasteDivertedTonnes} format={(v) => `${formatNumber(Math.round(v))} t`} delta={9.6} deltaLabel="YoY" />
        <StatCard label="CO₂e avoided" value={IMPACT.co2AvoidedTonnes} format={(v) => `${formatNumber(Math.round(v))} t`} delta={10.4} deltaLabel="YoY" />
        <StatCard label="Economic value created" value={IMPACT.economicValueInr} format={(v) => formatInrMillions(Math.round(v))} delta={14.2} deltaLabel="YoY" />
        <StatCard label="Material recovery rate" value={IMPACT.recoveryRate} format={(v) => `${Math.round(v)}%`} delta={1.8} deltaLabel="YoY" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Tonnes diverted per month" subtitle="platform-wide · trailing 12">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VOLUME_SERIES.map((p) => ({ month: p.month, tonnes: p.volume * 46 }))} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="impDiv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" {...AXIS_PROPS} interval={1} />
                <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => `${formatCompact(v)}t`} />
                {GRID_PROPS.vertical && null}
                <Tooltip
                  cursor={{ stroke: CHART_COLORS.line }}
                  contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${formatCompact(Number(v))} t`, 'Diverted']}
                />
                <Area type="monotone" dataKey="tonnes" stroke={CHART_COLORS.accent} strokeWidth={2} fill="url(#impDiv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card>
          <CardHeader title="Recovery rate" subtitle="collected vs recovered, by weight slip" />
          <div className="relative mx-auto h-[220px] w-full max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={RECOVERY} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: CHART_COLORS.line }} dataKey="value" cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className="tabular font-display text-3xl font-bold text-ink">{IMPACT.recoveryRate}%</p>
            </div>
          </div>
          <p className="px-5 pb-5 text-center text-xs text-ink-soft">
            Counted across completed trades — not modelled, not estimated.
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Diversion by city" subtitle="tonnes and CO₂e avoided, trailing 12 months" />
        <Table caption="Diversion by city">
          <THead>
            <TR>
              <TH>City</TH>
              <TH>Tonnes diverted</TH>
              <TH>CO₂e avoided</TH>
              <TH>Share</TH>
            </TR>
          </THead>
          <TBody>
            {DIVERTED_BY_CITY.map((row) => (
              <TR key={row.city}>
                <TD className="font-medium">{row.city}</TD>
                <TD className="tabular">{row.tonnes.toLocaleString('en-IN')} t</TD>
                <TD className="tabular">{row.co2.toLocaleString('en-IN')} t</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(row.tonnes / 5240) * 100}%` }} />
                    </div>
                    <span className="tabular text-xs text-ink-soft">{Math.round((row.tonnes / IMPACT.wasteDivertedTonnes) * 100)}%</span>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <p className="mt-6 text-center text-xs text-ink-faint">
        Methodology: CO₂e factors per material from CPCB guidelines · demand index currently led by{' '}
        <span className="capitalize text-ink-soft">{DEMAND_INDEX[0]!.material}</span>
      </p>
    </DashboardLayout>
  );
}
