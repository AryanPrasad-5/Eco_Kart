import { Reveal } from './Reveal';
import { CountUp } from './CountUp';

/**
 * Landing experience (EcoLafaek-inspired): cinematic dark hero with aurora
 * glow, animated live-stats band, the challenge, numbered feature grid,
 * the SmartSort journey pipeline, the AWS tech strip, and a closing CTA.
 * Every number is real — no fabricated accuracy claims.
 */

const FEATURES = [
  {
    n: '01',
    icon: '🧠',
    title: 'AI material identification',
    body: 'Amazon Bedrock Nova Lite reads the photo and classifies the material — plastic, paper, metal, glass, e-waste, organic, or other — with a plain-language rationale.',
  },
  {
    n: '02',
    icon: '✋',
    title: 'Human-in-the-loop confirm',
    body: 'The AI signal is a first guess, never a verdict. One tap confirms or corrects the category — and corrections go straight to matching without re-running the AI.',
  },
  {
    n: '03',
    icon: '📍',
    title: 'Location, handled honestly',
    body: 'Browser GPS with a 10-second timeout. Deny it, lose signal, or go indoors — a clearly labeled demo location keeps the experience flowing.',
  },
  {
    n: '04',
    icon: '⚖️',
    title: 'Transparent ranking',
    body: 'Facilities ranked by a published formula: 60% distance, 30% estimated value, 10% verification trust. No black boxes — the factors are shown, the math is tested.',
  },
  {
    n: '05',
    icon: '🗺️',
    title: 'List-first map',
    body: 'Results work perfectly with zero maps, zero GPS, zero AI. The map — MapLibre + Amazon Location — is an enhancement that degrades gracefully, never a gate.',
  },
  {
    n: '06',
    icon: '🤝',
    title: 'Estimates, never offers',
    body: 'Every payout carries the same disclaimer: indicative market estimate — not an offer. Trust is the product; we don’t fake precision we don’t have.',
  },
] as const;

const JOURNEY = [
  { icon: '📷', title: 'Capture', body: 'Point your camera at any waste item — no app install, just the browser.' },
  { icon: '🧠', title: 'Identify', body: 'The AI reads material composition and shows its reasoning.' },
  { icon: '✅', title: 'Confirm', body: 'You approve or correct the category — you stay in control.' },
  { icon: '📍', title: 'Discover', body: 'Ranked nearby facilities with distance, hours, and estimated value.' },
] as const;

const AWS_STACK = [
  'Amazon Bedrock · Nova Lite',
  'API Gateway',
  'AWS Lambda',
  'Amazon DynamoDB',
  'Amazon S3',
  'Amazon Location Service',
  'AWS Amplify Hosting',
] as const;

const CHALLENGE = [
  {
    stat: '?',
    title: '“What even is this?”',
    body: 'People can’t tell which material an item is made of — so segregation at source fails first.',
  },
  {
    stat: '↗',
    title: '“Where do I take it?”',
    body: 'Even motivated households have no discovery mechanism for nearby recyclers and scrap buyers.',
  },
  {
    stat: '₹',
    title: '“Is it worth anything?”',
    body: 'Without visible value, recyclables land in landfills — missed income for people and collectors.',
  },
] as const;

