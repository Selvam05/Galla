import { useEffect, useRef, useState } from 'react';
import { Store, QrCode, Printer, Database, Download, Upload, Trash2, Palette, Sun, Moon, Leaf, Percent, Languages } from 'lucide-react';
import { LANGUAGES } from '../lib/i18n';
import { db, updateSettings } from '../db';
import { useApp } from '../AppContext';
import { dateKey } from '../lib/utils';
import { btn, input, card, label } from '../lib/ui';
import PageHeader from '../components/PageHeader';
import Toggle from '../components/Toggle';
import UpiQr from '../components/UpiQr';

const FIELDS = ['shopName', 'address', 'phone', 'upiId', 'upiName', 'footer', 'printQr', 'nameMode', 'gstEnabled', 'gstRate', 'gstin'];

export default function Settings() {
  const { settings, ready, toast, confirm, theme, setTheme, t, lang, setLang } = useApp();
  const [form, setForm] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (ready && !form) setForm(Object.fromEntries(FIELDS.map((k) => [k, settings[k]])));
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return null;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const dirty = FIELDS.some((k) => form[k] !== settings[k]);
  const upiValid = !form.upiId || /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(form.upiId.trim());

  async function save() {
    if (!form.shopName.trim()) return toast(t('Shop name is required'), 'error');
    if (!upiValid) return toast(t('UPI ID looks invalid (example: name@okaxis)'), 'error');
    await updateSettings({
      ...form,
      shopName: form.shopName.trim(),
      upiId: form.upiId.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      gstRate: Number(form.gstRate) || 0,
    });
    toast(t('Settings saved'));
  }

  async function exportBackup() {
    const data = {
      app: 'galla',
      version: 1,
      exportedAt: new Date().toISOString(),
      items: await db.items.toArray(),
      bills: await db.bills.toArray(),
      expenses: await db.expenses.toArray(),
      settings: await db.settings.toArray(),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `galla-backup-${dateKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(t('Backup downloaded'));
  }

  async function importBackup(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!['galla', 'chai-pos'].includes(data.app) || !Array.isArray(data.items) || !Array.isArray(data.bills)) throw new Error();
      const ok = await confirm({
        title: t('Restore backup?'),
        message: t('This replaces all current data with {i} items and {b} bills from the backup.', { i: data.items.length, b: data.bills.length }),
        confirmText: t('Restore'),
        danger: true,
      });
      if (!ok) return;
      await db.transaction('rw', db.items, db.bills, db.settings, db.expenses, async () => {
        await Promise.all([db.items.clear(), db.bills.clear(), db.settings.clear(), db.expenses.clear()]);
        await db.items.bulkAdd(data.items);
        await db.bills.bulkAdd(data.bills);
        if (Array.isArray(data.expenses)) await db.expenses.bulkAdd(data.expenses);
        if (Array.isArray(data.settings)) await db.settings.bulkAdd(data.settings);
      });
      toast(t('Backup restored'));
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast(t('Invalid backup file'), 'error');
    }
  }

  async function clearBills() {
    const ok = await confirm({
      title: t('Delete all bills?'),
      message: t('All bills and sales history will be permanently deleted and bill numbers will restart from #0001. Take a backup first.'),
      confirmText: t('Delete everything'),
      danger: true,
    });
    if (!ok) return;
    await db.bills.clear();
    await updateSettings({ lastBillNo: 0 });
    toast(t('All bills deleted'));
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28">
        <PageHeader title={t('Settings')} subtitle={t('Shop details, UPI and printing')}>
          <button className={btn.primary} onClick={save} disabled={!dirty}>
            {t('Save changes')}
          </button>
        </PageHeader>

        <div className="space-y-4">
          <Section icon={Languages} title={t('Language')} desc={t('Buttons, menus and receipts will be shown in this language')}>
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={async () => {
                    const patch = await setLang(l.id);
                    if (patch.nameMode) setForm((f) => ({ ...f, nameMode: patch.nameMode }));
                  }}
                  className={`flex items-center gap-3 rounded-2xl p-4 border-2 text-left transition cursor-pointer ${
                    lang === l.id ? 'border-gold-400 bg-gold-400/[0.06]' : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <span className="size-11 shrink-0 rounded-xl grid place-items-center bg-white/[0.05] font-display text-xl">{l.id === 'ta' ? 'அ' : 'A'}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{l.native}</span>
                    <span className="block text-xs text-white/40 truncate">{l.sample}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section icon={Palette} title={t('Appearance')} desc={t('Choose a look for your shop')}>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                ['dark', 'Dark', Moon, '#0c0907', '#1e1914', '#eab557'],
                ['light', 'Light', Sun, '#f5efe6', '#ffffff', '#cd8c20'],
                ['green', 'Tea Leaf', Leaf, '#07120d', '#163024', '#eab557'],
              ].map(([id, lbl, Icon, bg, cardBg, accent]) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`min-w-0 rounded-2xl p-1.5 sm:p-2 border-2 text-left transition cursor-pointer ${
                    theme === id ? 'border-gold-400' : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="rounded-xl p-2 sm:p-3 h-20 sm:h-24 flex gap-1 sm:gap-2" style={{ background: bg }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 min-w-0 rounded-md sm:rounded-lg p-1 sm:p-2 flex flex-col justify-end ${i === 2 ? 'hidden sm:flex' : ''}`}
                        style={{ background: cardBg }}
                      >
                        <div className="h-1.5 w-3/4 rounded-full mb-1.5" style={{ background: accent, opacity: 0.25 }} />
                        <div className="h-1.5 w-1/2 rounded-full" style={{ background: accent }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-1.5 pt-2 sm:pt-2.5 pb-1 text-[13px] sm:text-sm font-medium whitespace-nowrap">
                    <Icon size={15} className={`shrink-0 ${theme === id ? 'text-gold-300' : 'text-white/40'}`} />
                    <span className="truncate">{t(lbl)}</span>
                  </div>
                </button>
              ))}
            </div>
            <div>
              <label className={label}>{t('Item names on billing screen & receipt')}</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/30 light:bg-white/[0.05] border border-white/[0.06]">
                {[
                  ['en', 'English', 'Tea'],
                  ['ta', 'தமிழ்', 'டீ'],
                  ['both', 'Both', 'Tea · டீ'],
                ].map(([id, lbl, eg]) => (
                  <button
                    key={id}
                    onClick={() => set('nameMode')(id)}
                    className={`rounded-lg py-2 transition cursor-pointer ${form.nameMode === id ? 'bg-cream text-ink-950' : 'text-white/55 hover:text-cream'}`}
                  >
                    <div className="text-sm font-medium">{t(lbl)}</div>
                    <div className={`text-[11px] ${form.nameMode === id ? 'opacity-60' : 'text-white/35'}`}>{eg}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/35 mt-2">{t('Add Tamil names to items in the Items page.')}</p>
            </div>
          </Section>

          <Section icon={Store} title={t('Shop details')} desc={t('Printed at the top of every bill')}>
            <Field label={t('Shop name')}>
              <input className={input} value={form.shopName} onChange={set('shopName')} />
            </Field>
            <Field label={t('Address')}>
              <input className={input} value={form.address} onChange={set('address')} placeholder="12, Main Road, Chennai" />
            </Field>
            <Field label={t('Phone')}>
              <input className={input} value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="98765 43210" />
            </Field>
            <Field label={t('Bill footer message')}>
              <input className={input} value={form.footer} onChange={set('footer')} />
            </Field>
          </Section>

          <Section icon={QrCode} title={t('UPI payments')} desc={t('Shows a QR with the exact bill amount at checkout')}>
            <div className="grid sm:grid-cols-[1fr_auto] gap-5 items-start">
              <div className="space-y-4">
                <Field label={t('UPI ID')}>
                  <input
                    className={`${input} ${!upiValid ? '!border-rose-400/60' : ''}`}
                    value={form.upiId}
                    onChange={set('upiId')}
                    placeholder="yourname@okaxis"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </Field>
                <Field label={t('Payee name (shown in UPI app)')}>
                  <input className={input} value={form.upiName} onChange={set('upiName')} placeholder={form.shopName} />
                </Field>
              </div>
              {form.upiId && upiValid && (
                <div className="flex flex-col items-center gap-2">
                  <UpiQr upiId={form.upiId.trim()} name={form.upiName || form.shopName} amount={1} note="Test" size={120} />
                  <span className="text-[11px] text-white/35">{t('Test QR · ₹1')}</span>
                </div>
              )}
            </div>
          </Section>

          <Section icon={Percent} title="GST" desc={t('Only if your shop is GST registered. Most small tea shops can leave this off.')}>
            <Row label={t('Add GST to bills')} hint={t('GST is added on top of item prices, split as CGST + SGST on the receipt')}>
              <Toggle checked={form.gstEnabled} onChange={set('gstEnabled')} />
            </Row>
            {form.gstEnabled && (
              <div className="grid sm:grid-cols-2 gap-4 animate-fade">
                <Field label={t('GST rate')}>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 12, 18, 28].map((r) => (
                      <button
                        key={r}
                        onClick={() => set('gstRate')(r)}
                        className={`h-11 rounded-xl text-sm font-medium border transition cursor-pointer ${
                          Number(form.gstRate) === r ? 'bg-gold-400/15 border-gold-400/40 text-gold-200' : 'border-white/10 text-white/60 hover:bg-white/[0.05]'
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="GSTIN">
                  <input className={`${input} uppercase`} value={form.gstin} onChange={set('gstin')} placeholder="33ABCDE1234F1Z5" maxLength={15} />
                </Field>
              </div>
            )}
          </Section>

          <Section icon={Printer} title={t('Printing')} desc={t('58mm thermal receipt printer')}>
            <Row label={t('Print UPI QR on UPI bills')} hint={t('Customer can scan the printed bill to pay')}>
              <Toggle checked={form.printQr} onChange={set('printQr')} />
            </Row>
            <p className="text-xs text-white/35 leading-relaxed">
              {t('Tip: In the print dialog choose your thermal printer, set margins to “None” and turn off “Headers and footers”.')}
            </p>
          </Section>

          <Section icon={Database} title={t('Data & backup')} desc={t('All data is stored on this device. Take regular backups.')}>
            <div className="flex flex-wrap gap-2">
              <button className={btn.ghost} onClick={exportBackup}>
                <Download size={17} /> {t('Download backup')}
              </button>
              <button className={btn.ghost} onClick={() => fileRef.current?.click()}>
                <Upload size={17} /> {t('Restore backup')}
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
              <button className={btn.danger} onClick={clearBills}>
                <Trash2 size={17} /> {t('Delete all bills')}
              </button>
            </div>
          </Section>
        </div>
      </div>

      {dirty && (
        <div className="fixed bottom-[80px] md:bottom-6 left-1/2 -translate-x-1/2 md:ml-12 z-30 animate-pop">
          <div className="flex items-center gap-3 rounded-2xl p-2 pl-5 bg-ink-800/95 border border-white/10 backdrop-blur-xl shadow-2xl">
            <span className="text-sm text-white/60 whitespace-nowrap">{t('Unsaved changes')}</span>
            <button className={`${btn.primary} h-10`} onClick={save}>
              {t('Save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, desc, children }) {
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="flex items-start gap-3 mb-5">
        <div className="size-10 shrink-0 rounded-xl grid place-items-center bg-gold-400/10 text-gold-300 ring-1 ring-gold-300/15">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-white/40">{desc}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label: l, children }) {
  return (
    <div>
      <label className={label}>{l}</label>
      {children}
    </div>
  );
}

function Row({ label: l, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 bg-white/[0.02] border border-white/[0.05]">
      <div>
        <div className="text-sm font-medium">{l}</div>
        {hint && <div className="text-xs text-white/35">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
