import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TRANSACTION_STAGES } from '../../types';

interface SettlementStackProps {
  currentStage: number; // 0 to 5
}

export function SettlementStack({ currentStage }: SettlementStackProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center py-12" style={{ perspective: '800px' }}>
      <motion.div
        className="relative h-[200px] w-[200px]"
        initial={prefersReducedMotion ? false : { rotateX: 60, rotateZ: -45, y: -40 }}
        animate={{ rotateX: 60, rotateZ: -45, y: 0 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {TRANSACTION_STAGES.map((stageName, i) => {
          const isCompleted = i < currentStage;
          const isCurrent = i === currentStage;
          const isFuture = i > currentStage;

          // Compute spacing for the stack
          // The plates stack on the Z axis.
          const zOffset = i * 35; // 35px between each plate

          return (
            <motion.div
              key={i}
              className={`absolute inset-0 flex items-center justify-center rounded-xl bg-surface backdrop-blur-sm ${
                isCompleted
                  ? 'border-2 border-accent bg-accent/10'
                  : isCurrent
                  ? 'border-2 border-accent shadow-[0_0_20px_rgba(52,226,122,0.4)]'
                  : 'border-2 border-dashed border-line/50 bg-transparent'
              }`}
              initial={prefersReducedMotion ? false : { z: 0 }}
              animate={{ z: zOffset }}
              transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: i * 0.05 }}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {isCurrent && (
                <div className="absolute -left-6 -top-6 h-3 w-3 rounded-full bg-accent animate-pulse-dot" />
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
