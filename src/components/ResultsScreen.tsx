import type { FacilityMatch, Location, WasteCategory } from '../types';
import { FacilityCard } from './FacilityCard';
import { MapView } from './MapView';

interface ResultsScreenProps {
  category: WasteCategory;
  matches: FacilityMatch[];
  userLocation: Location;
  onChangeCategory: () => void;
  onStartOver: () => void;
}

/**
 * Screen 4 — Results (spec §7): "Here's where you can take this waste."
 * Ranked cards first, map as enhancement. The internal score stays hidden;
 * users see the factors (distance, estimated value, verification) instead.
 * Empty state (spec §15) offers a larger search area rather than a dead end.
 */
export function ResultsScreen({
  category,
  matches,
  userLocation,
  onChangeCategory,
  onStartOver,
}: ResultsScreenProps) {
  return (
    <div className="results-layout fade-in">
      <section aria-label="Ranked facilities">
        <div className="results-head">
          <h2>Nearby facilities</h2>
          <span className="result-count">
            {matches.length > 0
              ? `${matches.length} option${matches.length === 1 ? '' : 's'} · ranked by distance, value & trust`
              : 'No matches'}
          </span>
        </div>

        {matches.length === 0 ? (
          <div className="card state-card" style={{ marginTop: 16 }}>
            <div className="icon" aria-hidden>🔍</div>
            <h2>We couldn&apos;t find a suitable facility nearby</h2>
            <p>
              No facility around this location accepts this material yet. Try widening the
              search area or picking a different category.
            </p>
            <button className="btn btn-primary" onClick={onChangeCategory}>
              Try a larger search area
            </button>
            <button className="btn btn-ghost" onClick={onStartOver}>
              Start over
            </button>
          </div>
        ) : (
          <div className="facility-list" style={{ marginTop: 16 }}>
            {matches.map((match, index) => (
              <FacilityCard key={match.facility.facility_id} match={match} category={category} rank={index + 1} />
            ))}
          </div>
        )}
      </section>

      <aside aria-label="Map" style={{ display: 'grid', gap: 14 }}>
        {matches.length > 0 && <MapView center={userLocation} matches={matches} />}
        <div className="card panel" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ fontSize: '1.02rem' }}>How ranking works</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
            Results are ordered by a blend of <strong>distance</strong>, <strong>estimated
            value</strong>, and <strong>verification status</strong>. Payout figures are
            indicative estimates — confirm rates with the facility before travelling.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={onChangeCategory}>Change category</button>
            <button className="btn btn-ghost" onClick={onStartOver}>Scan something else</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
