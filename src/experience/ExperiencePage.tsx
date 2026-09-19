import { lazy, useEffect, useState } from 'react';
import Loader from './Loader';
import Hero from './Hero';
import Chapters from './Chapters';
import Narrative from './Narrative';
import Pivot from './Pivot';

/** The 3D scene is its own chunk — the page paints before three.js lands. */
const EarthScene = lazy(() => import('./EarthScene'));

/**
 * The SmartSort experience — the homepage. A living Earth, three chapters
 * of real photography, the narrative in four moves, and the pivot into
 * the product. Sections below the fold mount only as they approach the
 * viewport; the canvas is fixed behind everything.
 */
export default function ExperiencePage() {
  const [earthReady, setEarthReady] = useState(false);

  // Safety net: if the WebGL scene never reports ready, the fallback
  // photo path takes over so the page never sits on a black loader.
  useEffect(() => {
    if (earthReady) return;
    const t = setTimeout(() => setEarthReady(true), 9000);
    return () => clearTimeout(t);
  }, [earthReady]);

  return (
    <div className="exp">
      <Loader ready={earthReady} />
      <EarthScene className="exp-earth" />
      <div className="exp-content">
        <Hero />
        <Chapters />
        <Narrative />
        <Pivot />
        <ExperienceFooter />
      </div>
    </div>
  );
}

function ExperienceFooter() {
  return (
    <footer className="exp-footer">
      <span className="font-mono">SMARTSORT</span>
      <span aria-hidden className="exp-footer__dot">
        ·
      </span>
      <span className="font-mono">EVERY OBJECT HAS A NEXT LIFE</span>
      <a className="font-mono exp-footer__link" href="#/product">
        ENTER THE PLATFORM
      </a>
    </footer>
  );
}
