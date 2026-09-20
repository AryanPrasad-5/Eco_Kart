import { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Phone,
  Navigation,
  Share2,
  Plus,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Field, Select } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/Badge';
import { formatTonnes } from '../lib/format';
import type { Material } from '../types';
import { useToast } from '../hooks/useToast';

export type PickupStep = 'DISPATCHED' | 'EN_ROUTE' | 'AT_GATE' | 'WEIGHING' | 'DELIVERED';

interface ExtendedPickup {
  id: string;
  transactionId: string;
  partner: string;
  material: Material;
  quantityTonnes: number;
  date: string;
  slot: string;
  address: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  driverName: string;
  driverPhone: string;
  driverRating: number;
  vehicleModel: string;
  vehicleNumber: string;
  vehicleType: 'trike' | 'ace_ev' | 'heavy_truck';
  lat: number;
  lng: number;
  destLat: number;
  destLng: number;
  destFacility: string;
  etaMins: number;
  speedKmh: number;
  otp: string;
  step: PickupStep;
}

const INITIAL_EXTENDED: ExtendedPickup[] = [
  {
    id: 'PU-318',
    transactionId: 'TX-7371',
    partner: 'eRe Cycle Depot logistics',
    material: 'e-waste',
    quantityTonnes: 0.65,
    date: '2026-09-19',
    slot: '10:00–12:00',
    address: 'Zenith Devices Pvt Ltd, Electronic City Phase 1',
    driverName: 'Suresh Kumar',
    driverPhone: '+91 98450 12891',
    driverRating: 4.9,
    vehicleModel: 'Tata Ace EV Cargo',
    vehicleNumber: 'KA 01 EK 9412',
    vehicleType: 'ace_ev',
    lat: 12.9815,
    lng: 77.601,
    destLat: 12.9716,
    destLng: 77.5946,
    destFacility: 'eRe Cycle Depot Hub, Koramangala',
    etaMins: 14,
    speedKmh: 32,
    otp: '5921',
    step: 'EN_ROUTE',
    status: 'in-progress',
  },
  {
    id: 'PU-315',
    transactionId: 'TX-7412',
    partner: 'PETVerse collection van',
    material: 'plastic',
    quantityTonnes: 2.1,
    date: '2026-09-21',
    slot: '14:00–16:00',
    address: 'Prestige Falcon City, Kanakapura Road',
    driverName: 'Manjunath Gowda',
    driverPhone: '+91 99002 44109',
    driverRating: 4.85,
    vehicleModel: 'Ashok Leyland Bada Dost (2.5T)',
    vehicleNumber: 'KA 05 MN 3892',
    vehicleType: 'heavy_truck',
    lat: 12.926,
    lng: 77.568,
    destLat: 12.912,
    destLng: 77.585,
    destFacility: 'PETVerse Polymer Plant, JP Nagar',
    etaMins: 38,
    speedKmh: 24,
    otp: '3814',
    step: 'DISPATCHED',
    status: 'scheduled',
  },
  {
    id: 'PU-309',
    transactionId: 'TX-7385',
    partner: 'PaperRound logistics',
    material: 'cardboard',
    quantityTonnes: 5.2,
    date: '2026-09-18',
    slot: '09:00–11:00',
    address: 'Kalyan Techno Park, Marathahalli',
    driverName: 'Imran Pasha',
    driverPhone: '+91 97312 88401',
    driverRating: 4.95,
    vehicleModel: 'Mahindra Zor Grand Electric',
    vehicleNumber: 'KA 03 EZ 6103',
    vehicleType: 'ace_ev',
    lat: 12.956,
    lng: 77.701,
    destLat: 12.969,
    destLng: 77.712,
    destFacility: 'PaperRound Pulp Logistics, Whitefield',
    etaMins: 5,
    speedKmh: 18,
    otp: '8204',
    step: 'AT_GATE',
    status: 'in-progress',
  },
  {
    id: 'PU-301',
    transactionId: 'TX-7355',
    partner: 'Shivajinagar fleet',
    material: 'metal',
    quantityTonnes: 0.8,
    date: '2026-09-12',
    slot: '11:00–13:00',
    address: 'Anand Metal Works, Peenya',
    driverName: 'Venkatesh R.',
    driverPhone: '+91 94481 02941',
    driverRating: 4.78,
    vehicleModel: 'E-Cargo Trike (500kg)',
    vehicleNumber: 'KA 04 ET 2910',
    vehicleType: 'trike',
    lat: 13.031,
    lng: 77.518,
    destLat: 13.028,
    destLng: 77.525,
    destFacility: 'Shivajinagar Smelters, Peenya',
    etaMins: 0,
    speedKmh: 0,
    otp: '1092',
    step: 'DELIVERED',
    status: 'completed',
  },
];

