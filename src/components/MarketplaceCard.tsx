import { MapPin, CalendarClock, Eye, ShieldCheck } from 'lucide-react';
import type { Listing } from '../types';
import { formatDateShort, formatPricePerKg, formatTonnes, estimateValue, formatInr } from '../lib/format';
import { GradeBadge, StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';

/** A listing rendered as a tradeable instrument: quantity × price = value. */
export function MarketplaceCard({ listing }: { listing: Listing }) {
  return (
    <article className="group relative flex min-w-0 flex-col rounded-lg border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-line hover:bg-surface-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
            {listing.id} · {listing.material}
          </p>
          <h3 className="mt-1 truncate font-display text-[15px] font-semibold text-ink">{listing.subtype}</h3>
          <p className="mt-0.5 truncate text-[13px] text-ink-soft">{listing.seller}</p>
        </div>
        <StatusBadge status={listing.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 items-end gap-3 border-y border-line py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Quantity</p>
          <p className="tabular mt-1 font-display text-lg font-semibold text-ink">{formatTonnes(listing.quantityTonnes)}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Price</p>
          <p className="tabular mt-1 font-display text-lg font-semibold text-accent">{formatPricePerKg(listing.pricePerKg)}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Est. value</p>
          <p className="tabular mt-1 font-display text-lg font-semibold text-ink">{formatInr(estimateValue(listing.pricePerKg, listing.quantityTonnes))}</p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={12} aria-hidden className="text-ink-faint" />
          {listing.locality}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock size={12} aria-hidden className="text-ink-faint" />
          from {formatDateShort(listing.pickupFrom)}
        </span>
        <GradeBadge grade={listing.quality} />
        {listing.verified && (
          <span className="inline-flex items-center gap-1 text-accent">
            <ShieldCheck size={12} aria-hidden /> Verified seller
          </span>
        )}
        <span className="tabular ml-auto inline-flex items-center gap-1 text-ink-faint">
          <Eye size={12} aria-hidden /> {listing.views}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => (window.location.hash = `#/listing/${listing.id}`)}
        >
          View details
        </Button>
        <Button
          size="sm"
          disabled={listing.status !== 'available'}
          onClick={() => (window.location.hash = `#/listing/${listing.id}`)}
        >
          {listing.status === 'available' ? 'Bid' : 'View'}
        </Button>
      </div>
    </article>
  );
}
