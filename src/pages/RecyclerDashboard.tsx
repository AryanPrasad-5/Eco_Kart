import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Gavel, PackageOpen, Wallet, CalendarClock, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { StatCard } from '../components/ui/StatCard';
import { ChartCard, AXIS_PROPS, CHART_COLORS } from '../components/ui/ChartCard';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MarketplaceCard } from '../components/MarketplaceCard';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { EmptyState } from '../components/ui/Skeleton';
import { DEMAND_INDEX, LISTINGS, OFFERS, PICKUPS } from '../data/listings';
import { formatDateShort, formatInr, formatPricePerKg, formatTonnes } from '../lib/format';

const DEMAND_COLORS = ['#34e27a', '#34e27a', '#57b06a', '#57b06a', '#575e5a', '#575e5a'] as const;
const demandColor = (i: number) => DEMAND_COLORS[i] ?? '#575e5a';

export function RecyclerDashboard() {
  const available = LISTINGS.filter((l) => l.status === 'available').slice(0, 4);
  const myBids = OFFERS.filter((o) => o.status === 'pending');
  const schedule = PICKUPS.filter((p) => p.status !== 'completed');

  return (
    <DashboardLayout role="recycler" title="Recycler console">
      <p className="mb-6 text-sm text-ink-soft">
        Good morning, <span className="font-medium text-ink">PETVerse Plastics</span> — 4 lots match your buy boxes today.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly spend" value={412_000} format={formatInr} delta={-6.8} deltaLabel="vs Aug" icon={<Wallet size={15} />} />
        <StatCard label="Active bids" value={myBids.length} format={(v) => `${Math.round(v)}`} delta={2} deltaLabel="awaiting reply" icon={<Gavel size={15} />} />
        <StatCard label="Purchased (MTD)" value={18.4} format={(v) => `${v.toFixed(1)} t`} delta={9.1} deltaLabel="vs Aug" icon={<PackageOpen size={15} />} />
        <StatCard label="Pickups this week" value={3} format={(v) => `${Math.round(v)}`} icon={<CalendarClock size={15} />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Material demand index" subtitle="what buyers are hunting, 0–100">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEMAND_INDEX} layout="vertical" margin={{ top: 0, right: 12, left: 10, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="material" width={76} {...AXIS_PROPS} tick={{ fill: '#9aa39d', fontSize: 10.5 }} />
                <Tooltip
                  cursor={{ fill: '#ffffff06' }}
                  contentStyle={{ background: CHART_COLORS.surface2, border: `1px solid ${CHART_COLORS.line}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}/100`, 'Demand']}
                />
                <Bar dataKey="index" radius={[0, 4, 4, 0]} barSize={14}>
                  {DEMAND_INDEX.map((_, i) => (
                    <Cell key={i} fill={demandColor(i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Your active bids" subtitle="pending offers on open lots">
          {myBids.length > 0 ? (
            <Table caption="Active bids">
              <THead>
                <TR>
                  <TH>Lot</TH>
                  <TH>Your bid</TH>
                  <TH>Qty</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {myBids.map((o) => {
                  const listing = LISTINGS.find((l) => l.id === o.listingId);
                  return (
                    <TR key={o.id}>
                      <TD>
                        <button className="text-left" onClick={() => (window.location.hash = `#/listing/${o.listingId}`)}>
                          <span className="block font-medium text-ink hover:text-accent">{listing?.subtype ?? o.listingId}</span>
                          <span className="font-mono text-[10.5px] text-ink-faint">{o.listingId}</span>
                        </button>
                      </TD>
                      <TD className="tabular font-medium text-accent">{formatPricePerKg(o.pricePerKg)}</TD>
                      <TD className="tabular">{formatTonnes(o.quantityTonnes)}</TD>
                      <TD><StatusBadge status={o.status} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <div className="p-4">
              <EmptyState
                icon={<Gavel size={18} />}
                title="No open bids"
                body="Place an offer on any available lot — sellers on SmartSort reply in hours, not days."
                action={
                  <Button size="sm" onClick={() => (window.location.hash = '#/marketplace')}>
                    Browse marketplace
                  </Button>
                }
              />
            </div>
          )}
        </ChartCard>
      </div>

      <div className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <TrendingUp size={16} className="text-accent" aria-hidden />
            Lots matching your buy box
          </h2>
          <Button variant="ghost" size="sm" onClick={() => (window.location.hash = '#/marketplace')}>
            See all
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {available.map((l) => (
            <MarketplaceCard key={l.id} listing={l} />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <ChartCard title="Pickup schedule" subtitle="yours and your partners' slots">
          <ul className="divide-y divide-line">
            {schedule.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{p.address}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    <span className="tabular">{formatDateShort(p.date)}</span> · {p.slot} · {p.partner} ·{' '}
                    <span className="font-mono text-accent">{p.transactionId}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="mono">{formatTonnes(p.quantityTonnes)}</Badge>
                  <StatusBadge status={p.status === 'in-progress' ? 'reserved' : 'available'} />
                </div>
              </li>
            ))}
            {schedule.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink-faint">Nothing scheduled — win a bid and slots appear here.</li>
            )}
          </ul>
        </ChartCard>
      </div>
    </DashboardLayout>
  );
}