export function Pickups({ role = 'generator' }: { role?: 'generator' | 'recycler' }) {
  const { toast } = useToast();
  const [pickups, setPickups] = useState<ExtendedPickup[]>(INITIAL_EXTENDED);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_EXTENDED[0]?.id ?? 'PU-318');
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'completed'>('all');
  const [bookingOpen, setBookingOpen] = useState(false);

  // New Booking State
  const [material, setMaterial] = useState<Material>('plastic');
  const [quantity, setQuantity] = useState('850');
  const [unit, setUnit] = useState<'kg' | 'tonnes'>('kg');
  const [vehicle, setVehicle] = useState<'trike' | 'ace_ev' | 'heavy_truck'>('ace_ev');
  const [locality, setLocality] = useState('Indiranagar 100ft Road');
  const [scheduleType, setScheduleType] = useState<'instant' | 'later'>('instant');
  const [slot, setSlot] = useState('Within 45 mins');
  const [requiresWeighingScale, setRequiresWeighingScale] = useState(true);

  const selectedPickup: ExtendedPickup = useMemo(
    () => pickups.find((p) => p.id === selectedId) ?? pickups[0] ?? INITIAL_EXTENDED[0]!,
    [pickups, selectedId],
  );

  // Filtered Pickups list
  const filteredPickups = useMemo(() => {
    if (filter === 'active') return pickups.filter((p) => p.status === 'in-progress');
    if (filter === 'scheduled') return pickups.filter((p) => p.status === 'scheduled');
    if (filter === 'completed') return pickups.filter((p) => p.status === 'completed');
    return pickups;
  }, [pickups, filter]);

  // Live driver simulation timer
  const [driverPos, setDriverPos] = useState({ lat: selectedPickup.lat, lng: selectedPickup.lng });
  const [simEta, setSimEta] = useState(selectedPickup.etaMins);

  useEffect(() => {
    setDriverPos({ lat: selectedPickup.lat, lng: selectedPickup.lng });
    setSimEta(selectedPickup.etaMins);
  }, [selectedPickup]);

  // Animated pulse simulation for the live driver
  useEffect(() => {
    if (selectedPickup.status !== 'in-progress') return;
    const timer = setInterval(() => {
      setDriverPos((prev) => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.0004,
        lng: prev.lng + (Math.random() - 0.5) * 0.0004,
      }));
    }, 2500);
    return () => clearInterval(timer);
  }, [selectedPickup.status]);

  // Advance simulation step
  const advanceStep = () => {
    const steps: PickupStep[] = ['DISPATCHED', 'EN_ROUTE', 'AT_GATE', 'WEIGHING', 'DELIVERED'];
    const currentIdx = steps.indexOf(selectedPickup.step);
    const nextStep: PickupStep = steps[Math.min(steps.length - 1, currentIdx + 1)] ?? 'DELIVERED';
    const newStatus: 'in-progress' | 'completed' = nextStep === 'DELIVERED' ? 'completed' : 'in-progress';

    setPickups((prev) =>
      prev.map((p) =>
        p.id === selectedPickup.id
          ? {
              ...p,
              step: nextStep,
              status: newStatus,
              etaMins: nextStep === 'DELIVERED' ? 0 : Math.max(2, p.etaMins - 6),
            }
          : p,
      ),
    );
    toast('success', `Status updated to ${nextStep}`, `Driver verified checkpoint for ${selectedPickup.id}`);
  };

  const handleCreateBooking = () => {
    const qtyTonnes = unit === 'kg' ? Number(quantity) / 1000 : Number(quantity);
    if (!qtyTonnes || qtyTonnes <= 0) {
      toast('error', 'Invalid quantity', 'Please enter a valid weight');
      return;
    }

    const newId = 'PU-' + Math.floor(320 + Math.random() * 80);
    const newPickup: ExtendedPickup = {
      id: newId,
      transactionId: 'TX-' + Math.floor(7500 + Math.random() * 400),
      partner: vehicle === 'trike' ? 'RapidEco Fleet' : 'SmartSort Cargo Partner',
      material,
      quantityTonnes: qtyTonnes,
      date: new Date().toISOString().slice(0, 10),
      slot: scheduleType === 'instant' ? 'Instant (35-45 mins)' : slot,
      address: `${locality}, Bengaluru`,
      status: 'in-progress',
      driverName: 'Ramesh Gowda',
      driverPhone: '+91 98801 77392',
      driverRating: 4.93,
      vehicleModel:
        vehicle === 'trike'
          ? 'Electric Cargo Trike (400kg)'
          : vehicle === 'ace_ev'
          ? 'Tata Ace EV Waste Freighter'
          : 'Ashok Leyland Heavy Dump Cargo',
      vehicleNumber: 'KA 01 EF ' + Math.floor(1000 + Math.random() * 8999),
      vehicleType: vehicle,
      lat: 12.9716 + (Math.random() - 0.5) * 0.04,
      lng: 77.5946 + (Math.random() - 0.5) * 0.04,
      destLat: 12.95 + (Math.random() - 0.5) * 0.03,
      destLng: 77.6 + (Math.random() - 0.5) * 0.03,
      destFacility: 'SmartSort Verified Recycler Hub 04',
      etaMins: 22,
      speedKmh: 31,
      otp: String(Math.floor(1000 + Math.random() * 9000)),
      step: 'DISPATCHED',
    };

    setPickups([newPickup, ...pickups]);
    setSelectedId(newId);
    setBookingOpen(false);
    toast('success', 'Driver dispatched!', `${newPickup.driverName} is on the way in ${newPickup.vehicleModel}`);
  };

  return (
    <DashboardLayout role={role} title="Live Waste Cargo & Pickup Fleet">
      <div className="space-y-6">
        {/* Top Header Banner with Live Fleet Metrics */}
        <div className="relative overflow-hidden rounded-xl border border-line-strong bg-gradient-to-r from-surface to-surface-2 p-6 shadow-xl">
          <div className="pointer-events-none absolute inset-0 bg-radar opacity-40" />
          <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent">
                  <span className="h-2 w-2 animate-ping rounded-full bg-accent" />
                </span>
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                  Real-time Cargo Dispatch & Fleet Tracking
                </span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold text-ink">Waste Pickups & Transport</h1>
              <p className="mt-1 text-sm text-ink-soft">
                Live Uber/Rapido-style GPS tracking, verified tare scale weighing, and automated custody transfer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={() => setBookingOpen(true)}
                icon={<Plus size={16} />}
                className="glow-accent"
              >
                Book Instant Pickup
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line/60 pt-4 sm:grid-cols-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">Active Cargo En Route</p>
              <p className="tabular mt-0.5 font-display text-xl font-bold text-ink">
                {pickups.filter((p) => p.status === 'in-progress').length} Loads
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">Weight in Transit</p>
              <p className="tabular mt-0.5 font-display text-xl font-bold text-accent">
                {formatTonnes(
                  pickups
                    .filter((p) => p.status === 'in-progress')
                    .reduce((acc, p) => acc + p.quantityTonnes, 0),
                )}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">Average Dispatch ETA</p>
              <p className="tabular mt-0.5 font-display text-xl font-bold text-ink">18 mins</p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">Tare Verified Fleet</p>
              <p className="tabular mt-0.5 flex items-center gap-1.5 font-display text-xl font-bold text-up">
                <ShieldCheck size={18} /> 100% Certified
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Live Tracking Map + Active Jobs */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left / Center Stage: Interactive Live Map & Driver Telemetry (8 cols) */}
          <div className="space-y-6 lg:col-span-7 xl:col-span-8">
            <Card className="overflow-hidden border-accent-line/40 bg-surface shadow-2xl">
              {/* Map Header with Selected Pickup Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-accent-line bg-accent-soft text-accent">
                    <Truck size={18} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{selectedPickup.id}</span>
                      <span className="text-xs text-ink-soft">·</span>
                      <span className="text-sm font-semibold capitalize text-ink">{selectedPickup.material} Load</span>
                    </div>
                    <p className="text-xs text-ink-soft truncate max-w-[280px] sm:max-w-md">
                      To: {selectedPickup.destFacility}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-accent-line bg-accent-soft px-3 py-1 font-mono text-xs font-semibold text-accent">
                    {selectedPickup.step.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* LIVE MAP CONTAINER */}
              <div className="relative h-96 w-full bg-[#080a09] overflow-hidden">
                {/* SVG Live Simulation Route Map */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 450" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34e27a" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#3ddc84" stopOpacity="0.3" />
                    </linearGradient>
                    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff0a" strokeWidth="1" />
                    </pattern>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#gridPattern)" />

                  {/* Simulated City Roads & Blocks */}
                  <path d="M 40 120 Q 250 80 420 180 T 760 220" fill="none" stroke="#232725" strokeWidth="16" />
                  <path d="M 120 40 L 180 400" fill="none" stroke="#232725" strokeWidth="12" />
                  <path d="M 380 40 L 320 400" fill="none" stroke="#232725" strokeWidth="14" />
                  <path d="M 600 40 L 620 400" fill="none" stroke="#232725" strokeWidth="12" />
                  <path d="M 40 310 Q 300 340 520 280 T 760 320" fill="none" stroke="#232725" strokeWidth="14" />

                  {/* Active Cargo Transport Route Path */}
                  <path
                    d="M 210 280 Q 360 200 480 220 T 640 140"
                    fill="none"
                    stroke="#34e27a"
                    strokeWidth="4"
                    strokeDasharray="8 6"
                    className="animate-pulse"
                  />

                  {/* Start Point (Pickup Location) */}
                  <circle cx="210" cy="280" r="8" fill="#e25c4a" stroke="#050505" strokeWidth="2" />
                  <text x="210" y="308" fill="#f5f7f5" fontSize="12" fontWeight="600" textAnchor="middle" fontFamily="Space Grotesk">
                    Pickup Site
                  </text>

                  {/* Destination (Recycling Facility) */}
                  <circle cx="640" cy="140" r="10" fill="#3ddc84" stroke="#050505" strokeWidth="3" />
                  <circle cx="640" cy="140" r="18" fill="none" stroke="#3ddc84" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x="640" y="120" fill="#3ddc84" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="Space Grotesk">
                    Recycling Hub
                  </text>

                  {/* Driver Current Position */}
                  <g transform={`translate(${380 + (driverPos.lng - 77.6) * 600}, ${215 + (driverPos.lat - 12.97) * 600})`}>
                    <circle cx="0" cy="0" r="22" fill="#34e27a" opacity="0.2" className="animate-ping" />
                    <circle cx="0" cy="0" r="14" fill="#34e27a" stroke="#0d0f0e" strokeWidth="3" />
                    <circle cx="0" cy="0" r="5" fill="#0d0f0e" />
                  </g>
                </svg>

                {/* Floating Telemetry HUD over Map */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-surface/90 px-3 py-1.5 backdrop-blur-md shadow-lg">
                    <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
                    <span className="font-mono text-xs text-ink font-medium">GPS Signal: Live High Precision</span>
                  </div>
                  <div className="rounded-lg border border-line bg-surface/90 p-3 backdrop-blur-md shadow-lg max-w-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-[11px] text-ink-faint">ETA TO DESTINATION</span>
                      <span className="font-mono text-sm font-bold text-accent">{simEta} mins</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-4">
                      <span className="font-mono text-[11px] text-ink-faint">VEHICLE SPEED</span>
                      <span className="font-mono text-xs text-ink">{selectedPickup.speedKmh} km/h</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-4">
                      <span className="font-mono text-[11px] text-ink-faint">BATTERY / TARE</span>
                      <span className="font-mono text-xs text-up">84% · Calibrated</span>
                    </div>
                  </div>
                </div>

                {/* Floating Bottom OTP & Verification Card */}
                <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent-line bg-surface/95 p-3 backdrop-blur-md shadow-xl">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-void font-bold text-xs">
                      OTP
                    </span>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">Pickup Handover Code</p>
                      <p className="font-mono text-base font-bold tracking-widest text-accent">{selectedPickup.otp}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={advanceStep} icon={<Navigation size={14} />}>
                      Simulate Checkpoint Step
                    </Button>
                  </div>
                </div>
              </div>

              {/* Driver Details Footer Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-surface-2/60 p-5">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-12 w-12 place-items-center rounded-full border border-line-strong bg-surface-3 text-lg font-bold text-ink">
                    {selectedPickup.driverName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-sm font-bold text-ink">{selectedPickup.driverName}</h4>
                      <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[11px] font-semibold text-warn">
                        ★ {selectedPickup.driverRating}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-ink-soft">
                      {selectedPickup.vehicleModel} · <span className="text-ink">{selectedPickup.vehicleNumber}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <a
                    href={`tel:${selectedPickup.driverPhone}`}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-white/5"
                  >
                    <Phone size={14} className="text-accent" />
                    Call Driver
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      toast('success', 'Tracking Link Copied', 'Share this URL with your logistics gate team');
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink-soft transition-colors hover:text-ink hover:bg-white/5"
                  >
                    <Share2 size={14} />
                    Share
                  </button>
                </div>
              </div>
            </Card>

            {/* Step-by-Step Delivery Progress Stepper */}
            <Card className="p-5">
              <CardHeader title="Pickup Custody Lifecycle" subtitle="Digital chain of custody from generator gate to smelter" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { key: 'DISPATCHED', label: 'Dispatched', desc: 'Driver Assigned' },
                  { key: 'EN_ROUTE', label: 'En Route', desc: 'Arriving at Gate' },
                  { key: 'AT_GATE', label: 'At Site', desc: 'Verification' },
                  { key: 'WEIGHING', label: 'Weighed', desc: 'Tare Certified' },
                  { key: 'DELIVERED', label: 'Delivered', desc: 'Settlement' },
                ].map((s, idx) => {
                  const stepsOrder = ['DISPATCHED', 'EN_ROUTE', 'AT_GATE', 'WEIGHING', 'DELIVERED'];
                  const currentIdx = stepsOrder.indexOf(selectedPickup.step);
                  const isDone = currentIdx >= idx;
                  const isCurrent = currentIdx === idx;

                  return (
                    <div
                      key={s.key}
                      className={`relative rounded-lg border p-3 text-left transition-all ${
                        isCurrent
                          ? 'border-accent bg-accent-soft shadow-[0_0_15px_rgba(52,226,122,0.15)]'
                          : isDone
                          ? 'border-line-strong bg-surface-2 text-ink-soft'
                          : 'border-line/50 bg-surface/40 text-ink-faint'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold">0{idx + 1}</span>
                        {isDone ? (
                          <CheckCircle2 size={14} className="text-accent" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-ink-faint" />
                        )}
                      </div>
                      <p className={`mt-2 font-display text-xs font-semibold ${isDone ? 'text-ink' : 'text-ink-faint'}`}>
                        {s.label}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-ink-soft">{s.desc}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right Stage: Pickups Queue & Schedule (5 cols) */}
          <div className="space-y-6 lg:col-span-5 xl:col-span-4">
            <Card className="p-5">
              <div className="flex items-center justify-between border-b border-line pb-3.5">
                <div>
                  <h3 className="font-display text-base font-bold text-ink">Dispatch Queue</h3>
                  <p className="text-xs text-ink-soft">Select a pickup to view live tracking</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setBookingOpen(true)} icon={<Plus size={13} />}>
                  Book
                </Button>
              </div>

              {/* Status Filter Pills */}
              <div className="mt-3 flex gap-1.5 border-b border-line/60 pb-3">
                {(['all', 'active', 'scheduled', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                      filter === f
                        ? 'bg-accent-soft text-accent font-semibold border border-accent-line'
                        : 'text-ink-soft hover:bg-white/5 hover:text-ink'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Pickups List */}
              <div className="mt-3 space-y-2.5">
                {filteredPickups.map((p) => {
                  const isSelected = p.id === selectedId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                        isSelected
                          ? 'border-accent-line bg-surface-2 shadow-[0_0_18px_rgba(52,226,122,0.12)]'
                          : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs font-bold ${isSelected ? 'text-accent' : 'text-ink'}`}>
                              {p.id}
                            </span>
                            <span className="text-[11px] capitalize font-medium text-ink-soft">
                              {p.material}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-soft truncate max-w-[200px]">{p.partner}</p>
                        </div>
                        <StatusBadge
                          status={p.status === 'scheduled' ? 'pending' : p.status === 'in-progress' ? 'reserved' : 'accepted'}
                        />
                      </div>

                      {/* Weight Display - Tonnes & Kilograms Context */}
                      <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2 text-xs">
                        <span className="font-mono text-ink font-semibold">
                          {formatTonnes(p.quantityTonnes)}
                        </span>
                        <span className="font-mono text-[11px] text-ink-faint">
                          {p.date} · {p.slot}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
                        <MapPin size={12} className="shrink-0 text-accent" />
                        <span className="truncate">{p.address}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Quick Vehicle Fleet Reference */}
            <Card className="p-5 border-dashed">
              <h4 className="font-display text-sm font-semibold text-ink flex items-center gap-2">
                <Truck size={15} className="text-accent" /> Eco-Fleet Payload Classes
              </h4>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-line/40 pb-2">
                  <span className="text-ink">Electric Cargo Trike</span>
                  <span className="font-mono text-accent">Up to 500 kg</span>
                </div>
                <div className="flex items-center justify-between border-b border-line/40 pb-2">
                  <span className="text-ink">Tata Ace EV Mini Truck</span>
                  <span className="font-mono text-accent">Up to 1.2 t (1,200 kg)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink">Ashok Leyland Freight 407</span>
                  <span className="font-mono text-accent">Up to 3.5 t (3,500 kg)</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* "Book Instant Rapido/Uber-style Pickup" Modal */}
      <Modal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title="Book On-Demand Waste Pickup"
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-soft">
            Dispatch an on-demand verified cargo vehicle to your site. An authorized driver arrives with a certified digital tare scale.
          </p>

          <Field label="Material Category" htmlFor="bk-material" required>
            <Select id="bk-material" value={material} onChange={(e) => setMaterial(e.target.value as Material)}>
              <option value="plastic">Plastic (PET / HDPE / Film)</option>
              <option value="cardboard">Cardboard & Paper (OCC)</option>
              <option value="metal">Metals (Aluminium / Steel / Copper)</option>
              <option value="glass">Glass (Cullet & Bottles)</option>
              <option value="e-waste">Electronic Waste (PCBs / Gadgets)</option>
            </Select>
          </Field>

          {/* Weight & Unit Toggle */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="bk-qty" className="text-[13px] font-medium text-ink-soft">
                Quantity to Pick Up
              </label>
              <div className="flex rounded border border-line bg-surface-2 p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setUnit('kg')}
                  className={`px-2 py-0.5 rounded ${unit === 'kg' ? 'bg-accent text-void font-bold' : 'text-ink-soft'}`}
                >
                  Kilograms (kg)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('tonnes')}
                  className={`px-2 py-0.5 rounded ${unit === 'tonnes' ? 'bg-accent text-void font-bold' : 'text-ink-soft'}`}
                >
                  Tonnes (t)
                </button>
              </div>
            </div>
            <Input
              id="bk-qty"
              type="number"
              min={unit === 'kg' ? 10 : 0.05}
              step={unit === 'kg' ? 10 : 0.1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1"
              placeholder={unit === 'kg' ? 'e.g. 850' : 'e.g. 0.85'}
            />
            <p className="mt-1 font-mono text-[11px] text-ink-faint">
              Equivalent:{' '}
              {unit === 'kg'
                ? `${(Number(quantity) / 1000).toFixed(2)} Tonnes`
                : `${Math.round(Number(quantity) * 1000).toLocaleString('en-IN')} kg`}
            </p>
          </div>

          {/* Vehicle Selector */}
          <div>
            <label className="text-[13px] font-medium text-ink-soft">Select Vehicle Type</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {[
                { id: 'trike', label: 'E-Trike', cap: 'Max 500 kg', eta: '15 mins' },
                { id: 'ace_ev', label: 'Tata Ace EV', cap: 'Max 1.2 Tonnes', eta: '25 mins' },
                { id: 'heavy_truck', label: 'Heavy Truck', cap: 'Max 3.5 Tonnes', eta: '45 mins' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicle(v.id as any)}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    vehicle === v.id
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-line bg-surface hover:border-line-strong text-ink-soft'
                  }`}
                >
                  <p className="font-semibold text-xs text-ink">{v.label}</p>
                  <p className="font-mono text-[10px] text-accent">{v.cap}</p>
                  <p className="font-mono text-[9.5px] text-ink-faint">ETA ~{v.eta}</p>
                </button>
              ))}
            </div>
          </div>

          <Field label="Pickup Location" htmlFor="bk-locality" required>
            <Input
              id="bk-locality"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="e.g. Indiranagar, Whitefield, Peenya"
            />
          </Field>

          {/* Dispatch Timing */}
          <div>
            <label className="text-[13px] font-medium text-ink-soft">Dispatch Timing</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleType('instant')}
                className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                  scheduleType === 'instant'
                    ? 'border-accent bg-accent-soft font-semibold text-accent'
                    : 'border-line bg-surface text-ink-soft hover:text-ink'
                }`}
              >
                ⚡ Instant Dispatch (30–45 min)
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('later')}
                className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                  scheduleType === 'later'
                    ? 'border-accent bg-accent-soft font-semibold text-accent'
                    : 'border-line bg-surface text-ink-soft hover:text-ink'
                }`}
              >
                📅 Scheduled Slot
              </button>
            </div>
            {scheduleType === 'later' && (
              <Input
                id="bk-slot"
                className="mt-2"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                placeholder="e.g. Tomorrow 10:00–12:00"
              />
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={requiresWeighingScale}
              onChange={(e) => setRequiresWeighingScale(e.target.checked)}
              className="rounded border-line bg-surface text-accent focus:ring-accent"
            />
            <span className="text-xs text-ink">Bring calibrated digital tare weighing scale (Free)</span>
          </label>

          <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
            <Button variant="ghost" onClick={() => setBookingOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateBooking} icon={<Truck size={15} />}>
              Confirm Dispatch
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
