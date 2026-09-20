import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Button } from './ui/Button';
import { navigate } from '../hooks/useHashRoute';

const LINKS = [
  { label: 'The Story', hash: '#/' },
  { label: 'Marketplace', hash: '#/marketplace' },
  { label: 'How It Works', anchor: '#how-it-works' },
  { label: 'For Businesses', anchor: '#for-businesses' },
  { label: 'Impact', hash: '#/impact' },
] as const;

function scrollToAnchor(anchor: string) {
  const hash = window.location.hash;
  // product-page anchors only scroll directly when already on #/product
  if (hash && hash !== '#/product') {
    window.location.hash = '#/product';
    window.setTimeout(() => document.querySelector(anchor)?.scrollIntoView({ behavior: 'smooth' }), 60);
  } else {
    document.querySelector(anchor)?.scrollIntoView({ behavior: 'smooth' });
  }
}

/** Wordmark — an S cut from a sorting frame. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="grid place-items-center rounded-[6px] border border-accent-line bg-accent-soft font-display font-bold text-accent"
        style={{ width: size + 8, height: size + 8, fontSize: size * 0.62 }}
        aria-hidden
      >
        S
      </span>
      <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
        Smart<span className="text-accent">Sort</span>
      </span>
    </span>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (link: (typeof LINKS)[number]) => {
    setOpen(false);
    if ('anchor' in link) scrollToAnchor(link.anchor);
    else {
      window.location.hash = link.hash;
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-line bg-void/80 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface-2 focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Main">
        <a
          href="#/product"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = '#/product';
            window.scrollTo({ top: 0 });
          }}
          aria-label="SmartSort home"
        >
          <Logo />
        </a>

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => go(link)}
              className="rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" size="sm" onClick={() => (window.location.hash = '#/dashboard')}>
            Sign In
          </Button>
          <Button size="sm" icon={<ArrowUpRight size={14} />} onClick={() => (window.location.hash = '#/create-listing')}>
            Get Started
          </Button>
        </div>

        <button
          className="rounded-md p-2 text-ink lg:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-b border-line bg-void/95 backdrop-blur-xl lg:hidden"
          >
            <div className="space-y-1 px-5 py-4">
              {LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => go(link)}
                  className="block w-full rounded-md px-3 py-2.5 text-left text-[15px] text-ink-soft transition-colors hover:bg-white/5 hover:text-ink"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex gap-2 pt-3">
                <Button variant="secondary" className="flex-1" onClick={() => (window.location.hash = '#/dashboard')}>
                  Sign In
                </Button>
                <Button className="flex-1" onClick={() => (window.location.hash = '#/create-listing')}>
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export { navigate };
