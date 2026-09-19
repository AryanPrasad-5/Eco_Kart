import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  ScanSearch,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../hooks/useToast';
import { getApi } from '../api/client';
import { compressImage, fileToBase64 } from '../lib/compress';
import { categoryToMaterial, MATERIALS, QUALITY_GRADES, type Material, type QualityGrade } from '../types';
import { MATERIAL_SPECS } from '../types';
import { estimateValue, formatInrPlain, formatPricePerKg } from '../lib/format';

/* ── wizard model ───────────────────────────────────────────────────── */

const STEPS = ['Material', 'Quantity & Quality', 'Pricing', 'Pickup', 'Photos', 'Review'] as const;

interface Draft {
  material: Material | '';
  subtype: string;
  quantity: string;
  quality: QualityGrade | '';
  price: string;
  city: string;
  locality: string;
  pickupDate: string;
  description: string;
  photos: string[]; // object URLs
}

const EMPTY: Draft = {
  material: '',
  subtype: '',
  quantity: '',
  quality: '',
  price: '',
  city: 'Bengaluru',
  locality: '',
  pickupDate: '',
  description: '',
  photos: [],
};

type Errors = Partial<Record<keyof Draft, string>>;

function validateStep(step: number, d: Draft): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!d.material) e.material = 'Pick the material that best matches your load.';
  }
  if (step === 1) {
    const q = Number(d.quantity);
    if (!d.quantity || Number.isNaN(q) || q <= 0) e.quantity = 'Enter the quantity in tonnes (greater than 0).';
    if (!d.quality) e.quality = 'Select a quality grade.';
    if (!d.subtype.trim()) e.subtype = 'Describe the subtype, e.g. "PET bottles, baled".';
  }
  if (step === 2) {
    const p = Number(d.price);
    if (!d.price || Number.isNaN(p) || p <= 0) e.price = 'Set an asking price per kg.';
    else if (d.material) {
      const index = MATERIAL_SPECS[d.material].avgPrice;
      if (p > index * 3) e.price = `That's over 3× the market index (${formatPricePerKg(index)}). Buyers may not engage.`;
    }
  }
  if (step === 3) {
    if (!d.locality.trim()) e.locality = 'Add a locality so buyers can judge distance.';
    if (!d.pickupDate) e.pickupDate = 'Choose the earliest pickup date.';
    else if (new Date(d.pickupDate) < new Date('2026-09-18')) e.pickupDate = 'Pickup date must be in the future.';
  }
  return e;
}

/* ── AI material tagging (SmartSort classifier, repurposed) ─────────── */

