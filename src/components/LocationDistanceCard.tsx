import { useState } from 'react';
import { MapPin, Info, LocateFixed, Navigation } from 'lucide-react';
import { Card, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { MapView } from './MapView';
import { formatDistance, getCurrentPosition, GEO_ERRORS, haversineKm } from '../lib/geo';
import type { FacilityMatch, Listing, Location } from '../types';

/**
 * Location section for the listing page: seller pickup pin, optional real
 * device location (requested only on user action, never stored), dynamic
 * straight-line distance, and the ranked recycler map.
 */
export function LocationDistanceCard({
  listing,
  matches,
  selectedFacilityId,
  onSelectFacility,
}: {
  listing: Listing;
  matches: FacilityMatch[];
  selectedFacilityId: string | null;
  onSelectFacility: (id: string | null) => void;
}) {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoState, setGeoState] = useState<'idle' | 'granted' | 'denied' | 'error'>('idle');

  /** One-shot device location on explicit request — never automatic, never stored. */
  const requestMyLocation = () => {
    if (locating) return;
    setLocating(true);
    getCurrentPosition()
      .then((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState('granted');
      })
      .catch((err: Error) => setGeoState(err.message === GEO_ERRORS.DENIED ? 'denied' : 'error'))
      .finally(() => setLocating(false));
  };

  const hasPickup = Number.isFinite(listing.lat) && Number.isFinite(listing.lng);
  const distKm = userLocation && hasPickup ? haversineKm(userLocation, { lat: listing.lat, lng: listing.lng }) : null;

  if (!hasPickup) {
    return (
      <Card>
        <CardHeader title='Location' subtitle='Seller pickup location and verified recyclers nearby' />
        <p className='flex items-center gap-2 px-5 py-6 text-sm text-ink-faint'>
          <MapPin size={15} aria-hidden /> Pickup location unavailable — the seller did not share coordinates.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title='Location'
        subtitle='Seller pickup location and verified recyclers nearby'
        action={
          matches.length > 0 ? (
            <span className='font-mono text-[11px] text-ink-faint'>
              {matches.length} recycler{matches.length === 1 ? '' : 's'} within range
            </span>
          ) : undefined
        }
      />
      <div className='p-4'>
        {/* distance banner — the number is computed, never stored or hardcoded */}
        <div className='mb-3 flex flex-col gap-3 rounded-lg border border-line bg-surface-2 p-3.5 sm:flex-row sm:items-center'>
          <div className='flex min-w-0 items-center gap-3'>
            <span className='grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-void text-accent' aria-hidden>
              <Navigation size={17} />
            </span>
            <div className='min-w-0'>
              {distKm !== null ? (
                <p className='text-sm font-semibold text-ink'>
                  {formatDistance(distKm)} <span className='font-normal text-ink-soft'>from you</span>
                </p>
              ) : geoState === 'denied' ? (
                <p className='text-sm font-semibold text-ink'>Enable location to see distance</p>
              ) : geoState === 'error' ? (
                <p className='text-sm font-semibold text-ink'>Location unavailable right now</p>
              ) : (
                <p className='text-sm font-semibold text-ink'>See how far this pickup is from you</p>
              )}
              <p className='mt-0.5 text-[11.5px] text-ink-faint'>
                Your location is requested only when you ask, and is never stored.
              </p>
            </div>
          </div>
          {distKm === null && (
            <div className='shrink-0 sm:ml-auto'>
              <Button size='sm' variant='secondary' icon={<LocateFixed size={14} aria-hidden />} disabled={locating} onClick={requestMyLocation}>
                {locating ? 'Locating…' : 'Use my location'}
              </Button>
            </div>
          )}
        </div>

        <MapView
          center={{ lat: listing.lat, lng: listing.lng }}
          userLocation={userLocation}
          matches={matches}
          selectedFacilityId={selectedFacilityId}
          onSelectFacility={onSelectFacility}
          caption='Red pin — seller pickup · green — you · numbered — verified recyclers. Tap a pin for details.'
        />

        <dl className='mt-3 grid gap-x-6 gap-y-2.5 text-[12.5px] sm:grid-cols-3'>
          <div className='min-w-0'>
            <dt className='font-mono text-[10px] uppercase tracking-wider text-ink-faint'>Pickup location</dt>
            <dd className='mt-0.5 font-medium text-ink'>
              {listing.locality}, {listing.city}
            </dd>
          </div>
          <div className='min-w-0'>
            <dt className='font-mono text-[10px] uppercase tracking-wider text-ink-faint'>Your location</dt>
            <dd className='tabular mt-0.5 font-medium text-ink'>
              {userLocation ? userLocation.lat.toFixed(4) + ', ' + userLocation.lng.toFixed(4) : 'Not shared'}
            </dd>
          </div>
          <div className='min-w-0'>
            <dt className='font-mono text-[10px] uppercase tracking-wider text-ink-faint'>Distance (straight line)</dt>
            <dd className='tabular mt-0.5 font-medium text-ink'>{distKm !== null ? formatDistance(distKm) : '—'}</dd>
          </div>
        </dl>

        <p className='mt-3 flex items-start gap-1.5 text-[11px] text-ink-faint'>
          <Info size={12} className='mt-0.5 shrink-0' aria-hidden />
          Distance is a straight-line estimate; driving distance and travel time are not calculated.
        </p>
      </div>
    </Card>
  );
}
