import type { ReactNode } from 'react';

/** Dense data table kit — the financial-marketplace register look. */

export function Table({ children, caption, className = '' }: { children: ReactNode; caption?: string; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full min-w-[640px] border-collapse text-left text-sm ${className}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line">{children}</tr>
    </thead>
  );
}

export function TH({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint ${className}`}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr 
      onClick={onClick}
      className={`border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.02] ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className = '', title }: { children?: ReactNode; className?: string; title?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`} title={title}>{children}</td>;
}
