import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Store,
  ListPlus,
  ArrowLeftRight,
  Truck,
  ChartColumn,
  Leaf,
  Settings,
  HelpCircle,
  Menu,
  X,
  Building2,
  Factory,
} from 'lucide-react';
import { Logo } from '../components/Navbar';

type Role = 'generator' | 'recycler';

const NAV: Record<Role, Array<{ label: string; hash: string; icon: typeof LayoutDashboard }>> = {
  generator: [
    { label: 'Overview', hash: '#/dashboard', icon: LayoutDashboard },
    { label: 'Marketplace', hash: '#/marketplace', icon: Store },
    { label: 'Listings', hash: '#/create-listing', icon: ListPlus },
    { label: 'Transactions', hash: '#/transactions', icon: ArrowLeftRight },
    { label: 'Pickups', hash: '#/transactions', icon: Truck },
    { label: 'Analytics', hash: '#/analytics', icon: ChartColumn },
    { label: 'Impact', hash: '#/impact', icon: Leaf },
  ],
  recycler: [
    { label: 'Overview', hash: '#/recycler', icon: LayoutDashboard },
    { label: 'Marketplace', hash: '#/marketplace', icon: Store },
    { label: 'Active bids', hash: '#/recycler', icon: ArrowLeftRight },
    { label: 'Purchased waste', hash: '#/transactions', icon: ListPlus },
    { label: 'Pickup schedule', hash: '#/transactions', icon: Truck },
    { label: 'Analytics', hash: '#/analytics', icon: ChartColumn },
    { label: 'Impact', hash: '#/impact', icon: Leaf },
  ],
};

function SidebarContent({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-line px-5">
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = '#/';
            onNavigate?.();
          }}
          aria-label="SmartSort home"
        >
          <Logo size={20} />
        </a>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Dashboard">
        {NAV[role].map((item) => {
          const active = window.location.hash === item.hash;
          return (
            <a
              key={item.label}
              href={item.hash}
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = item.hash;
                onNavigate?.();
              }}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-accent-soft font-medium text-accent' : 'text-ink-soft hover:bg-white/5 hover:text-ink'
              }`}
            >
              <item.icon size={16} strokeWidth={1.8} aria-hidden />
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="border-t border-line px-3 py-4">
        <a href="#/dashboard" onClick={(e) => { e.preventDefault(); window.location.hash = '#/dashboard'; onNavigate?.(); }} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-white/5 hover:text-ink">
          <Settings size={16} strokeWidth={1.8} aria-hidden /> Settings
        </a>
        <a href="#/dashboard" onClick={(e) => { e.preventDefault(); window.location.hash = '#/dashboard'; onNavigate?.(); }} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-white/5 hover:text-ink">
          <HelpCircle size={16} strokeWidth={1.8} aria-hidden /> Help
        </a>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-surface-2/60 p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-accent-line bg-accent-soft text-accent" aria-hidden>
            {role === 'generator' ? <Building2 size={16} /> : <Factory size={16} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">
              {role === 'generator' ? 'Prestige Falcon City' : 'PETVerse Plastics'}
            </p>
            <p className="truncate text-[11px] text-ink-faint">
              {role === 'generator' ? 'Generator · Bengaluru' : 'Verified recycler'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Authenticated shell: fixed sidebar on desktop, drawer on mobile. */
export function DashboardLayout({
  role,
  title,
  actions,
  children,
}: {
  role: Role;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // close drawer + scroll to top on route change
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [typeof window !== 'undefined' ? window.location.hash : '']);

  return (
    <div className="min-h-dvh bg-void">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-surface/60 backdrop-blur lg:block">
        <SidebarContent role={role} />
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface">
            <button
              className="absolute right-2 top-4 rounded p-1.5 text-ink-faint hover:text-ink"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
            <SidebarContent role={role} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-void/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 text-ink lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu size={19} />
            </button>
            <h1 className="font-display text-[16px] font-semibold tracking-tight text-ink">{title}</h1>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
