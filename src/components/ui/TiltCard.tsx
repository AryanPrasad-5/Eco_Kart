import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  disabled?: boolean;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, disabled = false, className = '', style, ...props }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isCoarse, setIsCoarse] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    const pointerQuery = window.matchMedia('(pointer: coarse)');
    setIsCoarse(pointerQuery.matches);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-12, 12]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || isCoarse || prefersReducedMotion) return;

    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    if (disabled || isCoarse || prefersReducedMotion) return;
    x.set(0);
    y.set(0);
  };

  const isInteractive = !(disabled || isCoarse || prefersReducedMotion);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...(style as any),
        rotateX: isInteractive ? rotateX : 0,
        rotateY: isInteractive ? rotateY : 0,
        transformStyle: 'preserve-3d',
      }}
      className={className}
      {...props}
    >
      <div style={{ transform: isInteractive ? 'translateZ(30px)' : 'none', transition: 'transform 250ms' }} className="h-full">
        {children}
      </div>
    </motion.div>
  );
};