function AiTagPanel({ onPick }: { onPick: (m: Material, note: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ material: Material; confidence: number; rationale: string } | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const scan = useCallback(async (file: File) => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const compressed = await compressImage(file);
      const base64 = compressed.base64 ?? (await fileToBase64(file));
      // Demo hook: "*fail*" filenames exercise the AI-down path.
      if (file.name.toLowerCase().includes('fail')) throw new Error('service unavailable');
      const response = await getApi().classifyAndMatch(base64, { lat: 12.9716, lng: 77.5946 });
      const material = categoryToMaterial(response.classification.category);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      if (!material) {
        setError(`The scan detected "${response.classification.category}" — that category isn't tradable on the exchange. Pick the material manually below.`);
        return;
      }
      setResult({
        material,
        confidence: response.classification.confidence,
        rationale: response.classification.rationale,
      });
    } catch {
      setError('The tagging service is unavailable right now. Pick the material manually — you can publish without the scan.');
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-surface-2/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md border border-accent-line bg-accent-soft text-accent" aria-hidden>
            <Sparkles size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">AI material tagging</p>
            <p className="text-xs text-ink-soft">Upload a photo of the waste — the classifier suggests the material.</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          icon={<ScanSearch size={15} />}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Scanning…' : 'Scan photo'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload a photo for AI material tagging"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void scan(f);
            e.target.value = '';
          }}
        />
      </div>

      <AnimatePresence>
        {(result || error || busy) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4">
              {previewUrl && (
                <img src={previewUrl} alt="Uploaded waste preview" className="h-16 w-16 rounded-md border border-line object-cover" />
              )}
              {result && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    Detected: <span className="font-semibold capitalize text-accent">{result.material}</span>
                    <span className="tabular ml-2 font-mono text-[11px] text-ink-faint">
                      AI signal {(result.confidence * 100).toFixed(0)}%
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{result.rationale}</p>
                </div>
              )}
              {error && <p className="min-w-0 flex-1 text-xs leading-relaxed text-warn">{error}</p>}
              {result && (
                <Button size="sm" onClick={() => onPick(result.material, `AI-tagged from photo · signal ${(result.confidence * 100).toFixed(0)}%`)}>
                  Use this material
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── the wizard ─────────────────────────────────────────────────────── */

export function CreateListing() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  // stable for the lifetime of the wizard — never re-rolled on re-render
  const [draftListingId] = useState(() => `LX-${1042 + Math.floor(Math.random() * 40)}`);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const estValue = useMemo(
    () => estimateValue(Number(draft.price) || 0, Number(draft.quantity) || 0),
    [draft.price, draft.quantity],
  );

  const next = () => {
    const e = validateStep(step, draft);
    setErrors(e);
    if (Object.keys(e).some((k) => e[k as keyof Errors])) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files)
      .slice(0, 6 - draft.photos.length)
      .map((f) => URL.createObjectURL(f));
    setDraft((d) => ({ ...d, photos: [...d.photos, ...urls] }));
  };

  const publish = () => {
    const e = validateStep(1, draft);
    const e3 = validateStep(3, draft);
    const all = { ...e, ...e3 };
    if (Object.values(all).some(Boolean)) {
      setStep(1);
      setErrors(all);
      return;
    }
    setPublishing(true);
    window.setTimeout(() => {
      setPublishing(false);
      setPublished(true);
      toast('success', 'Listing published successfully', `${draft.material} · ${draft.quantity} t is now visible to verified recyclers.`);
    }, 900);
  };

  return (
    <DashboardLayout
      role="generator"
      title="Create listing"
      actions={
        published ? undefined : (
          <span className="font-mono text-[11px] text-ink-faint">
            draft {draftListingId}
          </span>
        )
      }
    >
      {/* stepper */}
      <ol className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full border font-mono text-[10.5px] ${
                i < step
                  ? 'border-accent bg-accent text-void'
                  : i === step
                    ? 'border-accent text-accent'
                    : 'border-line-strong text-ink-faint'
              }`}
              aria-current={i === step ? 'step' : undefined}
            >
              {i < step ? <Check size={11} strokeWidth={3} /> : i + 1}
            </span>
            <span className={`hidden text-xs sm:block ${i === step ? 'font-medium text-ink' : 'text-ink-faint'}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-line-strong" aria-hidden />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* STEP 1 — material */}
          {step === 0 && (
            <div className="space-y-6">
              <AiTagPanel
                onPick={(m, note) => {
                  set('material', m);
                  toast('info', `${m} selected`, note);
                }}
              />
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium text-ink-soft">Material</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MATERIALS.map((m) => (
                    <button
                      key={m}
                      onClick={() => set('material', m)}
                      aria-pressed={draft.material === m}
                      className={`rounded-lg border p-3.5 text-left transition-colors ${
                        draft.material === m ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface hover:border-line-strong'
                      }`}
                    >
                      <span className={`block text-sm font-semibold capitalize ${draft.material === m ? 'text-ink' : 'text-ink-soft'}`}>{m}</span>
                      <span className="tabular mt-1 block font-mono text-[11px] text-ink-faint">
                        index {formatPricePerKg(MATERIAL_SPECS[m].avgPrice)}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.material && <p role="alert" className="mt-2 text-xs text-down">{errors.material}</p>}
              </fieldset>
            </div>
          )}

          {/* STEP 2 — quantity & quality */}
          {step === 1 && (
            <div className="max-w-xl space-y-5">
              <Field label="Subtype" htmlFor="cl-subtype" error={errors.subtype} hint='e.g. "PET bottles, baled" or "OCC corrugated, dry"' required>
                <Input id="cl-subtype" value={draft.subtype} invalid={!!errors.subtype} onChange={(e) => set('subtype', e.target.value)} placeholder="Describe the load" />
              </Field>
              <Field label="Quantity (tonnes)" htmlFor="cl-qty" error={errors.quantity} required>
                <Input id="cl-qty" type="number" min={0.1} step={0.1} value={draft.quantity} invalid={!!errors.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="2.4" />
              </Field>
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium text-ink-soft">Quality grade</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {QUALITY_GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => set('quality', g)}
                      aria-pressed={draft.quality === g}
                      className={`rounded-lg border p-3.5 text-left transition-colors ${
                        draft.quality === g ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface hover:border-line-strong'
                      }`}
                    >
                      <span className={`font-mono text-sm font-semibold ${draft.quality === g ? 'text-accent' : 'text-ink-soft'}`}>Grade {g}</span>
                      <span className="mt-1 block text-xs text-ink-faint">
                        {g === 'A' ? 'Sorted, contamination < 2%' : g === 'B' ? 'Lightly mixed, < 8%' : 'Mixed load, < 15%'}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.quality && <p role="alert" className="mt-2 text-xs text-down">{errors.quality}</p>}
              </fieldset>
            </div>
          )}

          {/* STEP 3 — pricing */}
          {step === 2 && draft.material && (
            <div className="max-w-xl space-y-5">
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="text-xs text-ink-soft">{draft.material} market index</p>
                <p className="tabular mt-1 font-display text-2xl font-semibold text-ink">
                  {formatPricePerKg(MATERIAL_SPECS[draft.material].avgPrice)}
                </p>
                <p className="mt-1 font-mono text-[11px] text-ink-faint">7-day trend: last {MATERIAL_SPECS[draft.material].priceHistory.at(-1)} · avg band ±8%</p>
              </div>
              <Field
                label="Asking price (₹/kg)"
                htmlFor="cl-price"
                error={errors.price}
                hint="Pricing above the index is fine — the marketplace shows buyers how your rate compares."
                required
              >
                <Input id="cl-price" type="number" min={1} step={0.5} value={draft.price} invalid={!!errors.price} onChange={(e) => set('price', e.target.value)} placeholder={String(MATERIAL_SPECS[draft.material].avgPrice)} />
              </Field>
              {Number(draft.price) > 0 && Number(draft.quantity) > 0 && (
                <p className="text-sm text-ink-soft">
                  Est. lot value <span className="tabular font-semibold text-ink">{formatInrPlain(estValue)}</span>
                </p>
              )}
            </div>
          )}

          {/* STEP 4 — pickup */}
          {step === 3 && (
            <div className="max-w-xl space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="City" htmlFor="cl-city">
                  <Select id="cl-city" value={draft.city} onChange={(e) => set('city', e.target.value)}>
                    <option>Bengaluru</option>
                  </Select>
                </Field>
                <Field label="Locality" htmlFor="cl-locality" error={errors.locality} required>
                  <Input id="cl-locality" value={draft.locality} invalid={!!errors.locality} onChange={(e) => set('locality', e.target.value)} placeholder="e.g. Kanakapura Road" />
                </Field>
              </div>
              <Field label="Earliest pickup date" htmlFor="cl-date" error={errors.pickupDate} required>
                <Input id="cl-date" type="date" value={draft.pickupDate} invalid={!!errors.pickupDate} onChange={(e) => set('pickupDate', e.target.value)} />
              </Field>
              <Field label="Notes for buyers (optional)" htmlFor="cl-notes" hint="Access details, weighing arrangements, gate timings.">
                <textarea
                  id="cl-notes"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => set('description', e.target.value)}
                  className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent-line focus:outline-none focus:ring-1 focus:ring-accent-line"
                  placeholder="Weighbridge on site; entry via gate 2 after 10 am."
                />
              </Field>
            </div>
          )}

          {/* STEP 5 — photos */}
          {step === 4 && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addPhotos(e.dataTransfer.files);
                }}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragOver ? 'border-accent-line bg-accent-soft' : 'border-line-strong bg-surface-2/40'
                }`}
              >
                <UploadCloud size={26} className="text-ink-faint" aria-hidden />
                <p className="mt-3 text-sm font-medium text-ink">Drag & drop photos here</p>
                <p className="mt-1 text-xs text-ink-soft">Up to 6 images. Clear, well-lit loads get offers ~2× faster.</p>
                <Button variant="secondary" size="sm" className="mt-4" icon={<ImagePlus size={15} />} onClick={() => photoInput.current?.click()}>
                  Browse files
                </Button>
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  aria-label="Upload listing photos"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>
              {draft.photos.length > 0 && (
                <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {draft.photos.map((url, i) => (
                    <li key={url} className="group relative">
                      <img src={url} alt={`Listing photo ${i + 1}`} className="h-20 w-full rounded-md border border-line object-cover" />
                      <button
                        onClick={() => setDraft((d) => ({ ...d, photos: d.photos.filter((u) => u !== url) }))}
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line bg-surface-3 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      >
                        <X size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* STEP 6 — review & publish */}
          {step === 5 && (
            <div className="max-w-2xl space-y-4">
              <div className="rounded-lg border border-line bg-surface">
                <div className="border-b border-line px-5 py-4">
                  <p className="font-display text-[15px] font-semibold text-ink">
                    {draft.subtype || 'Untitled load'} — <span className="capitalize text-ink-soft">{draft.material || 'material'}</span>
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-3">
                  {[
                    ['Quantity', draft.quantity ? `${draft.quantity} t` : '—'],
                    ['Quality', draft.quality ? `Grade ${draft.quality}` : '—'],
                    ['Asking price', draft.price ? formatPricePerKg(Number(draft.price)) : '—'],
                    ['Est. value', draft.price && draft.quantity ? formatInrPlain(estValue) : '—'],
                    ['Pickup', draft.locality ? `${draft.locality}, ${draft.city}` : '—'],
                    ['From date', draft.pickupDate || '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">{label}</dt>
                      <dd className="tabular mt-1 text-sm font-medium text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
                {draft.photos.length > 0 && (
                  <div className="flex gap-2 border-t border-line px-5 py-4">
                    {draft.photos.map((url, i) => (
                      <img key={url} src={url} alt={`Listing photo ${i + 1}`} className="h-14 w-14 rounded-md border border-line object-cover" />
                    ))}
                  </div>
                )}
              </div>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
                <Check size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                By publishing you confirm the quantities are accurate and accept SmartSort settlement terms (escrow, T+2, weight-slip based).
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* nav buttons */}
      <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
        <Button variant="ghost" icon={<ArrowLeft size={15} />} onClick={back} disabled={step === 0 || published}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button icon={<ArrowRight size={15} />} onClick={next}>
            Continue
          </Button>
        ) : published ? (
          <div className="flex items-center gap-2">
            <Badge tone="accent">Published</Badge>
            <Button variant="secondary" onClick={() => (window.location.hash = '#/dashboard')}>
              Go to dashboard
            </Button>
          </div>
        ) : (
          <Button loading={publishing} onClick={publish}>
            Publish listing
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
}
