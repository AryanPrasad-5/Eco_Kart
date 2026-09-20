import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IndianRupee, Recycle, ListPlus, Leaf } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { StatCard } from '../components/ui/StatCard';
import { ChartCard, AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '../components/ui/ChartCard';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { EmptyState } from '../components/ui/Skeleton';
import { VOLUME_SERIES, MATERIAL_MIX, TRANSACTIONS, PICKUPS } from '../data/listings';
import { formatDateShort, formatInr, formatInrPlain, formatTonnes } from '../lib/format';

const MIX_COLORS = ['#34e27a', '#7fd0e0', '#c9b48a', '#aeb9bd', '#5f7fd0', '#575e5a'] as const;
const mixColor = (i: number) => MIX_COLORS[i] ?? '#575e5a';

export function Dashboard() {
  const upcoming = PICKUPS.filter((p) => p.status !== 'completed');

  return (
    <DashboardLayout
      role="generator"
      title="Overview"
      actions={
        <Button size="sm" onClick={() => (window.location.hash = '#/create-listing')}>
          + New listing
        </Button>
      }
    >
      <p className="mb-6 text-sm text-ink-soft">
        Good morning, <span className="font-medium text-ink">Prestige Falcon City</span> — here's your waste operation this month.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (MTD)" value={612000} format={formatInr} delta={12.4} deltaLabel="vs Aug" icon={<IndianRupee size={15} />} />
        <StatCard label="Waste sold (MTD)" value={20.6} format={(v) => `${v.toFixed(1)} t`} delta={15.2} deltaLabel="vs Aug" icon={<Recycle size={15} />} />
        <StatCard label="Active listings" value={9} format={(v) => `${Math.round(v)}`} delta={2} deltaLabel="open lots" icon={<ListPlus size={15} />} />
        <StatCard label="CO₂ diverted (MTD)" value={14.8} format={(v) => `${v.toFixed(1)} t`} delta={11.0} deltaLabel="vs Aug" icon={<Leaf size={15} />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Waste volume" subtitle="tonnes per month · trailing 12">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VOLUME_SERIES} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashVol" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="volume" stroke={CHART_COLORS.accent} strokeWidth={2} fill="url(#dashVol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Material breakdown" subtitle="% of tonnes sold">
          <div className="h-[240px]">
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Recent transactions" subtitle="last 6 · settlement T+2" action={
          <Button variant="ghost" size="sm" onClick={() => (window.location.hash = '#/transactions')}>
            View all
          </Button>
        }>
          <Table caption="Recent transactions">
            <THead>
              <TR>
                <TH>Tx ID</TH>
                <TH>Buyer</TH>
                <TH>Material</TH>
                <TH>Value</TH>
                <TH>Stage</TH>
              </TR>
            </THead>
            <TBody>
              {TRANSACTIONS.slice(0, 6).map((t) => (
                <TR key={t.id}>
                  <TD>
                    <button className="font-mono text-xs text-accent hover:underline" onClick={() => (window.location.hash = `#/transaction/${t.id}`)}>
                      {t.id}
                    </button>
                  </TD>
                  <TD className="max-w-[140px] truncate">{t.counterparty}</TD>
                  <TD className="capitalize text-ink-soft">{t.material}</TD>
                  <TD className="tabular">{formatInrPlain(t.valueInr)}</TD>
                  <TD>
                    <StatusBadge
                      status={
                        t.stage >= 5 ? 'accepted' : t.stage >= 3 ? 'reserved' : 'pending'
                      }
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ChartCard>

        <ChartCard title="Upcoming pickups" subtitle={`${upcoming.length} scheduled`}>
          {upcoming.length > 0 ? (
            <ul className="divide-y divide-line">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{p.address}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      <span className="tabular">{formatDateShort(p.date)}</span> · {p.slot} · {p.partner}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-semibold text-ink">{formatTonnes(p.quantityTonnes)}</p>
                    <p className="text-[11px] capitalize text-ink-faint">{p.material}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No pickups scheduled"
                body="Accept an offer and the pickup calendar fills itself."
              />
            </div>
          )}
        </ChartCard>
      </div>
    </DashboardLayout>
  );
}
