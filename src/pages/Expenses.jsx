import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Wallet, IndianRupee, TrendingUp, Banknote, QrCode } from 'lucide-react';
import { db, EXPENSE_CATEGORIES } from '../db';
import { useApp } from '../AppContext';
import { inr, fmtTime, dateKey, parseKey, addDays } from '../lib/utils';
import { btn, input, card, label } from '../lib/ui';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

const TA = Object.fromEntries(EXPENSE_CATEGORIES);

export default function Expenses() {
  const [date, setDate] = useState(dateKey());
  const [editing, setEditing] = useState(null);
  const expenses = useLiveQuery(() => db.expenses.where('date').equals(date).reverse().sortBy('createdAt'), [date], []);
  const bills = useLiveQuery(() => db.bills.where('date').equals(date).toArray(), [date], []);
  const { toast, confirm, t, locale, lang } = useApp();

  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const sales = bills.reduce((s, b) => s + b.total, 0);
  const net = sales - spent;
  const isToday = date === dateKey();
  const shift = (n) => setDate(dateKey(addDays(parseKey(date), n)));
  const pretty = parseKey(date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  async function save(data) {
    const { id, ...fields } = data;
    if (id) {
      await db.expenses.update(id, fields);
      toast(t('Expense updated'));
    } else {
      const now = new Date();
      const d = parseKey(date);
      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      await db.expenses.add({ ...fields, date, createdAt: d.getTime() });
      toast(t('Expense added'));
    }
    setEditing(null);
  }

  async function remove(e) {
    const ok = await confirm({
      title: t('Delete expense?'),
      message: t('{cat} · {amt} will be removed.', { cat: e.category, amt: inr(e.amount) }),
      confirmText: t('Delete'),
      danger: true,
    });
    if (ok) {
      await db.expenses.delete(e.id);
      toast(t('Expense deleted'));
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <PageHeader title={t('Expenses')} subtitle={pretty}>
          <div className="flex items-center gap-1.5">
            <button className={`${btn.ghost} px-0 w-11`} onClick={() => shift(-1)} aria-label={t('Previous day')}>
              <ChevronLeft size={18} />
            </button>
            <input type="date" value={date} max={dateKey()} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${input} w-auto`} />
            <button className={`${btn.ghost} px-0 w-11`} onClick={() => shift(1)} disabled={isToday} aria-label={t('Next day')}>
              <ChevronRight size={18} />
            </button>
          </div>
          <button className={btn.primary} onClick={() => setEditing({})}>
            <Plus size={18} /> {t('Add expense')}
          </button>
        </PageHeader>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          <Kpi icon={IndianRupee} label={t('Sales')} value={inr(sales)} />
          <Kpi icon={Wallet} label={t('Expenses')} value={inr(spent)} tone="rose" />
          <Kpi icon={TrendingUp} label={t('Net profit')} value={inr(net)} tone={net >= 0 ? 'emerald' : 'rose'} highlight />
        </div>

        {expenses.length === 0 ? (
          <div className={`${card} p-12 text-center`}>
            <div className="mx-auto size-16 rounded-2xl grid place-items-center bg-white/[0.03] border border-white/[0.06] text-white/25">
              <Wallet size={28} />
            </div>
            <p className="mt-4 font-medium text-white/60">{t('No expenses on this day')}</p>
            <p className="text-sm text-white/35 mt-1">{t('Add milk, sugar, gas and other spends to see your real profit')}</p>
            <button className={`${btn.primary} mt-5`} onClick={() => setEditing({})}>
              <Plus size={18} /> {t('Add expense')}
            </button>
          </div>
        ) : (
          <div className={`${card} divide-y divide-white/[0.05] overflow-hidden`}>
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-4 py-3.5">
                <div className="size-10 shrink-0 rounded-xl grid place-items-center bg-rose-400/10 text-rose-300 ring-1 ring-rose-300/15">
                  {e.payMode === 'upi' ? <QrCode size={17} /> : <Banknote size={17} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {lang === 'ta' && TA[e.category] ? TA[e.category] : e.category}
                    {lang !== 'ta' && TA[e.category] && <span className="ml-2 text-sm font-normal text-white/40">{TA[e.category]}</span>}
                  </div>
                  <div className="text-xs text-white/35 truncate">
                    {fmtTime(e.createdAt, locale)} · {e.payMode === 'upi' ? 'UPI' : t('Cash')}
                    {e.note ? ` · ${e.note}` : ''}
                  </div>
                </div>
                <div className="w-24 text-right font-semibold tabular-nums text-rose-300">−{inr(e.amount)}</div>
                <div className="flex">
                  <button className={btn.icon} onClick={() => setEditing(e)} aria-label={t('Edit')}>
                    <Pencil size={16} />
                  </button>
                  <button className={`${btn.icon} hover:!text-rose-300`} onClick={() => remove(e)} aria-label={t('Delete')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExpenseForm expense={editing} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}

function Kpi({ icon: Icon, label: l, value, tone, highlight }) {
  const color = tone === 'emerald' ? 'text-emerald-300' : tone === 'rose' ? 'text-rose-300' : '';
  return (
    <div
      className={`min-w-0 rounded-2xl p-3 sm:p-4 border ${
        highlight
          ? tone === 'emerald'
            ? 'bg-emerald-400/[0.07] border-emerald-400/20'
            : 'bg-rose-400/[0.07] border-rose-400/20'
          : 'bg-ink-900/70 border-white/[0.06]'
      }`}
    >
      <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] uppercase tracking-wider text-white/40">
        <span className="truncate">{l}</span> <Icon size={15} className="hidden sm:block shrink-0 text-white/30" />
      </div>
      <div className={`mt-1.5 text-lg sm:text-2xl font-semibold tabular-nums tracking-tight truncate ${color}`}>{value}</div>
    </div>
  );
}

function ExpenseForm({ expense, onClose, onSave }) {
  const { t, lang } = useApp();
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payMode, setPayMode] = useState('cash');

  useEffect(() => {
    if (expense) {
      setCategory(expense.category || 'Milk');
      setAmount(expense.amount != null ? String(expense.amount) : '');
      setNote(expense.note || '');
      setPayMode(expense.payMode || 'cash');
    }
  }, [expense]);

  const valid = category.trim() && Number(amount) > 0;

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onSave({ id: expense?.id, category: category.trim(), amount: Number(amount), note: note.trim(), payMode });
  }

  return (
    <Modal open={!!expense} onClose={onClose} title={expense?.id ? t('Edit expense') : t('New expense')}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={label}>{t('Category')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {EXPENSE_CATEGORIES.map(([en, ta]) => (
              <button
                type="button"
                key={en}
                onClick={() => setCategory(en)}
                className={`text-left rounded-xl px-3 py-2 border transition cursor-pointer ${
                  category === en ? 'bg-gold-400/15 border-gold-400/40' : 'border-white/[0.08] hover:bg-white/[0.04]'
                }`}
              >
                <div className={`text-sm font-medium ${category === en ? 'text-gold-200' : ''}`}>{lang === 'ta' ? ta : en}</div>
                <div className="text-[11px] text-white/40">{lang === 'ta' ? en : ta}</div>
              </button>
            ))}
          </div>
          {!TA[category] && (
            <input className={`${input} mt-2`} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('Custom category')} />
          )}
        </div>
        <div>
          <label className={label}>{t('Amount (₹)')}</label>
          <input
            className={`${input} h-14 text-2xl font-semibold tabular-nums`}
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>
        <div>
          <label className={label}>{t('Note (optional)')}</label>
          <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('e.g. 10 litre milk')} />
        </div>
        <div>
          <label className={label}>{t('Paid by')}</label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/30 light:bg-white/[0.05] border border-white/[0.06]">
            {[
              ['cash', 'Cash', Banknote],
              ['upi', 'UPI', QrCode],
            ].map(([id, lbl, Icon]) => (
              <button
                type="button"
                key={id}
                onClick={() => setPayMode(id)}
                className={`h-10 rounded-lg inline-flex items-center justify-center gap-2 text-sm font-medium transition cursor-pointer ${
                  payMode === id ? 'bg-cream text-ink-950' : 'text-white/50 hover:text-cream'
                }`}
              >
                <Icon size={16} /> {t(lbl)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button type="button" className={btn.ghost} onClick={onClose}>
            {t('Cancel')}
          </button>
          <button type="submit" className={btn.primary} disabled={!valid}>
            {expense?.id ? t('Save changes') : t('Add expense')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
