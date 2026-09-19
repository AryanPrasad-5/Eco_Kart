import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-void font-semibold hover:bg-[#4aeb8c] active:bg-[#2bc76a] shadow-[0_0_0_1px_#34e27a,0_4px_20px_rgba(52,226,122,0.22)]',
  secondary: 'bg-surface-3 text-ink border border-line hover:border-line-strong hover:bg-[#222624]',
  ghost: 'text-ink-soft hover:text-ink hover:bg-white/5',
  outline: 'border border-line-strong text-ink hover:border-accent-line hover:bg-accent-soft',
  danger: 'bg-down/15 text-down border border-down/30 hover:bg-down/25',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
