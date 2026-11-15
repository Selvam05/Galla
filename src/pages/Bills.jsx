import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, ChevronDown, Printer, Trash2, Receipt, Banknote, QrCode } from 'lucide-react';
import { db, deleteBill } from '../db';
import { useApp } from '../AppContext';
import { inr, billNoStr, fmtTime, dateKey, parseKey, addDays } from '../lib/utils';
import { btn, input, card } from '../lib/ui';
import PageHeader from '../components/PageHeader';

export default function Bills() {
  const [date, setDate] = useState(dateKey());
  const [open, setOpen] = useState(null);
  const bills = useLiveQuery(() => db.bills.where('date').equals(date).reverse().sortBy('createdAt'), [date], []);
  const { printReceipt, confirm, toast, t, locale, lang } = useApp();

  const total = bills.reduce((s, b) => s + b.total, 0);
  const isToday = date === dateKey();
  const shift = (n) => setDate(dateKey(addDays(parseKey(date), n)));
  const pretty = parseKey(date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  async function remove(b) {
    const ok = await confirm({
      title: t('Delete bill {no}?', { no: billNoStr(b.billNo) }),
      message: t('This bill of {amt} will be removed from sales and reports. This cannot be undone.', { amt: inr(b.total) }),
      confirmText: t('Delete bill'),
      danger: true,
    });
    if (ok) {
      await deleteBill(b);
      toast(t('Bill deleted'));
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <PageHeader title={t('Bills')} subtitle={pretty}>
          <div className="flex items-center gap-1.5">
            <button className={`${btn.ghost} px-0 w-11`} onClick={() => shift(-1)} aria-label={t('Previous day')}>
              <ChevronLeft size={18} />
            </button>
            <input type="date" value={date} max={dateKey()} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${input} w-auto`} />
            <button className={`${btn.ghost} px-0 w-11`} onClick={() => shift(1)} disabled={isToday} aria-label={t('Next day')}>
              <ChevronRight size={18} />
            </button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`${card} p-4`}>
            <div className="text-xs uppercase tracking-wider text-white/35">{t('Sales')}</div>
            <div className="text-2xl font-semibold tabular-nums text-gold-300 mt-1">{inr(total)}</div>
          </div>
          <div className={`${card} p-4`}>
            <div className="text-xs uppercase tracking-wider text-white/35">{t('Bills')}</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">{bills.length}</div>
          </div>
        </div>

        {bills.length === 0 ? (
          <div className={`${card} p-12 text-center text-white/40`}>
            <Receipt size={32} className="mx-auto mb-3 opacity-50" />
            {t('No bills on this day')}
          </div>
        ) : (
          <div className={`${card} divide-y divide-white/[0.05] overflow-hidden`}>
            {bills.map((b) => {
              const expanded = open === b.id;
              const Mode = b.payMode === 'upi' ? QrCode : Banknote;
              return (
                <div key={b.id}>
                  <button onClick={() => setOpen(expanded ? null : b.id)} className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-white/[0.02] transition cursor-pointer">
                    <div className="size-10 shrink-0 rounded-xl grid place-items-center bg-white/[0.04] border border-white/[0.06] text-white/50">
                      <Mode size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium tabular-nums">{billNoStr(b.billNo)}</div>
                      <div className="text-xs text-white/35 truncate">
                        {fmtTime(b.createdAt, locale)} · {t('{n} items', { n: b.itemCount })} · {b.items.map((l) => (lang === 'ta' && l.nameTa) || l.name).join(', ')}
                      </div>
                    </div>
                    <span
                      className={`hidden sm:inline text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md ${
                        b.payMode === 'upi' ? 'bg-sky-400/10 text-sky-300' : 'bg-emerald-400/10 text-emerald-300'
                      }`}
                    >
                      {b.payMode === 'upi' ? 'UPI' : t('Cash')}
                    </span>
                    <div className="w-20 text-right font-semibold tabular-nums">{inr(b.total)}</div>
                    <ChevronDown size={16} className={`text-white/30 transition ${expanded ? 'rotate-180' : ''}`} />
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 animate-fade">
                      <div className="rounded-xl bg-ink-950/60 border border-white/[0.05] p-4 space-y-1.5 text-sm">
                        {b.items.map((l, i) => (
                          <div key={i} className="flex justify-between gap-4">
                            <span className="text-white/70">
                              {(lang === 'ta' && l.nameTa) || l.name} <span className="text-white/30">× {l.qty}</span>
                            </span>
                            <span className="tabular-nums">{inr(l.price * l.qty)}</span>
                          </div>
                        ))}
                        {(b.discount || b.tax) && (
                          <div className="border-t border-dashed border-white/10 pt-2 mt-2 space-y-1 text-xs text-white/45">
                            <div className="flex justify-between">
                              <span>{t('Subtotal')}</span>
                              <span className="tabular-nums">{inr(b.subtotal)}</span>
                            </div>
                            {b.discount && (
                              <div className="flex justify-between text-emerald-300">
                                <span>{t('Discount')}{b.discount.type === 'pct' ? ` ${b.discount.value}%` : ''}</span>
                                <span className="tabular-nums">−{inr(b.discount.amount)}</span>
                              </div>
                            )}
                            {b.tax && (
                              <div className="flex justify-between">
                                <span>GST {b.tax.rate}%</span>
                                <span className="tabular-nums">{inr(b.tax.amount)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between border-t border-dashed border-white/10 pt-2 mt-2 font-semibold">
                          <span>{t('Total')}</span>
                          <span className="tabular-nums text-gold-300">{inr(b.total)}</span>
                        </div>
                        {b.received ? (
                          <div className="flex justify-between text-xs text-white/40">
                            <span>{t('Cash {amt} · Balance', { amt: inr(b.received) })}</span>
                            <span>{inr(b.received - b.total)}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className={`${btn.ghost} h-10`} onClick={() => printReceipt(b)}>
                          <Printer size={16} /> {t('Reprint')}
                        </button>
                        <button className={`${btn.danger} h-10`} onClick={() => remove(b)}>
                          <Trash2 size={16} /> {t('Delete')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
