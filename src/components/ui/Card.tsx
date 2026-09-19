import type { ReactNode } from 'react';

/** Layered surface card — borders do the work, shadows stay quiet. */

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-line bg-surface ${
        interactive ? 'transition-colors duration-200 hover:border-line-strong hover:bg-surface-2' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode | undefined;
  action?: ReactNode | undefined;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-line px-5 py-4 ${className}`}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
