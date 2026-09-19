import { useEffect, useRef, useState } from 'react';

/**
 * Opening sequence: black screen, the wordmark tracking into place while
 * the Earth textures load, then a slow fade. Never blocks more than
 * `maxWait` — the show goes on regardless.
 */
export default function Loader({ ready, maxWait = 4500 }: { ready: boolean; maxWait?: number }) {
  const [gone, setGone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dots, setDots] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 420);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (ready || Date.now() - start.current > maxWait) {
      setGone(true);
      const t = setTimeout(() => setHidden(true), 1400); // match CSS fade
      return () => clearTimeout(t);
    }
  }, [ready, maxWait]);

  if (hidden) return null;
  return (
    <div className={`exp-loader${gone ? ' exp-loader--gone' : ''}`} aria-hidden={gone}>
      <div className="exp-loader__inner">
        <span className="exp-loader__mark">SMARTSORT</span>
        <span className="exp-loader__line" />
        <span className="exp-loader__hint font-mono">
          {gone ? 'entering orbit' : `calibrating orbit${'.'.repeat(dots)}`}
        </span>
      </div>
    </div>
  );
}
