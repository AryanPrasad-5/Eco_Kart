import { Component, Suspense, lazy, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { Button } from '../ui/Button';

const HeroScene = lazy(() => import('../HeroScene'));

/** The 3D layer is pure enhancement — any failure renders nothing. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-20 sm:pt-40" aria-labelledby="hero-heading">
      {/* backdrop: engineering grid + emerald horizon */}
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-accent-soft to-transparent"
        aria-hidden
      />
      <div
        className="absolute left-1/2 top-[-320px] h-[640px] w-[880px] -translate-x-1/2 rounded-full bg-accent-soft blur-[140px]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1 pr-3 text-xs text-ink-soft backdrop-blur"
          >
            <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-void">
              LIVE
            </span>
            <span className="tabular">
              142 listings open · last trade 2h ago
            </span>
          </motion.div>

          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease }}
            className="mt-6 font-display text-[clamp(2.6rem,6.4vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.03em]"
          >
            <span className="block text-ink">WASTE ISN'T WASTE.</span>
            <span className="text-shine block">IT'S INVENTORY.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease }}
            className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-soft"
          >
            Turn recyclable materials into measurable economic value. SmartSort connects waste generators with
            verified recyclers through a transparent digital marketplace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button size="lg" onClick={() => (window.location.hash = '#/create-listing')} icon={<ArrowRight size={16} />}>
              List Your Waste
            </Button>
            <Button size="lg" variant="outline" onClick={() => (window.location.hash = '#/marketplace')}>
              Explore Marketplace
            </Button>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6"
          >
            {[
              ['Settlement', 'T+2 days'],
              ['Buyers', 'Verified only'],
              ['Pricing', 'Live index'],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">{term}</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* 3D sculpture — enhancement only */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease }}
          className="relative mx-auto hidden h-[440px] w-full max-w-[520px] sm:block lg:h-[500px]"
        >
          <div className="absolute inset-x-8 bottom-6 h-24 rounded-full bg-accent-soft blur-2xl" aria-hidden />
          <div className="relative h-full w-full">
            <SceneBoundary>
              <Suspense fallback={null}>
                <HeroScene />
              </Suspense>
            </SceneBoundary>
          </div>
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1 font-mono text-[10.5px] text-ink-faint backdrop-blur">
            <BarChart3 size={11} aria-hidden />
            materials exchange · live index
          </div>
        </motion.div>
      </div>
    </section>
  );
}
