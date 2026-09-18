import type { ClassificationResult, WasteCategory } from '../types';
import { WASTE_CATEGORIES } from '../types';
import { categoryIcon, categoryLabel } from '../lib/format';
import { CategoryChip } from './CategoryChip';

interface ConfirmScreenProps {
  imageUrl: string;
  classification: ClassificationResult;
  onConfirm: (category: WasteCategory) => void;
  onRetake: () => void;
}

/**
 * Screen 3 — Confirm (spec §5/§6).
 * Shows the captured image, the detected category, the AI signal
 * (never called "accuracy"), the model's one-line rationale, and ALL
 * seven category chips. Confirming — with the detected category or a
 * correction — goes straight to facility matching; classification is
 * never re-run. Low signal gets a gentle nudge, not an alarm.
 */
export function ConfirmScreen({ imageUrl, classification, onConfirm, onRetake }: ConfirmScreenProps) {
  const selected = classification.category;
  const lowSignal = classification.confidence < 0.6;
  const pct = Math.round(classification.confidence * 100);

  return (
    <div className="confirm-layout fade-in">
      <div className="card panel verdict-card">
        <div className="preview-wrap" style={{ margin: 0 }}>
          <img className="preview-img" src={imageUrl} alt="Captured waste item" />
        </div>

        <div className="verdict-head">
          <div className="verdict-emoji" aria-hidden>{categoryIcon(selected)}</div>
          <div>
            <h2>{categoryLabel(selected)}</h2>
            <span className="ai-signal">
              AI signal
              <span className="signal-bar" role="img" aria-label={`AI signal ${pct} percent`}>
                <span style={{ width: `${pct}%` }} />
              </span>
              {pct}%
            </span>
          </div>
        </div>

        <p className="rationale">{classification.rationale}</p>

        {lowSignal && (
          <p className="low-signal-note">Not completely sure — please confirm the material.</p>
        )}

        <p className="chips-label">Is this correct?</p>
        <div className="chips" role="group" aria-label="Waste categories">
          {WASTE_CATEGORIES.map((category) => (
            <CategoryChip
              key={category}
              category={category}
              selected={selected === category}
              onSelect={() => onConfirm(category)}
            />
          ))}
        </div>

        <button className="btn btn-primary btn-block" onClick={() => onConfirm(selected)}>
          Yes — find facilities →
        </button>

        <button className="btn btn-ghost btn-block" onClick={onRetake}>
          Retake photo
        </button>
      </div>
    </div>
  );
}
