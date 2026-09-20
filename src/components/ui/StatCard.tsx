import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from './Card';
import { useCountUp } from '../../hooks/useCountUp';

export interface StatCardProps {
  label: string;
  value: number;
  format: (v: number) => string;
  delta?: number; // percent, signed
  deltaLabel?: string;
  icon?: ReactNode;
}

/** Metric tile — the dashboard's unit of information. */
export function StatCard({ label, value, format, delta, deltaLabel, icon }: StatCardProps) {
  const { ref, value: animated } = useCountUp(value);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-soft">{label}</p>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <p ref={ref as React.RefObject<HTMLParagraphElement>} className="tabular mt-2 font-display text-[28px] font-semibold leading-tight text-ink">
        {format(animated)}
      </p>
      {typeof delta === 'number' && (
        <p className="mt-1.5 flex items-center gap-1 text-xs">
          {delta >= 0 ? (
            <ArrowUpRight size={13} className="text-up" aria-hidden />
          ) : (
            <ArrowDownRight size={13} className="text-down" aria-hidden />
          )}
          <span className={`tabular font-medium ${delta >= 0 ? 'text-up' : 'text-down'}`}>
            {delta >= 0 ? '+' : ''}
            {delta}%
          </span>
          {deltaLabel && <span className="text-ink-faint">{deltaLabel}</span>}
        </p>
      )}
    </Card>
  );
}
