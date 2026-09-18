import { useCallback, useState } from 'react';
import type {
  ClassificationResult,
  FacilityMatch,
  Location,
  LocationStatus,
  NavView,
  WasteCategory,
} from './types';
import { ApiError } from './types';
import { getApi } from './api/client';
import { compressImage, fileToBase64 } from './lib/compress';
import { DEMO_LOCATION, getLocation } from './lib/geolocation';
import { CaptureScreen } from './components/CaptureScreen';
import { ConfirmScreen } from './components/ConfirmScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { CategoryChip } from './components/CategoryChip';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ErrorState } from './components/ErrorState';
import { About } from './components/StaticPages';
import { LandingPage } from './components/LandingPage';
import { CLASSIFICATION_STAGES } from './mock/classification';
import { WASTE_CATEGORIES } from './types';

/** Matching-stage overlay messages (no AI involved on this path). */
const MATCHING_STAGES = ['Finding nearby recycling options…'] as const;

interface Results {
  category: WasteCategory;
  matches: FacilityMatch[];
  userLocation: Location;
}

/**
 * SmartSort app shell + primary state machine (spec §14):
 *   capture → classifying → confirm → results
 * with polished error states (spec §15). React state only — no Redux.
 */
export default function App() {
  const [view, setView] = useState<NavView>('landing');
  const [phase, setPhase] = useState<'capture' | 'confirm' | 'results' | 'error'>('capture');
  const [busyStages, setBusyStages] = useState<readonly string[] | null>(null);

  const [locationStatus, setLocationStatus] = useState<LocationStatus>({ state: 'idle' });
  const [imageUrl, setImageUrl] = useState('');
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  /** Resolved coordinates for API calls — device location when available, demo fallback otherwise. */
  const resolvedLocation = (): Location => {
    if (locationStatus.state === 'granted' || locationStatus.state === 'demo') return locationStatus.location;
    return DEMO_LOCATION;
  };

  const requestLocation = useCallback(async () => {
    setLocationStatus({ state: 'acquiring' });
    const status = await getLocation();
    setLocationStatus(status);
  }, []);

  const useDemoLocation = useCallback(() => {
    setLocationStatus({ state: 'demo', location: DEMO_LOCATION });
  }, []);

  const startOver = useCallback(() => {
    setPhase('capture');
    setClassification(null);
    setResults(null);
    setError(null);
    setView('landing');
    window.scrollTo({ top: 0 });
  }, []);

  const enterApp = useCallback(() => {
    setView('app');
    setPhase('capture');
    window.scrollTo({ top: 0 });
  }, []);

  const goToResults = useCallback(async (category: WasteCategory) => {
    setBusyStages(MATCHING_STAGES);
    try {
      const response = await getApi().matchFacilities(category, resolvedLocation());
      setResults({ category, matches: response.matches, userLocation: response.userLocation });
      setPhase('results');
    } catch {
      setError({ title: 'Something went wrong', message: 'We could not load facilities right now.' });
      setPhase('error');
    } finally {
      setBusyStages(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationStatus]);

  /** Capture flow: preview → compress → classify (spec §2/§3). */
  const handleImageSelected = useCallback(
    async (file: File) => {
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setBusyStages(CLASSIFICATION_STAGES);

      try {
        const compressed = await compressImage(file);
        const base64 = compressed.base64 ?? (await fileToBase64(file));

        // Demo hook: a file named "*fail*" exercises the classification-failure path.
        if (file.name.toLowerCase().includes('fail')) {
          throw new ApiError('mock classification failure', 'server');
        }

        const response = await getApi().classifyAndMatch(base64, resolvedLocation());
        setClassification(response.classification);
        setResults({ category: response.classification.category, matches: response.matches, userLocation: response.userLocation });
        setPhase('confirm');
      } catch (err) {
        console.warn('SmartSort: classification failed', err);
        setError({
          title: "We couldn't identify this item",
          message: 'The photo may be unclear, or the service is unavailable. Choose the material yourself — matching will still work.',
        });
        setPhase('error');
      } finally {
        setBusyStages(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locationStatus],
  );

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={startOver} aria-label="SmartSort home">
            <span className="brand-mark" aria-hidden>♻️</span>
            SmartSort
          </button>
          <nav className="nav" aria-label="Main navigation">
            <button className={view === 'landing' ? 'active' : ''} onClick={startOver}>Home</button>
            <button className={view === 'app' ? 'active' : ''} onClick={enterApp}>Scan Waste</button>
            <button className={view === 'about' ? 'active' : ''} onClick={() => { setView('about'); window.scrollTo({ top: 0 }); }}>
              About &amp; Vision
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {view === 'about' && <About />}

        {view === 'landing' && <LandingPage onEnterApp={enterApp} />}

        {view === 'app' && phase === 'capture' && (
          <CaptureScreen
            onImageSelected={handleImageSelected}
            locationStatus={locationStatus}
            onRequestLocation={requestLocation}
            onUseDemoLocation={useDemoLocation}
          />
        )}

        {view === 'app' && phase === 'confirm' && classification && (
          <ConfirmScreen
            imageUrl={imageUrl}
            classification={classification}
            onConfirm={goToResults}
            onRetake={startOver}
          />
        )}

        {view === 'app' && phase === 'results' && results && (
          <ResultsScreen
            category={results.category}
            matches={results.matches}
            userLocation={results.userLocation}
            onChangeCategory={startOver}
            onStartOver={startOver}
          />
        )}

        {view === 'app' && phase === 'error' && error && (
          <ErrorState icon="🤔" title={error.title} message={error.message}>
            <p className="chips-label">Choose the material manually</p>
            <div className="chips" role="group" aria-label="Waste categories">
              {WASTE_CATEGORIES.map((category) => (
                <CategoryChip key={category} category={category} selected={false} onSelect={() => goToResults(category)} />
              ))}
            </div>
            <button className="btn btn-ghost" onClick={startOver}>Start over</button>
          </ErrorState>
        )}
      </main>

      <footer className="footer">
        SmartSort · AI-powered waste identification &amp; facility discovery · Hackathon MVP — payouts are indicative estimates, not offers.
      </footer>

      {busyStages && <LoadingOverlay stages={busyStages} />}
    </div>
  );
}
