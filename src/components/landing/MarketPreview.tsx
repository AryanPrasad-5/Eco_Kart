import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, MapPin, ArrowUpRight } from 'lucide-react';
import { LISTINGS } from '../../data/listings';
import { MATERIALS, type Material } from '../../types';
import { formatDateShort, formatPricePerKg, formatQuantity } from '../../lib/format';
import { StatusBadge } from '../ui/Badge';

type SortKey = 'price-desc' | 'price-asc' | 'qty-desc' | 'newest';

/**
 * Interactive marketplace preview — a working slice of the real
 * marketplace page: search, two filters, and a live-sorted table.
 */
export function MarketPreview() {
  const [query, setQuery] = useState('');
  const [material, setMaterial] = useState<Material | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('newest');

  const rows = useMemo(() => {
    let out = LISTINGS.filter(
      (l) =>
        (material === 'all' || l.material === material) &&
        (query === '' ||
          `${l.seller} ${l.material} ${l.subtype} ${l.locality}`.toLowerCase().includes(query.toLowerCase())),
    );
    switch (sort) {
      case 'price-desc':
        out = [...out].sort((a, b) => b.pricePerKg - a.pricePerKg);
        break;
      case 'price-asc':
        out = [...out].sort((a, b) => a.pricePerKg - b.pricePerKg);
        break;
      case 'qty-desc':
        out = [...out].sort((a, b) => b.quantityTonnes - a.quantityTonnes);
        break;
      default:
        out = [...out].sort((a, b) => b.listedAt.localeCompare(a.listedAt));
    }
    return out.slice(0, 7);
  }, [query, material, sort]);

  return (
    <section id="marketplace-preview" className="scroll-mt-20 py-20 sm:py-24" aria-labelledby="mp-heading">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">Marketplace</p>
            <h2 id="mp-heading" className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Order-book clarity for physical goods
            </h2>
          </div>
          <button
            onClick={() => (window.location.hash = '#/marketplace')}
            className="group flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-accent"
          >
            Open the full marketplace
            <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-2/60 px-4 py-3">
            <div className="relative min-w-[180px] flex-1">
              <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search material, seller, locality…"
                aria-label="Search listings"
                className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent-line focus:outline-none"
              />
            </div>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as Material | 'all')}
              aria-label="Filter by material"
              className="h-9 rounded-md border border-line bg-surface px-2.5 text-sm text-ink-soft focus:border-accent-line focus:outline-none"
            >
              <option value="all">All materials</option>
              {MATERIALS.map((m) => (
                <option key={m} value={m} className="capitalize">
                  {m}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} aria-hidden className="text-ink-faint" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sort listings"
                className="h-9 rounded-md border border-line bg-surface px-2.5 text-sm text-ink-soft focus:border-accent-line focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="price-desc">Price: high to low</option>
                <option value="price-asc">Price: low to high</option>
                <option value="qty-desc">Quantity</option>
              </select>
            </div>
          </div>

          {/* table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Marketplace listings preview</caption>
              <thead>
                <tr className="border-b border-line">
                  {['Seller', 'Material', 'Quantity', 'Price', 'Location', 'Status', ''].map((h) => (
                    <th key={h} scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="group border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.02]">
                    <td className="max-w-[180px] truncate px-4 py-3 font-medium text-ink">{l.seller}</td>
                    <td className="px-4 py-3">
                      <span className="text-ink-soft">{l.subtype}</span>
                      <span className="ml-2 font-mono text-[10.5px] uppercase text-ink-faint">{l.material}</span>
                    </td>
                    <td className="tabular px-4 py-3 text-ink">{formatQuantity(l.quantityTonnes)}</td>
                    <td className="tabular px-4 py-3 font-medium text-accent">{formatPricePerKg(l.pricePerKg)}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={12} aria-hidden className="text-ink-faint" />
                        {l.locality}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => (window.location.hash = `#/listing/${l.id}`)}
                        className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-accent-line hover:text-accent"
                      >
                        View listing
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">
                      No listings match — clear the search or pick another material.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line bg-surface-2/60 px-4 py-2.5">
            <p className="tabular font-mono text-[11px] text-ink-faint">
              {rows.length} of {LISTINGS.length} listings · updated 2 min ago
            </p>
            <p className="hidden font-mono text-[11px] text-ink-faint sm:block">
              pickup from {rows.length > 0 ? formatDateShort(rows[0]!.pickupFrom) : '—'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
