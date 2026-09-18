import { useRef } from 'react';
import type { LocationStatus } from '../types';
import { LocationStatusChip } from './LocationStatus';

interface CaptureScreenProps {
  onImageSelected: (file: File) => void;
  locationStatus: LocationStatus;
  onRequestLocation: () => void;
  onUseDemoLocation: () => void;
}

/**
 * Screen 1 — Capture (spec §2).
 * SmartSort branding, product pitch, the unmistakable Scan Waste CTA,
 * file upload fallback, and the labeled location status row.
 * Uses <input type="file" accept="image/*" capture="environment"> so
 * supported mobile browsers open the camera directly.
 */
export function CaptureScreen({
  onImageSelected,
  locationStatus,
  onRequestLocation,
  onUseDemoLocation,
}: CaptureScreenProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith('image/')) onImageSelected(file);
  };

  return (
    <div className="fade-in">
      <section className="hero">
        <h1>
          Know your waste.
          <br />
          <span className="accent">Find its value.</span>
        </h1>
        <p className="tagline">
          SmartSort identifies what your waste is made of, shows nearby facilities that accept
          it, and estimates what it could be worth — before it ever reaches a landfill.
        </p>

        <div className="scan-cta">
          {/* Primary CTA: native camera on supported mobile browsers. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            className="btn btn-scan"
            onClick={() => cameraInputRef.current?.click()}
            aria-label="Scan waste with your camera"
          >
            📷 Scan Waste
          </button>

          {/* Fallback: pick an existing photo (desktop, or saved images). */}
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button className="btn btn-ghost" onClick={() => uploadInputRef.current?.click()}>
            Upload a photo instead
          </button>
        </div>
      </section>

      <section className="steps" aria-label="How it works in three steps">
        <div className="step">
          <div className="icon" aria-hidden>📷</div>
          <h3>Scan</h3>
          <p>Take a photo of any waste item</p>
        </div>
        <div className="step">
          <div className="icon" aria-hidden>♻️</div>
          <h3>Identify</h3>
          <p>We detect the material it&apos;s made of</p>
        </div>
        <div className="step">
          <div className="icon" aria-hidden>📍</div>
          <h3>Discover</h3>
          <p>See nearby facilities &amp; its estimated value</p>
        </div>
      </section>

      <LocationStatusChip
        status={locationStatus}
        onRequestLocation={onRequestLocation}
        onUseDemoLocation={onUseDemoLocation}
      />
    </div>
  );
}
