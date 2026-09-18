import type { ReactNode } from 'react';

interface ErrorStateProps {
  icon?: string;
  title: string;
  message?: string;
  children?: ReactNode;
}

/** Reusable polished error/empty state (spec §15) — icon, message, actions. */
export function ErrorState({ icon = '⚠️', title, message, children }: ErrorStateProps) {
  return (
    <div className="card state-card fade-in">
      <div className="icon" aria-hidden>{icon}</div>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
