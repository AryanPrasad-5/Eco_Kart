import type { WasteCategory } from '../types';
import { CATEGORY_META } from '../types';

interface CategoryChipProps {
  category: WasteCategory;
  selected: boolean;
  onSelect: () => void;
}

/** One tappable category chip — used on Confirm and error/manual flows. */
export function CategoryChip({ category, selected, onSelect }: CategoryChipProps) {
  const { label, icon } = CATEGORY_META[category];
  return (
    <button
      className={`pill ${selected ? 'verified' : ''}`}
      style={{
        background: selected ? 'var(--green-100)' : 'var(--card)',
        borderColor: selected ? 'var(--green-600)' : 'var(--line)',
        color: selected ? 'var(--green-800)' : 'var(--ink-soft)',
        boxShadow: selected ? '0 0 0 1px var(--green-600)' : 'none',
        minHeight: 44,
        fontSize: '0.9rem',
      }}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span aria-hidden>{icon}</span> {label}
    </button>
  );
}
