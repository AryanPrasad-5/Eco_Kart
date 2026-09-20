import { MapPin, CalendarClock, Eye, ShieldCheck } from 'lucide-react';
import type { Listing } from '../types';
import { formatDateShort, formatPricePerKg, formatQuantity, estimateValue, formatInr } from '../lib/format';
import { GradeBadge, StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { TiltCard } from './ui/TiltCard';
import { MATERIAL_SPECS } from '../types';

const Sparkline = ({ data, colorClass }: { data: number[], colorClass: string }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  const step = width / (data.length - 1 || 1);
  const points = data.map((val, i) => `${i * step},${height - ((val - min) / range) * height}`).join(' ');
  
  const start = data[0] as number;
  const end = data[data.length - 1] as number;
  const pctChange = start === 0 ? 0 : ((end - start) / start) * 100;
  
  return (
    <div className="flex flex-col items-end gap-1">
      <svg width={width} height={height} className="overflow-visible">
        <polyline points={points} fill="none" className={colorClass} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={width} cy={height - ((end - min) / range) * height} r="2" className={colorClass} fill="currentColor" />
      </svg>
      <span className={`text-[10px] font-mono tracking-wider ${pctChange >= 0 ? 'text-up' : 'text-down'}`}>
        {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}% 7d
      </span>
    </div>
  );
};

const CSSBaleCube = ({ colorVar, paused }: { colorVar: string, paused: boolean }) => {
  return (
    <div className="relative w-12 h-12" style={{ perspective: '300px' }}>
      <div 
        className={`w-full h-full relative transition-transform ${paused ? '' : 'animate-[idle-spin_16s_linear_infinite] group-hover:animate-[idle-spin_6s_linear_infinite]'}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="absolute inset-0 border border-black/20 opacity-90" style={{ backgroundColor: `var(${colorVar})`, transform: 'translateZ(24px)' }}>
          {/* subtle lines for bale texture */}
          <div className="absolute inset-x-0 top-1/4 border-t border-black/10" />
          <div className="absolute inset-x-0 top-2/4 border-t border-black/10" />
          <div className="absolute inset-x-0 top-3/4 border-t border-black/10" />
        </div>
        <div className="absolute inset-0 border border-black/20 opacity-90 brightness-75" style={{ backgroundColor: `var(${colorVar})`, transform: 'rotateY(180deg) translateZ(24px)' }} />
        <div className="absolute inset-0 border border-black/20 opacity-90 brightness-90" style={{ backgroundColor: `var(${colorVar})`, transform: 'rotateY(90deg) translateZ(24px)' }}>
          <div className="absolute inset-x-0 top-1/4 border-t border-black/10" />
          <div className="absolute inset-x-0 top-2/4 border-t border-black/10" />
          <div className="absolute inset-x-0 top-3/4 border-t border-black/10" />
        </div>
        <div className="absolute inset-0 border border-black/20 opacity-90 brightness-90" style={{ backgroundColor: `var(${colorVar})`, transform: 'rotateY(-90deg) translateZ(24px)' }} />
        <div className="absolute inset-0 border border-black/20 opacity-90 brightness-110" style={{ backgroundColor: `var(${colorVar})`, transform: 'rotateX(90deg) translateZ(24px)' }} />
        <div className="absolute inset-0 border border-black/20 opacity-90 brightness-50" style={{ backgroundColor: `var(${colorVar})`, transform: 'rotateX(-90deg) translateZ(24px)' }} />
      </div>
    </div>
  );
};

export function MarketplaceCard({ listing }: { listing: Listing }) {
  const colorVarMap: Record<string, string> = {
    'plastic': '--color-plastic',
    'paper': '--color-paper',
    'cardboard': '--color-cardboard',
    'metal': '--color-metal',
    'glass': '--color-glass',
    'e-waste': '--color-ewaste',
  };
  const colorClassMap: Record<string, string> = {
    'plastic': 'text-[#4db9e6]',
    'paper': 'text-[#f2c94c]',
    'cardboard': 'text-[#a67c52]',
    'metal': 'text-[#9ca3af]',
    'glass': 'text-[#8b5cf6]',
    'e-waste': 'text-[#ec4899]',
  };
  
  const colorVar = colorVarMap[listing.material] || '--color-ink';
  const colorClass = colorClassMap[listing.material] || 'text-ink';
  const priceHistory = MATERIAL_SPECS[listing.material]?.priceHistory || [0,0];

  return (
    <TiltCard className="group">
      <article 
        className="relative flex min-w-0 flex-col rounded-lg border border-line bg-surface p-5 transition-all duration-200 hover:border-accent-line hover:bg-surface-2"
        style={{ borderTop: `2px solid var(${colorVar})` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
              {listing.id} · {listing.material}
            </p>
          </div>
          <StatusBadge status={listing.status} />
        </div>
        
        <div className="mt-4 flex justify-between items-center h-16">
          <CSSBaleCube colorVar={colorVar} paused={listing.status === 'reserved'} />
          <Sparkline data={priceHistory} colorClass={colorClass} />
        </div>

        <div className="mt-4">
          <h3 className="truncate font-display text-[15px] font-semibold text-ink">{listing.subtype}</h3>
          <p className="mt-0.5 truncate text-[13px] text-ink-soft">{listing.seller}</p>
        </div>

        <div className="mt-4 grid grid-cols-3 items-end gap-3 border-y border-line py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Quantity</p>
            <p className="tabular mt-1 font-display text-lg font-semibold text-ink">{formatQuantity(listing.quantityTonnes)}</p>
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
    </TiltCard>
  );
}
