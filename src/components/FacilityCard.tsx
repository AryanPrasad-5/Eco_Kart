import type { FacilityMatch, WasteCategory } from '../types';
import {
  PAYOUT_DISCLAIMER,
  categoryLabel,
  directionsUrl,
  formatDistance,
} from '../lib/format';

interface FacilityCardProps {
  match: FacilityMatch;
  category: WasteCategory;
  rank: number;
}

/**
 * One facility result card (spec §7).
 * Communicates: where to take it, how far, estimated value (always with
 * the disclaimer), trust (verified badge), and practical details.
 * The internal ranking score is never displayed; rank #1 gets the
 * "Best match" badge — best *match* per SmartSort's criteria, not an
 * objective "best facility".
 */
export function FacilityCard({ match, category, rank }: FacilityCardProps) {
  const { facility, distance_km, beyondRadius } = match;
  const pays = facility.payout_estimate[category] !== undefined;

  return (
    <article className={`card facility-card ${rank === 1 ? 'best' : ''}`}>
      {rank === 1 && <span className="best-badge">Best match</span>}

      <div className="facility-top">
        <h3>{facility.name}</h3>
        <div style={{ textAlign: 'right' }}>
          <div className="distance">{formatDistance(distance_km)}</div>
          {beyondRadius && <div className="beyond-flag">beyond 5 km</div>}
        </div>
      </div>

      <div className="facility-meta">
        <span className="pill">{categoryLabel(category)}</span>
        {pays ? (
          <span className="pill payout">₹{facility.payout_estimate[category]}/kg · estimated</span>
        ) : (
          <span className="pill payout">Free drop-off</span>
        )}
        {facility.verified ? (
          <span className="pill verified">✓ Verified</span>
        ) : (
          <span className="pill unverified">Unverified</span>
        )}
      </div>

      <div className="facility-detail">
        <span>🕘 {facility.operating_hours}</span>
        <span>📌 {facility.address}</span>
      </div>

      <p className="disclaimer">{PAYOUT_DISCLAIMER}</p>

      <div className="facility-foot">
        <a
          className="btn btn-secondary"
          href={directionsUrl(facility)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Directions to ${facility.name}`}
        >
          🧭 Directions
        </a>
        <a className="btn btn-ghost" href={`tel:${facility.contact.replace(/[^+\d]/g, '')}`}>
          📞 Contact
        </a>
      </div>
    </article>
  );
}
