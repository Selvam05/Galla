import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { IndianRupee, Receipt, TrendingUp, Wallet, FileSpreadsheet } from 'lucide-react';
import { db } from '../db';
import { useApp } from '../AppContext';
import { inr, dateKey, addDays, parseKey } from '../lib/utils';
import { exportReport } from '../lib/excel';
import { btn, card } from '../lib/ui';
import PageHeader from '../components/PageHeader';

const PRESETS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['month', 'This month'],
];

function rangeFor(p) {
  const t = new Date();
  switch (p) {
    case 'yesterday': {
      const y = dateKey(addDays(t, -1));
      return [y, y];
    }
    case '7d':
      return [dateKey(addDays(t, -6)), dateKey(t)];
    case '30d':
      return [dateKey(addDays(t, -29)), dateKey(t)];
    case 'month':
      return [dateKey(new Date(t.getFullYear(), t.getMonth(), 1)), dateKey(t)];
    default:
      return [dateKey(t), dateKey(t)];
  }
}

export default function Reports() {
  const [preset, setPreset] = useState('today');
  const [from, to] = rangeFor(preset);
  const bills = useLiveQuery(() => db.bills.where('date').between(from, to, true, true).toArray(), [from, to], []);
  const expenses = useLiveQuery(() => db.expenses.where('date').between(from, to, true, true).toArray(), [from, to], []);
  const { settings, toast, t, locale } = useApp();
  const fd = (k) => parseKey(k).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const [exporting, setExporting] = useState(false);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const discounts = bills.reduce((s, b) => s + (b.discount?.amount || 0), 0);
  const gst = bills.reduce((s, b) => s + (b.tax?.amount || 0), 0);

  async function doExport() {
    setExporting(true);
    try {
      await exportReport({ shopName: settings.shopName, from, to, bills, expenses });
      toast(t('Excel report downloaded'));
    } catch (e) {
      console.error(e);
      toast(t('Export failed'), 'error');
    } finally {
      setExporting(false);
    }
  }

  const stats = useMemo(() => {
    const total = bills.reduce((s, b) => s + b.total, 0);
    const cash = bills.filter((b) => b.payMode === 'cash').reduce((s, b) => s + b.total, 0);
    const upi = total - cash;
    const byItem = {};
    for (const b of bills)
      for (const l of b.items) {
        const e = (byItem[l.name] ||= { name: l.name, qty: 0, amount: 0 });
        e.qty += l.qty;
        e.amount += l.qty * l.price;
      }
    const top = Object.values(byItem).sort((a, b) => b.amount - a.amount).slice(0, 8);

    let series;
    if (from === to) {
      series = Array.from({ length: 18 }, (_, i) => {
        const h = i + 6;
        const label = h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`;
        return { label, value: 0, h };
      });
      for (const b of bills) {
        const h = new Date(b.createdAt).getHours();
        const slot = series.find((s) => s.h === h) || (h < 6 ? series[0] : series[series.length - 1]);
        slot.value += b.total;
      }
    } else {
      series = [];
      for (let d = parseKey(from); dateKey(d) <= to; d = addDays(d, 1)) {
        const k = dateKey(d);
        series.push({ key: k, label: String(d.getDate()), value: 0 });
      }
      for (const b of bills) {
        const s = series.find((x) => x.key === b.date);
        if (s) s.value += b.total;
      }
    }
    return { total, cash, upi, count: bills.length, avg: bills.length ? total / bills.length : 0, top, series };
  }, [bills, from, to]);

  const max = Math.max(1, ...stats.series.map((s) => s.value));
  const topMax = Math.max(1, ...stats.top.map((t) => t.amount));
  const cashPct = stats.total ? (stats.cash / stats.total) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <PageHeader title={t('Reports')} subtitle={from === to ? fd(from) : `${fd(from)} – ${fd(to)}`}>
          <button className={btn.ghost} onClick={doExport} disabled={exporting || (!bills.length && !expenses.length)}>
            <FileSpreadsheet size={17} className="text-emerald-300" /> {exporting ? t('Exporting…') : t('Export Excel')}
          </button>
        </PageHeader>

        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 [&::-webkit-scrollbar]:hidden">
          {PRESETS.map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setPreset(id)}
              className={`shrink-0 h-10 px-4 rounded-full text-sm font-medium border transition cursor-pointer ${
                preset === id ? 'bg-cream text-ink-950 border-cream' : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-cream'
              }`}
            >
              {t(lbl)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={IndianRupee} label={t('Total sales')} value={inr(stats.total)} highlight />
          <Kpi icon={Wallet} label={t('Expenses')} value={inr(spent)} sub={t('{n} entries', { n: expenses.length })} />
          <Kpi
            icon={TrendingUp}
            label={t('Net profit')}
            value={inr(stats.total - spent)}
            valueClass={stats.total - spent >= 0 ? 'text-emerald-300' : 'text-rose-300'}
            sub={t('Sales − expenses')}
          />
          <Kpi icon={Receipt} label={t('Bills')} value={stats.count} sub={t('Avg {amt}', { amt: inr(Math.round(stats.avg)) })} />
        </div>

        <div className="grid lg:grid-cols-5 gap-3 mt-3">
          <div className={`${card} p-5 lg:col-span-3`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">{from === to ? t('Sales by hour') : t('Sales by day')}</h3>
              <TrendingUp size={18} className="text-white/30" />
            </div>
            <div className="h-48 flex items-end gap-1">
              {stats.series.map((s, i) => (
                <div key={i} className="group flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-2">
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${s.value ? 'bg-linear-to-t from-gold-600/70 to-gold-300 group-hover:to-gold-200' : 'bg-white/[0.05]'}`}
                      style={{ height: s.value ? `${Math.max(4, (s.value / max) * 100)}%` : '3px' }}
                    />
                    {s.value > 0 && (
                      <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] px-2 py-0.5 rounded-md bg-ink-700 border border-white/10 opacity-0 group-hover:opacity-100 transition">
                        {inr(s.value)}
                      </span>
                    )}
                  </div>
                  {/* phones: every 3rd label so they don't collide; wider screens: all (up to 18) */}
                  <span
                    className={`text-[10px] text-white/30 tabular-nums whitespace-nowrap ${
                      i % 3 === 0 ? '' : stats.series.length <= 18 ? 'hidden sm:inline' : 'hidden'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} p-5 lg:col-span-2`}>
            <h3 className="font-semibold mb-5">{t('Payment split')}</h3>
            <div className="h-3 rounded-full overflow-hidden flex bg-white/[0.05]">
              <div className="bg-emerald-400/80" style={{ width: `${cashPct}%` }} />
              <div className="bg-sky-400/80" style={{ width: `${stats.total ? 100 - cashPct : 0}%` }} />
            </div>
            <div className="mt-5 space-y-3">
              <SplitRow color="bg-emerald-400" label={t('Cash')} value={stats.cash} pct={cashPct} />
              <SplitRow color="bg-sky-400" label="UPI" value={stats.upi} pct={stats.total ? 100 - cashPct : 0} />
            </div>
            {(discounts > 0 || gst > 0) && (
              <div className="mt-5 pt-4 border-t border-white/[0.06] space-y-2 text-sm">
                {discounts > 0 && (
                  <div className="flex justify-between text-white/55">
                    <span>{t('Discounts given')}</span>
                    <span className="tabular-nums">{inr(discounts)}</span>
                  </div>
                )}
                {gst > 0 && (
                  <div className="flex justify-between text-white/55">
                    <span>{t('GST collected')}</span>
                    <span className="tabular-nums">{inr(gst)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`${card} p-5 mt-3`}>
          <h3 className="font-semibold mb-4">{t('Top selling items')}</h3>
          {stats.top.length === 0 ? (
            <p className="text-sm text-white/35 py-6 text-center">{t('No sales in this period')}</p>
          ) : (
            <div className="space-y-3">
              {stats.top.map((row, i) => (
                <div key={row.name} className="flex items-center gap-4">
                  <span className="w-5 text-sm text-white/30 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium truncate">{row.name}</span>
                      <span className="tabular-nums text-white/50">
                        {t('{n} sold', { n: row.qty })} · <span className="text-cream font-medium">{inr(row.amount)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full rounded-full bg-linear-to-r from-gold-600 to-gold-300" style={{ width: `${(row.amount / topMax) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, highlight, valueClass = '' }) {
  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border ${
        highlight ? 'bg-linear-to-br from-gold-400/[0.16] to-gold-400/[0.03] border-gold-400/25' : 'bg-ink-900/70 border-white/[0.06]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/40">{label}</span>
        <Icon size={17} className={highlight ? 'text-gold-300' : 'text-white/30'} />
      </div>
      <div className={`mt-2 text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums ${highlight ? 'text-gold-200' : valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-white/35 mt-1">{sub}</div>}
    </div>
  );
}

function SplitRow({ color, label, value, pct }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2.5 text-white/70">
        <span className={`size-2.5 rounded-full ${color}`} /> {label}
      </span>
      <span className="tabular-nums">
        {inr(value)} <span className="text-white/35 ml-1">{Math.round(pct)}%</span>
      </span>
    </div>
  );
}
