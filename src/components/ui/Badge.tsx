import type { ReactNode } from 'react';
import type { ListingStatus, Material, OfferStatus, QualityGrade } from '../../types';
import { MATERIAL_SPECS } from '../../types';

/** Small bordered label — the vocabulary for states and materials. */

type Tone = 'neutral' | 'accent' | 'warn' | 'down' | 'mono';

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-white/[0.03] text-ink-soft',
  accent: 'border-accent-line bg-accent-soft text-accent',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  down: 'border-down/30 bg-down/10 text-down',
  mono: 'border-line bg-transparent text-ink-faint font-mono text-[10.5px] tracking-wide',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5 ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ListingStatus | OfferStatus }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    available: { tone: 'accent', label: 'Available' },
    reserved: { tone: 'warn', label: 'Reserved' },
    traded: { tone: 'neutral', label: 'Traded' },
    draft: { tone: 'neutral', label: 'Draft' },
    pending: { tone: 'warn', label: 'Pending' },
    accepted: { tone: 'accent', label: 'Accepted' },
    declined: { tone: 'down', label: 'Declined' },
    withdrawn: { tone: 'neutral', label: 'Withdrawn' },
  };
  const entry = map[status] ?? { tone: 'neutral' as Tone, label: status };
  return (
    <Badge tone={entry.tone}>
      {entry.tone === 'accent' && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
      {entry.label}
    </Badge>
  );
}

export function GradeBadge({ grade }: { grade: QualityGrade }) {
  return (
    <Badge tone={grade === 'A' ? 'accent' : grade === 'B' ? 'neutral' : 'warn'} className="font-mono">
      {grade === 'A' ? '⌾ ' : ''}Gr {grade}
    </Badge>
  );
}

export function MaterialBadge({ material }: { material: Material }) {
  const spec = MATERIAL_SPECS[material];
  return (
    <Badge tone="mono">
      {material}
      <span className="text-ink-faint">· {spec.demand.toLowerCase()} demand</span>
    </Badge>
  );
}
