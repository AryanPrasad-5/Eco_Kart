import { navigate } from '../hooks/useHashRoute';
import { Button } from '../components/ui/Button';

/**
 * The pivot: from the planet to the product. One sentence of conviction,
 * then the doors into the working platform.
 */
export default function Pivot() {
  return (
    <section className="exp-pivot" aria-label="Begin with SmartSort">
      <p className="exp-pivot__kicker font-mono">WHERE YOU COME IN</p>
      <h2 className="exp-pivot__title">
        We were built to see value in what we throw&nbsp;away.
      </h2>
      <p className="exp-pivot__sub">
        Photograph what you are about to discard. SmartSort identifies the
        material, finds the facilities near you, and shows the value it still
        holds.
      </p>
      <div className="exp-pivot__actions">
        <Button variant="primary" size="md" onClick={() => navigate('#/product')}>
          Begin sorting
        </Button>
        <Button variant="ghost" size="md" onClick={() => navigate('#/marketplace')}>
          Explore the marketplace
        </Button>
      </div>
      <p className="exp-pivot__foot font-mono">
        CLASSIFICATION ON-DEVICE CANDIDATE · FACILITY DATA VERIFIED · PAYOUTS INDICATIVE
      </p>
    </section>
  );
}