export function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="landing fade-in">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-landing">
        <div className="aurora" aria-hidden>
          <span className="a1" /><span className="a2" /><span className="a3" />
        </div>
        <div className="grain" aria-hidden />

        <Reveal className="hero-inner">
          <p className="eyebrow">
            ♻️ First Commit · WeMakeDevs Hackathon · Sept 2026
          </p>
          <h1 className="hero-title">
            A cleaner city,
            <br />
            <span className="grad-text">one scan at a time.</span>
          </h1>
          <p className="hero-sub">
            SmartSort turns “throw it away” into an actionable, location-aware decision —
            identify the material, find the facility that accepts it, and see what it’s
            worth. Before it ever reaches a landfill.
          </p>
          <div className="hero-ctas">
            <button className="btn btn-scan" onClick={onEnterApp}>
              📷 Scan your first item
            </button>
            <button className="btn btn-outline-light" onClick={() => scrollTo('features')}>
              Explore the platform ↓
            </button>
          </div>
          <div className="hero-pills">
            <span className="h-pill">⚡ React + Vite</span>
            <span className="h-pill">🧠 Amazon Bedrock</span>
            <span className="h-pill">🏆 Hackathon MVP build</span>
          </div>
        </Reveal>
      </section>

      {/* ── Marquee ──────────────────────────────────────────── */}
      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...Array(2)].flatMap((_, r) =>
            ['WASTE → IDENTIFICATION → LOCATION → FACILITY → VALUE', ' · ', 'NOT AN OFFER — JUST HONEST ESTIMATES', ' · ', 'BUILT FOR THE STREETS OF BENGALURU', ' · '].map((t, i) => (
              <span key={`${r}-${i}`} className={t.includes('→') || t.includes('BUILT') ? 'mq-strong' : ''}>{t}</span>
            )),
          )}
        </div>
      </div>

      {/* ── Live stats ───────────────────────────────────────── */}
      <section className="stats-band">
        <div className="stats-grid">
          {[
            { to: 7, label: 'material categories', suffix: '' },
            { to: 14, label: 'facilities mapped', suffix: '' },
            { to: 5, label: 'ranked options per scan', suffix: '' },
            { to: 100, label: 'estimates clearly labeled', suffix: '%' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 90} className="stat">
              <div className="stat-num"><CountUp to={s.to} suffix={s.suffix} /></div>
              <div className="stat-label">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Challenge ────────────────────────────────────────── */}
      <section className="section" id="challenge">
        <Reveal>
          <p className="kicker">The challenge</p>
          <h2 className="section-title">
            Recyclable waste doesn’t vanish.
            <br />
            <span className="grad-text">It just gets lost.</span>
          </h2>
        </Reveal>
        <div className="challenge-grid">
          {CHALLENGE.map((c, i) => (
            <Reveal key={c.title} delay={i * 110} className="card challenge-card">
              <div className="challenge-stat" aria-hidden>{c.stat}</div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="section" id="features">
        <Reveal>
          <p className="kicker">What we offer</p>
          <h2 className="section-title">
            Powerful features,
            <br />
            <span className="grad-text">built for real streets.</span>
          </h2>
        </Reveal>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.n} delay={(i % 3) * 100} className="card feature-card">
              <div className="feature-top">
                <span className="feature-n">{f.n}</span>
                <span className="feature-icon" aria-hidden>{f.icon}</span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Journey ──────────────────────────────────────────── */}
      <section className="section" id="journey">
        <Reveal>
          <p className="kicker">Our solution</p>
          <h2 className="section-title">
            From waste to worth,
            <br />
            <span className="grad-text">in four steps.</span>
          </h2>
        </Reveal>
        <div className="journey-grid">
          {JOURNEY.map((j, i) => (
            <Reveal key={j.title} delay={i * 110} className="journey-step">
              <div className="journey-icon" aria-hidden>{j.icon}</div>
              {i < JOURNEY.length - 1 && <div className="journey-line" aria-hidden />}
              <h3>{j.title}</h3>
              <p>{j.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── AWS stack ────────────────────────────────────────── */}
      <section className="section stack-section">
        <Reveal>
          <p className="kicker">Under the hood</p>
          <h2 className="section-title">Built the AWS way.</h2>
          <div className="stack-chips">
            {AWS_STACK.map((s, i) => (
              <Reveal key={s} delay={i * 60} as="span" className="stack-chip">{s}</Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section className="cta-band">
        <div className="aurora small" aria-hidden>
          <span className="a1" /><span className="a2" />
        </div>
        <Reveal className="cta-inner">
          <h2>Be part of a cleaner city.</h2>
          <p>Scan an item. Confirm the material. Find where it’s worth something.</p>
          <div className="hero-ctas center">
            <button className="btn btn-scan" onClick={onEnterApp}>📷 Scan Waste</button>
            <button className="btn btn-outline-light" onClick={() => scrollTo('features')}>
              See how it works
            </button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
