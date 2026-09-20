/**
 * Opening frame — one sentence over the living planet, then the mark.
 * The scroll cue is the only invitation the page gives; the Earth does
 * the rest.
 */
export default function Hero() {
  return (
    <section className="exp-hero" aria-label="SmartSort — look after it">
      <p className="exp-hero__kicker font-mono">IN ORBIT SINCE 2026 · BENGALURU</p>
      <h1 className="exp-hero__title">
        Look after it.
      </h1>
      <p className="exp-hero__sub">
        SmartSort — every object has a next life.
      </p>
      <a className="exp-hero__cue" href="#life" aria-label="Scroll to the story">
        <span className="exp-hero__cue-line" aria-hidden />
        <span className="font-mono">SCROLL</span>
      </a>
    </section>
  );
}
