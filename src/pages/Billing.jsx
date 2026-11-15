import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search, Minus, Plus, ShoppingBag, Banknote, QrCode, Printer, ChevronUp, X, Check,
  ArrowRight, IndianRupee, Receipt, TrendingUp, Trash2, BadgePercent,
} from 'lucide-react';
import { db, saveBill } from '../db';
import { useApp } from '../AppContext';
import { inr, billNoStr, dateKey, categoryIcon, toneRgb, greeting } from '../lib/utils';
import { computeBill, primaryName, secondaryName } from '../lib/bill';
import { btn, input } from '../lib/ui';
import Modal from '../components/Modal';
import UpiQr from '../components/UpiQr';
import Toggle from '../components/Toggle';
import ThemeButton from '../components/ThemeButton';

function useNow(ms = 15000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const inStockLimit = (item) => (item.trackStock ? Math.max(0, item.stock || 0) : Infinity);

export default function Billing() {
  const items = useLiveQuery(() => db.items.toArray(), [], []);
  const today = dateKey();
  const todayBills = useLiveQuery(() => db.bills.where('date').equals(today).toArray(), [today], []);
  const { settings, printReceipt, toast, t, locale } = useApp();
  const now = useNow();
  const mode = settings.nameMode;

  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]);
  const [payMode, setPayMode] = useState('cash');
  const [checkout, setCheckout] = useState(false);
  const [sheet, setSheet] = useState(false);

  const active = useMemo(
    () => items.filter((i) => i.active !== 0).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    [items]
  );
  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const categories = useMemo(() => [...new Set(active.map((i) => i.category))], [active]);
  const curCat = cat === 'All' || categories.includes(cat) ? cat : 'All';
  const query = q.trim().toLowerCase();
  const shown = active.filter(
    (i) =>
      (curCat === 'All' || i.category === curCat) &&
      (!query || i.name.toLowerCase().includes(query) || (i.nameTa || '').includes(q.trim()))
  );
  const catIndex = (c) => Math.max(0, categories.indexOf(c));

  const qtyOf = (id) => cart.find((l) => l.id === id)?.qty || 0;
  const add = (it) => {
    const limit = inStockLimit(byId[it.id] || it);
    if (qtyOf(it.id) >= limit) {
      const nm = primaryName(it, mode);
      toast(limit === 0 ? t('{name} is out of stock', { name: nm }) : t('Only {n} {name} left', { n: limit, name: nm }), 'error');
      return;
    }
    setCart((c) =>
      c.some((l) => l.id === it.id)
        ? c.map((l) => (l.id === it.id ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { id: it.id, name: it.name, nameTa: it.nameTa || '', price: it.price, category: it.category, qty: 1 }]
    );
  };
  const inc = (id) => byId[id] && add(byId[id]);
  const dec = (id) => setCart((c) => c.flatMap((l) => (l.id !== id ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : [])));
  const clear = () => setCart([]);

  const taxOpts = { gstEnabled: settings.gstEnabled, gstRate: Number(settings.gstRate) || 0 };
  const calc = computeBill(cart, taxOpts);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const todayTotal = todayBills.reduce((s, b) => s + b.total, 0);
  const avg = todayBills.length ? Math.round(todayTotal / todayBills.length) : 0;
  const nextBill = (settings.lastBillNo || 0) + 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || checkout || sheet || !cart.length) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      setCheckout(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checkout, sheet, cart.length]);

  // Saves the bill only. Printing happens when the user taps "Print bill" on the success screen.
  async function complete({ payMode: pm, received, calc: finalCalc }) {
    const bill = await saveBill({ lines: cart, payMode: pm, received, calc: finalCalc });
    setCart([]);
    setSheet(false);
    return bill;
  }

  const ticket = {
    lines: cart, calc, count, nextBill, payMode, setPayMode, inc, dec, clear, catIndex, mode, t,
    gstRate: taxOpts.gstEnabled ? taxOpts.gstRate : 0,
    onCharge: () => setCheckout(true),
  };

  return (
    <div className="flex h-full">
      {/* ================= Menu ================= */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="px-4 sm:px-7 pt-5 sm:pt-7 pb-4 space-y-5">
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-white/40 tabular-nums">
                {t(greeting(now))} ·{' '}
                {now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })} ·{' '}
                {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
              <h1 className="font-display text-[28px] sm:text-[40px] leading-[1.05] font-medium tracking-tight truncate mt-1">
                {settings.shopName}
              </h1>
            </div>
            <div className="hidden md:flex gap-2.5">
              <StatCard icon={IndianRupee} label={t('Today')} value={inr(todayTotal)} gold />
              <StatCard icon={Receipt} label={t('Bills')} value={todayBills.length} />
              <StatCard icon={TrendingUp} label={t('Avg bill')} value={inr(avg)} className="hidden xl:block" />
            </div>
            <ThemeButton className="md:hidden shrink-0" />
          </div>

          <div className="flex flex-col xl:flex-row-reverse gap-3">
            <div className="relative xl:w-72 shrink-0">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('Search menu…')}
                className={`${input} h-11 pl-11 pr-10 rounded-full bg-white/[0.03]`}
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-cream">
                  <X size={17} />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {['All', ...categories].map((c) => {
                const on = curCat === c;
                const Icon = c === 'All' ? ShoppingBag : categoryIcon(c);
                const n = c === 'All' ? active.length : active.filter((i) => i.category === c).length;
                return (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`shrink-0 inline-flex items-center gap-2 h-11 pl-3.5 pr-3 rounded-full text-sm font-medium border transition cursor-pointer ${
                      on
                        ? 'bg-cream text-ink-950 border-cream shadow-[0_8px_24px_-10px_rgba(246,239,230,.5)]'
                        : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:text-cream hover:border-white/20'
                    }`}
                  >
                    <Icon size={15} />
                    {c === 'All' ? t('All') : c}
                    <span
                      className={`min-w-6 h-6 px-1.5 rounded-full text-[11px] grid place-items-center tabular-nums ${
                        on ? 'bg-ink-950/10' : 'bg-white/[0.06] text-white/40'
                      }`}
                    >
                      {n}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-7 pt-1 pb-36 lg:pb-8">
          {shown.length === 0 ? (
            <div className="h-full grid place-items-center text-center text-white/40 py-20">
              <div>
                <Search size={30} className="mx-auto mb-3 opacity-40" />
                {t('No items match “{q}”', { q })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
              {shown.map((it) => (
                <ItemCard
                  key={it.id}
                  item={it}
                  mode={mode}
                  t={t}
                  qty={qtyOf(it.id)}
                  rgb={toneRgb(catIndex(it.category))}
                  onAdd={() => add(it)}
                  onDec={() => dec(it.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= Order ticket (desktop) ================= */}
      <aside className="hidden lg:flex w-[390px] xl:w-[430px] shrink-0 p-4 xl:p-5 pl-0 xl:pl-0">
        <OrderTicket {...ticket} />
      </aside>

      {/* ================= Cart bar (mobile / tablet) ================= */}
      {count > 0 && (
        <div className="lg:hidden fixed inset-x-3 bottom-[80px] md:bottom-4 md:left-[108px] z-30 animate-pop">
          <div className="flex items-center gap-3 rounded-[22px] p-2 pl-3 bg-ink-800/95 border border-white/10 backdrop-blur-xl shadow-[0_24px_60px_-12px_var(--shadow-deep)]">
            <button onClick={() => setSheet(true)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
              <span className="relative size-11 grid place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
                <ShoppingBag size={19} />
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-gold-400 text-on-gold text-[11px] font-bold grid place-items-center">
                  {count}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xl font-medium tabular-nums leading-tight">{inr(calc.total)}</span>
                <span className="flex items-center gap-1 text-xs text-white/40">
                  {t('View order')} <ChevronUp size={13} />
                </span>
              </span>
            </button>
            <button className={`${btn.primary} h-12 px-6 rounded-2xl`} onClick={() => setCheckout(true)}>
              {t('Charge')} <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}

      <Modal open={sheet} onClose={() => setSheet(false)} bare>
        <div className="h-[80dvh] flex p-3">
          <OrderTicket {...ticket} onClose={() => setSheet(false)} />
        </div>
      </Modal>

      <Checkout
        open={checkout}
        onClose={() => setCheckout(false)}
        lines={cart}
        count={count}
        taxOpts={taxOpts}
        initialMode={payMode}
        settings={settings}
        onDone={complete}
        onReprint={printReceipt}
        t={t}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StatCard({ icon: Icon, label, value, gold, className = '' }) {
  return (
    <div
      className={`min-w-[132px] rounded-2xl px-4 py-3 border ${className} ${
        gold ? 'bg-linear-to-br from-gold-400/[0.14] to-gold-400/[0.02] border-gold-400/20' : 'bg-white/[0.025] border-white/[0.07]'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-white/40">
        <Icon size={12} className={gold ? 'text-gold-300' : ''} /> {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${gold ? 'text-gold-200' : ''}`}>{value}</div>
    </div>
  );
}

function ItemCard({ item, mode, t, qty, rgb, onAdd, onDec }) {
  const Icon = categoryIcon(item.category);
  const selected = qty > 0;
  const stock = item.trackStock ? Math.max(0, item.stock || 0) : null;
  const out = stock === 0;
  const low = stock !== null && stock > 0 && stock <= 5;
  const sub = secondaryName(item, mode);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={out}
      onClick={onAdd}
      onKeyDown={(e) => {
        if (e.key === ' ') {
          e.preventDefault();
          onAdd();
        }
      }}
      className={`group relative isolate overflow-hidden rounded-[22px] p-4 h-[138px] flex flex-col cursor-pointer select-none outline-none transition-all duration-200 border focus-visible:ring-2 focus-visible:ring-gold-400/50 ${
        out
          ? 'opacity-45 grayscale border-white/[0.06]'
          : selected
            ? 'active:scale-[.97] border-gold-400/45 shadow-[0_0_0_1px_rgba(234,181,87,.18),0_20px_44px_-20px_rgba(234,181,87,.55)]'
            : 'active:scale-[.97] border-white/[0.06] hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-22px_var(--shadow-deep)]'
      }`}
      style={{
        background: `radial-gradient(130% 95% at 100% 0%, rgba(${rgb},${selected ? 0.2 : 0.1}), transparent 58%), linear-gradient(180deg, var(--card-top) 0%, var(--card-bottom) 100%)`,
      }}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

      <div className="flex items-start justify-between gap-2">
        <span
          className="size-10 shrink-0 rounded-[14px] grid place-items-center"
          style={{ background: `rgba(${rgb},.13)`, color: `color-mix(in oklab, rgb(${rgb}) 72%, var(--color-cream))`, boxShadow: `inset 0 0 0 1px rgba(${rgb},.2)` }}
        >
          <Icon size={18} />
        </span>
        {out ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md bg-rose-400/10 text-rose-300">{t('Out of stock')}</span>
        ) : selected ? (
          <span className="size-6 rounded-full bg-gold-400 text-on-gold grid place-items-center animate-pop">
            <Check size={14} strokeWidth={3} />
          </span>
        ) : stock !== null ? (
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-md tabular-nums ${low ? 'bg-amber-400/12 text-amber-300' : 'bg-white/[0.05] text-white/40'}`}>
            {t('{n} left', { n: stock })}
          </span>
        ) : null}
      </div>

      <div className="mt-auto">
        <div className="font-medium text-[15px] leading-tight truncate">{primaryName(item, mode)}</div>
        {sub && <div className="text-xs text-white/40 truncate mt-0.5">{sub}</div>}
        <div className="mt-1.5 flex items-center justify-between h-8">
          <span className="text-[17px] font-semibold tabular-nums text-gold-300">{inr(item.price)}</span>
          {selected ? (
            <div
              className="flex items-center rounded-full bg-ink-950/85 border border-white/10 p-0.5 animate-pop"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onDec}
                className="size-7 grid place-items-center rounded-full text-white/70 hover:text-cream hover:bg-white/10 active:scale-90 transition"
                aria-label={`Remove one ${item.name}`}
              >
                <Minus size={13} strokeWidth={2.6} />
              </button>
              <span className="w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
              <button
                onClick={onAdd}
                className="size-7 grid place-items-center rounded-full bg-gold-400 text-on-gold active:scale-90 transition"
                aria-label={`Add one ${item.name}`}
              >
                <Plus size={13} strokeWidth={2.8} />
              </button>
            </div>
          ) : !out ? (
            <span className="size-8 grid place-items-center rounded-full bg-white/[0.06] text-white/45 group-hover:bg-gold-400 group-hover:text-on-gold transition">
              <Plus size={15} strokeWidth={2.4} />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OrderTicket({ lines, calc, count, nextBill, payMode, setPayMode, inc, dec, clear, catIndex, mode, t, gstRate, onCharge, onClose }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col rounded-[28px] bg-linear-to-b from-(--ticket-top) to-(--ticket-bottom) border border-white/[0.08] shadow-[0_40px_90px_-30px_var(--shadow-deep)] overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">{t('New order')}</div>
          <div className="font-display text-3xl font-medium tracking-tight mt-0.5 tabular-nums">{billNoStr(nextBill)}</div>
        </div>
        <div className="flex items-center gap-1">
          {lines.length > 0 && (
            <button
              onClick={clear}
              className="inline-flex items-center gap-1.5 text-xs font-medium h-8 px-3 rounded-full text-white/45 hover:text-rose-300 hover:bg-rose-400/10 transition"
            >
              <Trash2 size={13} /> {t('Clear')}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="size-8 grid place-items-center rounded-full text-white/50 hover:bg-white/10" aria-label="Close">
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3">
        {lines.length === 0 ? (
          <div className="h-full grid place-items-center text-center px-8">
            <div>
              <div className="relative mx-auto size-20">
                <div className="absolute inset-0 rounded-[26px] bg-gold-400/10 blur-xl" />
                <div className="relative size-20 rounded-[26px] grid place-items-center bg-white/[0.03] border border-white/[0.08] text-gold-300/70">
                  <ShoppingBag size={30} strokeWidth={1.6} />
                </div>
              </div>
              <p className="mt-5 font-display text-xl text-white/80">{t('Ready for an order')}</p>
              <p className="text-sm text-white/35 mt-1">{t('Tap items on the menu to start a bill')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {lines.map((l) => {
              const rgb = toneRgb(catIndex(l.category));
              const sub = secondaryName(l, mode);
              return (
                <div key={l.id} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.03] transition animate-fade">
                  <span className="size-1.5 rounded-full shrink-0" style={{ background: `rgb(${rgb})` }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{primaryName(l, mode)}</div>
                    <div className="text-xs text-white/35 tabular-nums truncate">
                      {sub ? `${sub} · ` : ''}
                      {t('{price} each', { price: inr(l.price) })}
                    </div>
                  </div>
                  <div className="flex items-center rounded-full bg-black/30 light:bg-white/[0.05] border border-white/[0.07] p-0.5">
                    <button onClick={() => dec(l.id)} className="size-7 grid place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-cream active:scale-90 transition">
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="w-7 text-center tabular-nums font-semibold text-sm">{l.qty}</span>
                    <button onClick={() => inc(l.id)} className="size-7 grid place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-cream active:scale-90 transition">
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="w-16 text-right tabular-nums font-semibold">{inr(l.price * l.qty)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative h-8 flex items-center shrink-0">
        <span className="absolute -left-4 size-8 rounded-full bg-ink-950 border border-white/[0.08]" />
        <div className="mx-6 flex-1 border-t-2 border-dashed border-white/[0.09]" />
        <span className="absolute -right-4 size-8 rounded-full bg-ink-950 border border-white/[0.08]" />
      </div>

      <div className="px-6 pb-6 space-y-4">
        {calc.tax && (
          <div className="space-y-1 text-sm text-white/45">
            <div className="flex justify-between">
              <span>{t('Subtotal')}</span>
              <span className="tabular-nums">{inr(calc.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST {gstRate}%</span>
              <span className="tabular-nums">{inr(calc.tax.amount)}</span>
            </div>
          </div>
        )}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">{t('Total')}</div>
            <div className="text-xs text-white/35 mt-1">{count === 1 ? t('1 item') : t('{n} items', { n: count })}</div>
          </div>
          <div className="font-display text-[44px] leading-none font-medium tracking-tight tabular-nums text-transparent bg-clip-text bg-linear-to-b from-gold-200 to-gold-400">
            {inr(calc.total)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-black/30 light:bg-white/[0.05] border border-white/[0.06]">
          {[
            ['cash', 'Cash', Banknote],
            ['upi', 'UPI', QrCode],
          ].map(([id, lbl, Icon]) => (
            <button
              key={id}
              onClick={() => setPayMode(id)}
              className={`h-10 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-medium transition cursor-pointer ${
                payMode === id ? 'bg-white/[0.09] text-cream shadow-inner ring-1 ring-white/10' : 'text-white/40 hover:text-cream'
              }`}
            >
              <Icon size={16} className={payMode === id ? 'text-gold-300' : ''} /> {t(lbl)}
            </button>
          ))}
        </div>

        <button disabled={!lines.length} onClick={onCharge} className={`${btn.primary} group w-full h-14 text-base rounded-2xl justify-between px-6`}>
          <span>{lines.length ? t('Charge {amt}', { amt: inr(calc.total) }) : t('Charge')}</span>
          <span className="flex items-center gap-2 text-on-gold/60 text-xs font-semibold">
            <kbd className="hidden lg:inline px-1.5 py-0.5 rounded-md bg-on-gold/10 border border-on-gold/15">Enter</kbd>
            <ArrowRight size={18} className="text-on-gold group-hover:translate-x-0.5 transition" />
          </span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Checkout({ open, onClose, lines, count, taxOpts, initialMode, settings, onDone, onReprint, t }) {
  const [mode, setMode] = useState('cash');
  const [received, setReceived] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [discOpen, setDiscOpen] = useState(false);
  const [discType, setDiscType] = useState('amt');
  const [discValue, setDiscValue] = useState('');

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setReceived('');
      setDone(null);
      setDiscOpen(false);
      setDiscType('amt');
      setDiscValue('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const calc = computeBill(lines, { ...taxOpts, discount: { type: discType, value: Number(discValue) || 0 } });
  const total = calc.total;
  const rec = Number(received) || 0;
  const change = rec - total;
  const quick = [...new Set([total, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, 200, 500])]
    .filter((v) => v >= total && v > 0)
    .sort((a, b) => a - b)
    .slice(0, 4);
  const canPay = lines.length > 0 && (mode === 'upi' || !received || rec >= total);
  const hasBreakup = calc.discount || calc.tax || calc.roundOff;

  async function submit() {
    if (!canPay || busy || done) return;
    setBusy(true);
    try {
      setDone(await onDone({ payMode: mode, received: mode === 'cash' && rec ? rec : null, calc }));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const bal = done.received ? done.received - done.total : 0;
    return (
      <Modal open={open} onClose={onClose} size="sm">
        <div className="text-center pt-8">
          <div className="relative mx-auto size-24">
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative size-24 rounded-full grid place-items-center bg-linear-to-b from-emerald-300 to-emerald-500 text-on-gold shadow-[0_20px_50px_-15px_rgba(52,211,153,.7)] animate-pop">
              <Check size={44} strokeWidth={3} />
            </div>
          </div>
          <h3 className="mt-6 font-display text-3xl font-medium tracking-tight">{t('Payment received')}</h3>
          <p className="mt-1.5 text-sm text-white/45 tabular-nums">
            {t('Bill')} {billNoStr(done.billNo)} · {done.payMode === 'upi' ? 'UPI' : t('Cash')} · {t('{n} items', { n: done.itemCount })}
          </p>
          <div className="mt-5 font-display text-5xl font-medium tabular-nums text-gold-300">{inr(done.total)}</div>
          {done.discount && <p className="mt-1 text-xs text-emerald-300">{t('Saved {amt} with discount', { amt: inr(done.discount.amount) })}</p>}

          {bal > 0 && (
            <div className="mt-5 flex items-center justify-between rounded-2xl px-5 py-4 bg-emerald-400/[0.08] border border-emerald-400/20 text-left">
              <span className="text-sm text-white/65">{t('Return balance')}</span>
              <span className="text-2xl font-semibold tabular-nums text-emerald-300">{inr(bal)}</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button className={`${btn.ghost} h-12`} onClick={() => onReprint(done)}>
              <Printer size={17} /> {t('Print bill')}
            </button>
            <button className={`${btn.primary} h-12`} onClick={onClose} autoFocus>
              {t('New order')}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={t('Collect payment')} subtitle={t('{n} items', { n: count })}>
      <div className="text-center pt-1 pb-2">
        <div className="font-display text-6xl font-medium tracking-tight tabular-nums text-transparent bg-clip-text bg-linear-to-b from-gold-200 to-gold-400">
          {inr(total)}
        </div>
        {hasBreakup ? (
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-white/40 tabular-nums">
            <span>{t('Subtotal')} {inr(calc.subtotal)}</span>
            {calc.discount && <span className="text-emerald-300">− {t('Discount')} {inr(calc.discount.amount)}</span>}
            {calc.tax && <span>+ GST {calc.tax.rate}% {inr(calc.tax.amount)}</span>}
            {calc.roundOff ? <span>{t('Round off')} {calc.roundOff > 0 ? '+' : '−'}{inr(Math.abs(calc.roundOff))}</span> : null}
          </div>
        ) : null}
      </div>

      {/* discount */}
      <div className="mt-3">
        {!discOpen ? (
          <button
            onClick={() => setDiscOpen(true)}
            className="w-full h-10 rounded-xl border border-dashed border-white/15 text-sm text-white/55 hover:text-gold-300 hover:border-gold-400/40 inline-flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <BadgePercent size={16} /> {t('Add discount')}
          </button>
        ) : (
          <div className="rounded-2xl p-3 bg-white/[0.03] border border-white/[0.07] space-y-2.5 animate-fade">
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 rounded-lg bg-black/30 light:bg-white/[0.05] border border-white/[0.06]">
                {[
                  ['amt', '₹'],
                  ['pct', '%'],
                ].map(([id, lbl]) => (
                  <button
                    key={id}
                    onClick={() => setDiscType(id)}
                    className={`w-10 h-9 rounded-md text-sm font-semibold transition cursor-pointer ${discType === id ? 'bg-cream text-ink-950' : 'text-white/50'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={discValue}
                onChange={(e) => setDiscValue(e.target.value)}
                placeholder={discType === 'pct' ? t('Discount %') : t('Discount ₹')}
                className={`${input} h-10 flex-1 tabular-nums`}
                autoFocus
              />
              <button
                onClick={() => {
                  setDiscValue('');
                  setDiscOpen(false);
                }}
                className={btn.icon}
                aria-label={t('Remove discount')}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-1.5">
              {(discType === 'pct' ? [5, 10, 15, 20] : [2, 5, 10, 20]).map((v) => (
                <button
                  key={v}
                  onClick={() => setDiscValue(String(v))}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    Number(discValue) === v ? 'bg-gold-400/15 border-gold-400/40 text-gold-200' : 'border-white/10 text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  {discType === 'pct' ? `${v}%` : `₹${v}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-black/30 light:bg-white/[0.05] border border-white/[0.06]">
        {[
          ['cash', 'Cash', Banknote],
          ['upi', 'UPI', QrCode],
        ].map(([id, lbl, Icon]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`h-11 rounded-xl inline-flex items-center justify-center gap-2 font-medium transition cursor-pointer ${
              mode === id ? 'bg-cream text-ink-950 shadow' : 'text-white/50 hover:text-cream'
            }`}
          >
            <Icon size={18} /> {t(lbl)}
          </button>
        ))}
      </div>

      <div className="mt-5 min-h-[214px]">
        {mode === 'cash' ? (
          <div className="space-y-3">
            <label className="block text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">{t('Cash received · optional')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-white/30">₹</span>
              <input
                type="number"
                inputMode="numeric"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), submit())}
                placeholder={String(total)}
                className={`${input} h-14 pl-10 text-2xl font-semibold tabular-nums rounded-2xl`}
                autoFocus={!discOpen}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {quick.map((v) => (
                <button
                  key={v}
                  onClick={() => setReceived(String(v))}
                  className={`h-10 rounded-xl text-sm font-medium tabular-nums border transition cursor-pointer ${
                    rec === v ? 'bg-gold-400/15 border-gold-400/40 text-gold-200' : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.07]'
                  }`}
                >
                  ₹{v}
                </button>
              ))}
            </div>
            {received !== '' && (
              <div
                className={`flex items-center justify-between rounded-2xl px-4 py-3 border animate-fade ${
                  change >= 0 ? 'bg-emerald-400/[0.07] border-emerald-400/20' : 'bg-rose-400/[0.07] border-rose-400/20'
                }`}
              >
                <span className="text-sm text-white/60">{change >= 0 ? t('Balance to return') : t('Amount short')}</span>
                <span className={`text-xl font-semibold tabular-nums ${change >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {inr(Math.abs(change))}
                </span>
              </div>
            )}
          </div>
        ) : settings.upiId ? (
          <div className="flex flex-col items-center">
            <UpiQr upiId={settings.upiId} name={settings.upiName || settings.shopName} amount={total} note="Tea shop bill" size={190} />
            <p className="mt-3 text-sm text-white/55 text-center">{t('Scan with GPay, PhonePe, Paytm or any UPI app')}</p>
            <p className="text-xs text-white/30 mt-0.5">{settings.upiId}</p>
          </div>
        ) : (
          <div className="h-[214px] grid place-items-center text-center rounded-2xl border border-dashed border-white/10 px-6">
            <div>
              <QrCode size={30} className="mx-auto text-white/25" />
              <p className="mt-3 text-sm text-white/60">{t('UPI ID not set')}</p>
              <p className="text-xs text-white/35 mt-1">{t('Add your UPI ID in Settings to show a QR here. You can still save this bill as UPI.')}</p>
            </div>
          </div>
        )}
      </div>

      <button onClick={submit} disabled={!canPay || busy} className={`${btn.primary} mt-4 w-full h-14 text-base rounded-2xl`}>
        <Check size={18} strokeWidth={2.6} />
        {mode === 'upi' ? t('Mark as paid') : t('Complete sale')} · {inr(total)}
      </button>
    </Modal>
  );
}
