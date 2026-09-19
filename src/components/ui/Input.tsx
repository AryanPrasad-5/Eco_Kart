import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

const CONTROL =
  'w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line-strong focus:border-accent-line focus:outline-none focus:ring-1 focus:ring-accent-line disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className = '', invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${CONTROL} h-10 ${invalid ? 'border-down/60' : ''} ${className}`}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className = '', children, invalid, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={`${CONTROL} h-10 appearance-none pr-9 ${invalid ? 'border-down/60' : ''} ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
      </div>
    );
  },
);

/** Label + control + hint/error text, wired for screen readers. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  htmlFor: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink-soft">
        {label}
        {required && (
          <span className="text-down" aria-hidden>
            {' *'}
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs text-down">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-ink-faint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
