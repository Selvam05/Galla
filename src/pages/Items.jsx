import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
import { db } from '../db';
import { useApp } from '../AppContext';
import { inr, categoryIcon, toneFor } from '../lib/utils';
import { btn, input, card, label } from '../lib/ui';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';

export default function Items() {
  const items = useLiveQuery(() => db.items.toArray(), [], []);
  const { toast, confirm, t } = useApp();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null | {} (new) | item

  const sorted = useMemo(() => [...items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)), [items]);
  const categories = useMemo(() => [...new Set(sorted.map((i) => i.category))], [sorted]);
  const query = q.trim().toLowerCase();
  const groups = categories
    .map((c) => ({
      c,
      list: sorted.filter(
        (i) => i.category === c && (!query || i.name.toLowerCase().includes(query) || (i.nameTa || '').includes(q.trim()))
      ),
    }))
    .filter((g) => g.list.length);
  const lowStock = items.filter((i) => i.trackStock && i.active !== 0 && (i.stock || 0) <= 5).length;

  async function save(data) {
    const { id, ...fields } = data;
    if (id) {
      await db.items.update(id, fields);
      toast(t('Item updated'));
    } else {
      const maxSort = items.reduce((m, i) => Math.max(m, i.sort ?? 0), 0);
      await db.items.add({ ...fields, active: 1, sort: maxSort + 1 });
      toast(t('Item added'));
    }
    setEditing(null);
  }

  async function remove(item) {
    const ok = await confirm({
      title: t('Delete “{name}”?', { name: item.name }),
      message: t('This item will be removed from the menu. Old bills will not be affected.'),
      confirmText: t('Delete'),
      danger: true,
    });
    if (ok) {
      await db.items.delete(item.id);
      toast(t('Item deleted'));
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <PageHeader
          title={t('Menu Items')}
          subtitle={t('{n} items · {c} categories', { n: items.length, c: categories.length }) + (lowStock ? t(' · {n} low on stock', { n: lowStock }) : '')}
        >
          <button className={btn.primary} onClick={() => setEditing({})}>
            <Plus size={18} /> {t('Add item')}
          </button>
        </PageHeader>

        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search items…')} className={`${input} h-12 pl-11 rounded-2xl`} />
        </div>

        {groups.length === 0 && (
          <div className={`${card} p-12 text-center text-white/40`}>
            <Package size={32} className="mx-auto mb-3 opacity-50" />
            {t('No items. Add your first menu item.')}
          </div>
        )}

        <div className="space-y-6">
          {groups.map(({ c, list }) => {
            const Icon = categoryIcon(c);
            const tone = toneFor(categories.indexOf(c));
            return (
              <section key={c}>
                <h2 className="flex items-center gap-2 mb-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {c} <span className="text-white/20">· {list.length}</span>
                </h2>
                <div className={`${card} divide-y divide-white/[0.05] overflow-hidden`}>
                  {list.map((it) => (
                    <div key={it.id} className={`flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 transition ${it.active === 0 ? 'opacity-45' : ''}`}>
                      <div className={`hidden sm:grid size-10 shrink-0 rounded-xl place-items-center ring-1 ${tone}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {it.name}
                          {it.nameTa && <span className="ml-2 text-sm font-normal text-white/40">{it.nameTa}</span>}
                        </div>
                        <div className="text-xs text-white/35 truncate">
                          {/* on phones the price lives here instead of its own column */}
                          <span className="sm:hidden font-semibold text-sm text-gold-300 tabular-nums mr-2">{inr(it.price)}</span>
                          {it.trackStock && (
                            <span className={`sm:hidden mr-2 ${(it.stock || 0) <= 5 ? 'text-amber-300' : ''}`}>
                              {(it.stock || 0) === 0 ? t('Out of stock') : t('{n} in stock', { n: it.stock })} ·
                            </span>
                          )}
                          {it.active === 0 ? t('Hidden from billing') : t('Available')}
                        </div>
                      </div>
                      {it.trackStock && (
                        <span
                          className={`hidden sm:inline text-[11px] font-semibold px-2 py-1 rounded-md tabular-nums ${
                            (it.stock || 0) === 0
                              ? 'bg-rose-400/10 text-rose-300'
                              : (it.stock || 0) <= 5
                                ? 'bg-amber-400/12 text-amber-300'
                                : 'bg-white/[0.05] text-white/50'
                          }`}
                        >
                          {(it.stock || 0) === 0 ? t('Out of stock') : t('{n} in stock', { n: it.stock })}
                        </span>
                      )}
                      <div className="hidden sm:block w-20 text-right font-semibold tabular-nums text-gold-300">{inr(it.price)}</div>
                      <Toggle
                        checked={it.active !== 0}
                        onChange={(v) => db.items.update(it.id, { active: v ? 1 : 0 })}
                        label={t('Available')}
                      />
                      <div className="flex shrink-0">
                        <button className={btn.icon} onClick={() => setEditing(it)} aria-label={t('Edit')}>
                          <Pencil size={16} />
                        </button>
                        <button className={`${btn.icon} hover:!text-rose-300`} onClick={() => remove(it)} aria-label={t('Delete')}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <ItemForm item={editing} categories={categories} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}

function ItemForm({ item, categories, onClose, onSave }) {
  const { t } = useApp();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [trackStock, setTrackStock] = useState(false);
  const [stock, setStock] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setNameTa(item.nameTa || '');
      setPrice(item.price != null ? String(item.price) : '');
      setCategory(item.category || categories[0] || '');
      setTrackStock(!!item.trackStock);
      setStock(item.stock != null ? String(item.stock) : '');
    }
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps

  const valid = name.trim() && Number(price) > 0 && category.trim() && (!trackStock || Number(stock) >= 0);

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onSave({
      id: item?.id,
      name: name.trim(),
      nameTa: nameTa.trim(),
      price: Number(price),
      category: category.trim(),
      trackStock,
      stock: trackStock ? Math.max(0, Math.floor(Number(stock) || 0)) : 0,
    });
  }

  return (
    <Modal open={!!item} onClose={onClose} title={item?.id ? t('Edit item') : t('New item')}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={label}>{t('Item name')}</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ginger Tea" autoFocus />
        </div>
        <div>
          <label className={label}>{t('Tamil name (optional)')}</label>
          <input className={input} value={nameTa} onChange={(e) => setNameTa(e.target.value)} placeholder="எ.கா. இஞ்சி டீ" />
        </div>
        <div>
          <label className={label}>{t('Price (₹)')}</label>
          <input className={input} type="number" inputMode="decimal" min="0" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="15" />
        </div>
        <div>
          <label className={label}>{t('Category')}</label>
          <input className={input} list="cat-list" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Tea & Coffee" />
          <datalist id="cat-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {categories.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  category === c ? 'bg-gold-400/15 border-gold-400/40 text-gold-200' : 'border-white/10 text-white/50 hover:text-cream'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{t('Track stock')}</div>
              <div className="text-xs text-white/40">{t('For snacks, bottles etc. Reduces on every sale.')}</div>
            </div>
            <Toggle checked={trackStock} onChange={setTrackStock} label={t('Track stock')} />
          </div>
          {trackStock && (
            <div className="animate-fade">
              <label className={label}>{t('Current stock (qty)')}</label>
              <input className={input} type="number" inputMode="numeric" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="30" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button type="button" className={btn.ghost} onClick={onClose}>
            {t('Cancel')}
          </button>
          <button type="submit" className={btn.primary} disabled={!valid}>
            {item?.id ? t('Save changes') : t('Add item')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
