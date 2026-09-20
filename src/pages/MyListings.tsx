import { useEffect, useState } from 'react';
import { PackagePlus, RefreshCw, ShieldCheck } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge, GradeBadge } from '../components/ui/Badge';
import { useAuth } from '../auth/AuthContext';
import { fetchMyListings, recordToListing, type ListingRecord } from '../api/listings';
import { formatDate, formatPricePerKg, formatTonnes } from '../lib/format';

/**
 * My Listings (Phase 5) - only the authenticated owner's records, fetched
 * from GET /my-listings (JWT). Honest loading/empty/error states; nothing
 * is fabricated when the API is unreachable.
 */
export function MyListings() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ListingRecord[] | null>(null);
  const [error, setError] = useState('');
  const [reloading, setReloading] = useState(false);

  const load = () => {
    setReloading(true);
    setError('');
    fetchMyListings()
      .then((res) => setRecords(res.listings))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your listings.'))
      .finally(() => setReloading(false));
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.sub]);

  if (!user) {
    return (
      <DashboardLayout role='generator' title='My listings'>
        <Card className='mx-auto max-w-md p-8 text-center'>
          <ShieldCheck size={22} className='mx-auto text-accent' aria-hidden />
          <h2 className='mt-3 font-display text-lg font-semibold text-ink'>Sign in to see your listings</h2>
          <p className='mx-auto mt-1 max-w-sm text-sm text-ink-soft'>Listings are private to the account that published them.</p>
          <Button className='mt-6' onClick={() => (window.location.hash = '#/signin')}>Sign in</Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role='generator'
      title='My listings'
      actions={<Button variant='secondary' size='sm' icon={<PackagePlus size={14} />} onClick={() => (window.location.hash = '#/create-listing')}>New listing</Button>}
    >
      {records === null && !error && (
        <Card className='p-10 text-center text-sm text-ink-faint'>Loading your listings…</Card>
      )}
      {error && (
        <Card className='p-8 text-center'>
          <p className='text-sm text-warn'>{error}</p>
          <Button variant='secondary' size='sm' className='mt-4' loading={reloading} icon={<RefreshCw size={14} />} onClick={load}>Try again</Button>
        </Card>
      )}
      {records !== null && !error && records.length === 0 && (
        <Card className='p-10 text-center'>
          <h2 className='font-display text-lg font-semibold text-ink'>No listings yet</h2>
          <p className='mx-auto mt-1 max-w-sm text-sm text-ink-soft'>Publish your first load and it will appear here with live status.</p>
          <Button className='mt-6' icon={<PackagePlus size={15} />} onClick={() => (window.location.hash = '#/create-listing')}>Create a listing</Button>
        </Card>
      )}
      {records !== null && !error && records.length > 0 && (
        <Card>
          <CardHeader title={'Your listings (' + records.length + ')'} subtitle='Private to your account - served from the live listings table' />
          <ul className='divide-y divide-line'>
            {records.map((r) => {
              const l = recordToListing(r);
              return (
                <li key={r.listingId} className='flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4'>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium text-ink'>{r.subtype} <span className='capitalize text-ink-soft'>· {r.material}</span></p>
                    <p className='tabular mt-0.5 text-xs text-ink-soft'>{r.locality}, {r.city} · published {formatDate(r.createdAt)}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <GradeBadge grade={l.quality} />
                    <StatusBadge status={l.status} />
                  </div>
                  <p className='tabular text-xs text-ink-soft'>{formatTonnes(r.quantityTonnes)} · {formatPricePerKg(r.pricePerKg)}</p>
                  <Button variant='ghost' size='sm' onClick={() => (window.location.hash = '#/listing/' + encodeURIComponent(r.listingId))}>View</Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </DashboardLayout>
  );
}
