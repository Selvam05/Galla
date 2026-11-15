import { useEffect, useState } from 'react';
import { LayoutGrid, Package, Receipt, TrendingUp, Settings as SettingsIcon, Coffee, Wallet } from 'lucide-react';
import { AppProvider, useApp } from './AppContext';
import ThemeButton from './components/ThemeButton';
import Billing from './pages/Billing';
import Items from './pages/Items';
import Bills from './pages/Bills';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const PAGES = [
  { id: 'billing', label: 'Billing', icon: LayoutGrid, Component: Billing },
  { id: 'bills', label: 'Bills', icon: Receipt, Component: Bills },
  { id: 'expenses', label: 'Expenses', icon: Wallet, Component: Expenses },
  { id: 'reports', label: 'Reports', icon: TrendingUp, Component: Reports },
  { id: 'items', label: 'Items', icon: Package, Component: Items },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, Component: Settings },
];

function initialPage() {
  try {
    const p = localStorage.getItem('chai-pos:page');
    return PAGES.some((x) => x.id === p) ? p : 'billing';
  } catch {
    return 'billing';
  }
}

export default function App() {
  const [page, setPage] = useState(initialPage);
  useEffect(() => {
    try {
      localStorage.setItem('chai-pos:page', page);
    } catch {}
  }, [page]);

  return (
    <AppProvider>
      <Shell page={page} setPage={setPage} />
    </AppProvider>
  );
}

function Shell({ page, setPage }) {
  const { t } = useApp();
  const { Component } = PAGES.find((p) => p.id === page);

  return (
      <div className="flex h-full">
        {/* Desktop / tablet rail */}
        <aside className="hidden md:flex w-[96px] shrink-0 flex-col items-center gap-2 py-5 border-r border-white/[0.06] bg-ink-900/50 backdrop-blur">
          <div className="mb-5 size-12 rounded-2xl grid place-items-center bg-linear-to-br from-gold-300 to-gold-600 text-on-gold shadow-[0_10px_30px_-8px_rgba(234,181,87,.6)]">
            <Coffee size={24} strokeWidth={2.2} />
          </div>
          <div className="-mt-3 mb-3 font-display text-[15px] font-medium tracking-tight text-gold-300">Galla</div>
          {PAGES.map(({ id, label, icon: Icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`relative w-[76px] flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[11px] font-medium transition cursor-pointer ${
                  active ? 'bg-gold-400/10 text-gold-300' : 'text-white/45 hover:text-cream hover:bg-white/[0.04]'
                }`}
              >
                {active && <span className="absolute -left-[10px] top-3 bottom-3 w-1 rounded-r-full bg-gold-400" />}
                <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                <span className="max-w-full truncate px-1">{t(label)}</span>
              </button>
            );
          })}
          <ThemeButton className="mt-auto" />
        </aside>

        <main key={page} className="flex-1 min-w-0 h-full overflow-hidden pb-[68px] md:pb-0 animate-fade">
          <Component />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-[68px] pb-[env(safe-area-inset-bottom)] grid grid-cols-6 border-t border-white/[0.06] bg-ink-900/90 backdrop-blur-xl">
          {PAGES.map(({ id, label, icon: Icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
                  active ? 'text-gold-300' : 'text-white/40'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
                <span className="max-w-full truncate px-0.5">{t(label)}</span>
              </button>
            );
          })}
        </nav>
      </div>
  );
}
