import { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  stages: readonly string[];
}

/**
 * Classification loading overlay (spec §4). Cycles through honest, staged
 * messages ("Analyzing your waste…" → "Finding nearby recycling options…").
 * No fabricated performance or accuracy numbers.
 */
export function LoadingOverlay({ stages }: LoadingOverlayProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= stages.length - 1) return;
    const timer = setTimeout(() => setStage((s) => s + 1), 700);
    return () => clearTimeout(timer);
  }, [stage, stages.length]);

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-card">
        <div className="spinner" aria-hidden />
        <p className="loading-msg">{stages[Math.min(stage, stages.length - 1)]}</p>
        <p className="loading-sub">This usually takes a few seconds.</p>
      </div>
    </div>
  );
}
