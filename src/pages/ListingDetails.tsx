import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ShieldCheck, MapPin, CalendarClock, FileText, PackageX } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Timeline } from '../components/ui/Timeline';
import { GradeBadge, StatusBadge } from '../components/ui/Badge';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { MapView } from '../components/MapView';
import { useToast } from '../hooks/useToast';
import { getApi } from '../api/client';
import { LISTINGS, OFFERS, TRANSACTIONS } from '../data/listings';
import { estimateValue, formatDate, formatInrPlain, formatPricePerKg, formatTonnes } from '../lib/format';
import { MATERIAL_TO_CATEGORY } from '../lib/materialCategory';
import { MATERIAL_SPECS, type FacilityMatch, type Listing } from '../types';

/**
 * Nearby verified recyclers for this lot's material, from the existing
 * match API — distance and ranking are computed backend-side and are
 * visualized here, never recalculated. Fetch is skipped when the lot
 * coordinates are invalid.
 */
function useNearbyMatches(listing: Listing): FacilityMatch[] {
  const [matches, setMatches] = useState<FacilityMatch[]>([]);
  useEffect(() => {
    if (!Number.isFinite(listing.lat) || !Number.isFinite(listing.lng)) return;
    let cancelled = false;
    getApi()
      .matchFacilities(MATERIAL_TO_CATEGORY[listing.material], { lat: listing.lat, lng: listing.lng })
      .then((res) => {
        if (!cancelled) setMatches(res.matches);
      })
      .catch(() => {
        // Map is visualization-only; the listing page works without it.
        if (!cancelled) setMatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [listing.id, listing.material, listing.lat, listing.lng]);
  return matches;
}

/** A tiny deterministic lot visual — bale/ingot pattern per material. */
function MaterialVisual({ listing }: { listing: Listing }) {
  const spec = MATERIAL_SPECS[listing.material];
  const bars = useMemo(
    () => Array.from({ length: 48 }, (_, i) => ((i * 2654435761) % 97) / 97),
    [listing.id],
  );
  return (
    <div
      className="relative h-56 overflow-hidden rounded-lg border border-line bg-[#0b0d0c] sm:h-72"
      role="img"
      aria-label={`${listing.material} lot illustration`}
    >
      <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
      <div className="absolute inset-0 flex items-end justify-center gap-1 p-8" aria-hidden>
        {bars.map((v, i) => (
          <span
            key={i}
            className="w-full max-w-[10px] rounded-t-[2px]"
            style={{
              height: `${18 + v * 62}%`,
              background: `linear-gradient(to top, ${i % 3 === 0 ? '#34e27a33' : '#1d2320'}, #232a26)`,
              opacity: 0.55 + v * 0.45,
            }}
          />
        ))}
      </div>
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="rounded-md border border-line bg-void/70 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ink backdrop-blur">
          {listing.material} · {listing.subtype}
        </span>
      </div>
      <div className="absolute bottom-4 right-4 rounded-md border border-accent-line bg-accent-soft px-2.5 py-1 font-mono text-[11px] text-accent backdrop-blur">
        index ref {formatPricePerKg(spec.avgPrice)}
      </div>
    </div>
  );
}

export function ListingDetails({ id }: { id: string }) {
  const listing = LISTINGS.find((l) => l.id === id);
  const { toast } = useToast();
  const [offerOpen, setOfferOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [errors, setErrors] = useState<{ price?: string; qty?: string }>({});
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  if (!listing) {
    return (
      <DashboardLayout role="generator" title="Listing">
        <div className="rounded-lg border border-dashed border-line px-6 py-20 text-center">
          <PackageX size={22} className="mx-auto text-ink-faint" aria-hidden />
          <h2 className="mt-3 font-display text-lg font-semibold text-ink">Listing {id} doesn't exist</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            It may have been traded or withdrawn. The marketplace shows everything currently open.
          </p>
          <Button variant="secondary" className="mt-6" onClick={() => (window.location.hash = '#/marketplace')}>
            Back to marketplace
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const estValue = estimateValue(listing.pricePerKg, listing.quantityTonnes);
  const offers = OFFERS.filter((o) => o.listingId === listing.id);
  const history = TRANSACTIONS.filter((t) => t.listingId === listing.id);
  const nearbyMatches = useNearbyMatches(listing);

  const openOffer = () => {
    setPrice(String(listing.pricePerKg));
    setQty(String(listing.quantityTonnes));
    setErrors({});
    setOfferOpen(true);
  };

  const submitOffer = () => {
    const p = Number(price);
    const q = Number(qty);
    const next: typeof errors = {};
    if (!price || Number.isNaN(p) || p <= 0) next.price = 'Enter an offer price above ₹0.';
    if (!qty || Number.isNaN(q) || q <= 0 || q > listing.quantityTonnes) {
      next.qty = `Quantity must be between 0 and ${listing.quantityTonnes} t.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setOfferOpen(false);
    toast('success', 'Offer submitted', `₹${p}/kg × ${q} t sent to ${listing.seller}. They typically respond within a day.`);
  };

  return (
    <DashboardLayout
      role="generator"
      title={`Listing ${listing.id}`}
      actions={
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => (window.location.hash = '#/marketplace')}>
          Marketplace
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0 space-y-6">
          <MaterialVisual listing={listing} />

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={listing.status} />
              <GradeBadge grade={listing.quality} />
              {listing.verified && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-accent-line bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                  <ShieldCheck size={12} aria-hidden /> Verified seller
                </span>
              )}
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
              {listing.subtype} — <span className="capitalize text-ink-soft">{listing.material}</span>
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {listing.seller} · {listing.sellerType} · listed {formatDate(listing.listedAt)} · {listing.views} views
            </p>
          </div>

          <Card>
            <CardHeader title="Lot details" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-3">
              {[
                { label: 'Quantity', value: formatTonnes(listing.quantityTonnes) },
                { label: 'Price', value: formatPricePerKg(listing.pricePerKg) },
                { label: 'Estimated total', value: formatInrPlain(estValue) },
                { label: 'Quality', value: `${listing.quality} — ${listing.quality === 'A' ? 'sorted, <2% contamination' : listing.quality === 'B' ? 'lightly mixed, <8%' : 'mixed load, <15%'}` },
                { label: 'Pickup location', value: `${listing.locality}, ${listing.city}` },
                { label: 'Pickup from', value: formatDate(listing.pickupFrom) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">{label}</dt>
                  <dd className="tabular mt-1 text-sm font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Description" />
            <p className="px-5 py-4 text-sm leading-relaxed text-ink-soft">{listing.description}</p>
          </Card>

          <Card>
            <CardHeader
              title="Location"
              subtitle="Pickup zone and verified recyclers nearby"
              action={
                nearbyMatches.length > 0 ? (
                  <span className="font-mono text-[11px] text-ink-faint">
                    {nearbyMatches.length} recycler{nearbyMatches.length === 1 ? '' : 's'} within range
                  </span>
                ) : undefined
              }
            />
            <div className="p-4">
              <MapView
                center={{ lat: listing.lat, lng: listing.lng }}
                matches={nearbyMatches}
                selectedFacilityId={selectedFacilityId}
                onSelectFacility={setSelectedFacilityId}
                caption="Your pickup location with ranked recyclers — tap a pin for details."
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Transaction history" subtitle="All trades for this seller's material" />
            {history.length > 0 ? (
              <Table caption="Transaction history">
                <THead>
                  <TR>
                    <TH>Tx ID</TH>
                    <TH>Buyer</TH>
                    <TH>Quantity</TH>
                    <TH>Value</TH>
                    <TH>Date</TH>
                  </TR>
                </THead>
                <TBody>
                  {history.map((t) => (
                    <TR key={t.id}>
                      <TD><span className="font-mono text-xs text-accent">{t.id}</span></TD>
                      <TD>{t.counterparty}</TD>
                      <TD className="tabular">{formatTonnes(t.quantityTonnes)}</TD>
                      <TD className="tabular">{formatInrPlain(t.valueInr)}</TD>
                      <TD className="tabular text-ink-soft">{formatDate(t.openedAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="flex items-center gap-2 px-5 py-6 text-sm text-ink-faint">
                <FileText size={15} aria-hidden /> First trade for this lot — history will appear after settlement.
              </p>
            )}
          </Card>
        </div>

        {/* offer rail */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">Current index price</p>
            <p className="tabular mt-1 font-display text-3xl font-bold text-ink">{formatPricePerKg(listing.pricePerKg)}</p>
            <p className="mt-1 text-xs text-ink-soft">
              Est. total <span className="tabular font-medium text-ink">{formatInrPlain(estValue)}</span> for {formatTonnes(listing.quantityTonnes)}
            </p>

            <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Seller</dt>
                <dd className="font-medium text-ink">{listing.seller}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Response time</dt>
                <dd className="tabular font-medium text-ink">~4 h</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Pickup from</dt>
                <dd className="tabular inline-flex items-center gap-1.5 font-medium text-ink">
                  <CalendarClock size={13} aria-hidden className="text-ink-faint" />
                  {formatDate(listing.pickupFrom)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Location</dt>
                <dd className="inline-flex items-center gap-1.5 font-medium text-ink">
                  <MapPin size={13} aria-hidden className="text-ink-faint" />
                  {listing.locality}
                </dd>
              </div>
            </dl>

            <Button className="mt-5 w-full" size="lg" disabled={listing.status !== 'available'} onClick={openOffer}>
              {listing.status === 'available' ? 'Make an Offer' : 'Unavailable'}
            </Button>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Offers are binding for 48 h. Payment settles T+2 after collection, held in escrow until the weight slip is confirmed.
            </p>
          </Card>

          <Card>
            <CardHeader title={`Offers (${offers.length})`} subtitle="Competing bids on this lot" />
            <ul className="divide-y divide-line">
              {offers.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{o.bidder}</p>
                    <p className="tabular mt-0.5 text-xs text-ink-soft">
                      {formatTonnes(o.quantityTonnes)} · {o.placedAt}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-semibold text-accent">{formatPricePerKg(o.pricePerKg)}</p>
                    <p className={`mt-0.5 text-[11px] ${o.status === 'pending' ? 'text-warn' : 'text-ink-faint'}`}>{o.status}</p>
                  </div>
                </li>
              ))}
              {offers.length === 0 && (
                <li className="px-5 py-6 text-sm text-ink-faint">No offers yet — be the first to bid.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      {/* how a listing becomes a trade */}
      {history.length > 0 && (
        <section className="mt-8" aria-label="Trade progress">
          <Card className="p-5">
            <Timeline stage={history[0]!.stage} id={history[0]!.id} />
          </Card>
        </section>
      )}

      <Modal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        title="Make an offer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOfferOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitOffer}>Submit offer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Your price (₹/kg)" htmlFor="offer-price" error={errors.price} hint={`Index: ${formatPricePerKg(listing.pricePerKg)}`} required>
            <Input id="offer-price" type="number" min={1} step={0.5} value={price} invalid={!!errors.price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Quantity (tonnes)" htmlFor="offer-qty" error={errors.qty} hint={`Available: ${formatTonnes(listing.quantityTonnes)}`} required>
            <Input id="offer-qty" type="number" min={0.1} step={0.1} value={qty} invalid={!!errors.qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <div className="rounded-md border border-line bg-surface-2/60 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Estimated total</span>
              <span className="tabular font-semibold text-ink">
                {formatInrPlain(Math.round((Number(price) || 0) * (Number(qty) || 0) * 1000))}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
