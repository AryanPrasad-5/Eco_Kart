import { useMemo, useState } from 'react';
import { SearchX, Locate, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { EmptyState } from '../components/ui/Skeleton';
import { PICKUPS } from '../data/listings';
import { formatDate, formatQuantity, formatPricePerKg } from '../lib/format';
import { MapView } from '../components/MapView';
import { FACILITIES } from '../mock/facilities';
import { rankFacilitiesByDistance } from '../lib/haversine';
import { useToast } from '../hooks/useToast';
import type { Location } from '../types';

export function Pickups() {
  const { toast } = useToast();
  // Default to Bengaluru center
  const [pickupLoc, setPickupLoc] = useState<Location>({ lat: 12.9716, lng: 77.5946 });
  const [userLoc, setUserLoc] = useState<Location | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const matches = useMemo(() => rankFacilitiesByDistance(pickupLoc, FACILITIES), [pickupLoc]);
  
  const handleUseMyLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(loc);
          setPickupLoc(loc);
        },
        () => {
          toast('error', 'Location access denied', 'Please allow location access or move the pin manually.');
        }
      );
    }
  };

  const selectedMatch = matches.find((m) => m.facility.facility_id === selectedFacility);

  const handleConfirm = () => {
    if (!selectedMatch) return;
    // TODO: Send booking request to backend here
    setConfirmed(true);
    toast('success', 'Pickup Booked', `Your pickup to ${selectedMatch.facility.name} is confirmed.`);
  };

  return (
    <DashboardLayout role="generator" title="Pickups">
      <div className="mb-8 space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink">Book a pickup</h2>
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card className="flex flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Pickup location</p>
              <Button variant="secondary" size="sm" icon={<Locate size={14} />} onClick={handleUseMyLocation}>
                Use my location
              </Button>
            </div>
            <MapView
              center={pickupLoc}
              userLocation={userLoc}
              matches={matches}
              selectedFacilityId={selectedFacility}
              onSelectFacility={setSelectedFacility}
              draggableMarker
              fullHeight
              onLocationChange={setPickupLoc}
              caption="Drag the pin to set your exact pickup location."
            />
          </Card>

          <Card className="flex flex-col overflow-hidden">
            <CardHeader title="Nearby Centers" subtitle="Select a destination" />
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              <ul className="divide-y divide-line">
                {matches.map((m, i) => {
                  const isSelected = m.facility.facility_id === selectedFacility;
                  const payoutEntry = Object.entries(m.facility.payout_estimate ?? {})
                    .filter(([, v]) => typeof v === 'number' && (v as number) > 0)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
                  
                  return (
                    <li key={m.facility.facility_id}>
                      <button
                        onClick={() => setSelectedFacility(m.facility.facility_id)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          isSelected ? 'bg-accent-soft border-l-2 border-accent' : 'hover:bg-surface-2 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className={`text-sm font-medium ${isSelected ? 'text-ink' : 'text-ink-soft'}`}>
                              <span className="inline-block w-5 h-5 rounded-full bg-surface-2 border border-line text-center text-[10px] leading-4 mr-2 tabular">
                                {i + 1}
                              </span>
                              {m.facility.name}
                            </p>
                            <p className="mt-1 text-xs text-ink-faint uppercase tracking-wide">
                              {m.facility.accepted_categories.join(', ')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-accent">{m.distance_km.toFixed(1)} km</p>
                            {payoutEntry && (
                              <p className="mt-1 text-xs text-ink-soft">{formatPricePerKg(payoutEntry[1] as number)}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            {selectedMatch && (
              <div className="p-4 border-t border-line bg-surface-2/30">
                {!confirmed ? (
                  <>
                    <p className="text-sm text-ink mb-1">
                      <span className="text-ink-soft">To:</span> {selectedMatch.facility.name}
                    </p>
                    <p className="text-xs text-ink-faint mb-3">
                      {selectedMatch.distance_km.toFixed(1)} km (straight-line, actual route may vary)
                    </p>
                    <Button className="w-full" onClick={handleConfirm}>
                      Confirm Pickup
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm text-accent py-2 font-medium">
                    <CheckCircle2 size={16} /> Pickup Confirmed
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Pickup schedule" subtitle="upcoming and past logistics" />
        {PICKUPS.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<SearchX size={18} />} title="No pickups yet" body="Your scheduled pickups will appear here." />
          </div>
        ) : (
          <Table caption="Pickups" className="w-full table-fixed">
            <THead>
              <TR>
                <TH className="w-[8%]">ID</TH>
                <TH className="w-[18%]">Date & Slot</TH>
                <TH className="w-[12%]">Material</TH>
                <TH className="w-[14%]">Quantity</TH>
                <TH className="w-[18%]">Partner</TH>
                <TH className="w-[18%]">Address</TH>
                <TH className="w-[12%]">Status</TH>
              </TR>
            </THead>
            <TBody>
              {PICKUPS.map((p) => (
                <TR key={p.id}>
                  <TD><span className="font-mono text-xs text-accent">{p.id}</span></TD>
                  <TD className="tabular text-ink-soft">{formatDate(p.date)}<br/><span className="text-[11px]">{p.slot}</span></TD>
                  <TD className="capitalize text-ink-soft">{p.material}</TD>
                  <TD className="tabular">{formatQuantity(p.quantityTonnes)}</TD>
                  <TD className="truncate" title={p.partner}>{p.partner}</TD>
                  <TD className="truncate text-[13px] text-ink-soft" title={p.address}>{p.address}</TD>
                  <TD>
                    <StatusBadge status={p.status === 'completed' ? 'accepted' : p.status === 'in-progress' ? 'reserved' : 'pending'} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </DashboardLayout>
  );
}
