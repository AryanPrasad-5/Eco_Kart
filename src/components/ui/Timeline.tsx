import { Check } from 'lucide-react';
import { TRANSACTION_STAGES } from '../../types';

/**
 * Transaction progress across the six marketplace stages.
 * Horizontal on desktop, vertical on small screens.
 */
export function Timeline({ stage, id }: { stage: number; id?: string }) {
  return (
    <ol className="flex flex-col gap-0 md:flex-row md:items-start" aria-label={`Transaction progress: ${TRANSACTION_STAGES[stage]} of ${TRANSACTION_STAGES.length}`}>
      {TRANSACTION_STAGES.map((label, i) => {
        const done = i < stage;
        const current = i === stage;
        return (
          <li key={label} className="relative flex flex-1 gap-3 pb-6 md:flex-col md:gap-0 md:pb-0">
            {/* connector */}
            <span
              aria-hidden
              className={`absolute left-[11px] top-6 w-px flex-1 md:left-0 md:top-[11px] md:h-px md:w-full ${
                i === TRANSACTION_STAGES.length - 1 ? 'hidden' : done ? 'bg-accent/50' : 'bg-line-strong'
              }`}
            />
            <span
              aria-hidden
              className={`relative z-10 grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full border text-[10px] ${
                done
                  ? 'border-accent bg-accent text-void'
                  : current
                    ? 'border-accent bg-void text-accent shadow-[0_0_12px_rgba(52,226,122,0.35)]'
                    : 'border-line-strong bg-surface text-ink-faint'
              }`}
            >
              {done ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <div className="md:mt-2.5 md:pr-3">
              <p className={`text-[13px] font-medium leading-tight ${done || current ? 'text-ink' : 'text-ink-faint'}`}>
                {label}
              </p>
              {current && id && <p className="mt-0.5 font-mono text-[10.5px] text-accent">{id}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
