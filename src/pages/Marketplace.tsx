import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X, PackageSearch } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { MarketplaceCard } from '../components/MarketplaceCard';
import { Select, Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { EmptyState, SkeletonList } from '../components/ui/Skeleton';
import { LISTINGS } from '../data/listings';
import { MATERIALS, QUALITY_GRADES, type Material, type QualityGrade } from '../types';
import { formatCompact } from '../lib/format';

type SortKey = 'price-desc' | 'price-asc' | 'qty-desc' | 'newest';

interface Filters {
  material: Material | 'all';
  city: string;
  maxPrice: string; // ₹/kg ceiling, '' = any
  minQty: string; // tonnes floor, '' = any
  quality: QualityGrade | 'all';
  pickupBefore: string; // ISO date, '' = any
}

const INITIAL: Filters = { material: 'all', city: 'any', maxPrice: '', minQty: '', quality: 'all', pickupBefore: '' };

const CITIES = ['any', 'Bengaluru'];

/** simulate first-paint fetch so skeleton states are real, not decorative */
function useMarketFetch() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 650);
    return () => window.clearTimeout(t);
  }, []);
  return loading;
}

export function Marketplace() {
  const loading = useMarketFetch();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filters, setFilters] = useState<Filters>(INITIAL);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  const results = useMemo(() => {
    const maxPrice = filters.maxPrice === '' ? Infinity : Number(filters.maxPrice);
    const minQty = filters.minQty === '' ? -Infinity : Number(filters.minQty);
    let out = LISTINGS.filter(
      (l) =>
        (filters.material === 'all' || l.material === filters.material) &&
        (filters.city === 'any' || l.city === filters.city) &&
        (filters.quality === 'all' || l.quality === filters.quality) &&
        l.pricePerKg <= maxPrice &&
        l.quantityTonnes >= minQty &&
        (filters.pickupBefore === '' || l.pickupFrom <= filters.pickupBefore) &&
        (query === '' || `${l.seller} ${l.material} ${l.subtype} ${l.locality} ${l.id}`.toLowerCase().includes(query.toLowerCase())),
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
    return out;
  }, [filters, query, sort]);

  const activeCount =
    (filters.material !== INITIAL.material ? 1 : 0) +
    (filters.city !== INITIAL.city ? 1 : 0) +
    (filters.maxPrice !== INITIAL.maxPrice ? 1 : 0) +
    (filters.minQty !== INITIAL.minQty ? 1 : 0) +
    (filters.quality !== INITIAL.quality ? 1 : 0) +
    (filters.pickupBefore !== INITIAL.pickupBefore ? 1 : 0);

  const filterPanel = (
    <div className="space-y-5">
      <div>
        <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">Material</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => set('material', 'all')}
            aria-pressed={filters.material === 'all'}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${filters.material === 'all' ? 'border-accent-line bg-accent-soft text-accent' : 'border-line text-ink-soft hover:border-line-strong'}`}
          >
            All
          </button>
          {MATERIALS.map((m) => (
            <button
              key={m}
              onClick={() => set('material', m)}
              aria-pressed={filters.material === m}
              className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors ${filters.material === m ? 'border-accent-line bg-accent-soft text-accent' : 'border-line text-ink-soft hover:border-line-strong'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="f-city" className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          Location
        </label>
        <Select id="f-city" value={filters.city} onChange={(e) => set('city', e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c === 'any' ? 'Any location' : c}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="f-price" className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          Max price (₹/kg)
        </label>
        <Input
          id="f-price"
          type="number"
          min={0}
          placeholder="Any"
          value={filters.maxPrice}
          onChange={(e) => set('maxPrice', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="f-qty" className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          Min quantity (t)
        </label>
        <Input
          id="f-qty"
          type="number"
          min={0}
          step={0.1}
          placeholder="Any"
          value={filters.minQty}
          onChange={(e) => set('minQty', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="f-quality" className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          Quality
        </label>
        <Select id="f-quality" value={filters.quality} onChange={(e) => set('quality', e.target.value as QualityGrade | 'all')}>
          <option value="all">Any grade</option>
          {QUALITY_GRADES.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="f-date" className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          Pickup before
        </label>
        <Input id="f-date" type="date" value={filters.pickupBefore} onChange={(e) => set('pickupBefore', e.target.value)} />
      </div>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setFilters(INITIAL)} icon={<X size={13} />}>
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <DashboardLayout
      role="generator"
      title="Marketplace"
      actions={
        <Button size="sm" onClick={() => (window.location.hash = '#/create-listing')}>
          + New listing
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        {/* desktop filter rail */}
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 rounded-lg border border-line bg-surface p-4">{filterPanel}</div>
        </aside>

        <div className="min-w-0">
          {/* toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search material, seller, locality, ID…"
                aria-label="Search listings"
                className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent-line focus:outline-none focus:ring-1 focus:ring-accent-line"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} aria-hidden className="text-ink-faint" />
              <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort listings" className="w-[170px]">
                <option value="newest">Sort: Newest</option>
                <option value="price-desc">Price: high to low</option>
                <option value="price-asc">Price: low to high</option>
                <option value="qty-desc">Quantity: high to low</option>
              </Select>
            </div>
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          </div>

          <p className="tabular mb-4 font-mono text-[11px] text-ink-faint" role="status">
            {loading ? 'Loading market…' : `${results.length} listing${results.length === 1 ? '' : 's'} · ${formatCompact(results.reduce((s, l) => s + l.quantityTonnes, 0))}t on offer`}
          </p>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonList rows={3} />
              <SkeletonList rows={3} />
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={<PackageSearch size={20} />}
              title="No listings match these filters"
              body="Widen the price ceiling or clear a filter — new loads are listed throughout the day."
              action={
                <Button variant="secondary" size="sm" onClick={() => { setFilters(INITIAL); setQuery(''); }}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((l) => (
                <MarketplaceCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* mobile filter drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[300px] max-w-[88vw] overflow-y-auto border-l border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-[15px] font-semibold text-ink">Filters</p>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close filters" className="rounded p-1.5 text-ink-faint hover:text-ink">
                <X size={18} />
              </button>
            </div>
            {filterPanel}
            <Button className="mt-6 w-full" onClick={() => setDrawerOpen(false)}>
              Show {results.length} listing{results.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
