import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import QRCode from 'qrcode';
import { CircleCheck, CircleAlert } from 'lucide-react';
import { db, DEFAULT_SETTINGS, getSettings, updateSettings } from './db';
import { billNoStr, upiLink } from './lib/utils';
import { translate, localeOf } from './lib/i18n';
import { btn } from './lib/ui';
import Receipt from './components/Receipt';
import Modal from './components/Modal';
import { getTheme, applyTheme, nextTheme } from './lib/theme';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const stored = useLiveQuery(() => db.settings.get('shop'), []);
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  const ready = stored !== undefined;

  /* ---------- language ---------- */
  const lang = settings.lang === 'ta' ? 'ta' : 'en';
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  const locale = localeOf(lang);
  /** Switches app language; also moves item-name display along with it (en↔ta). Returns the saved patch. */
  const setLang = useCallback(async (next) => {
    const s = await getSettings();
    const patch = { lang: next };
    if (next === 'ta' && s.nameMode === 'en') patch.nameMode = 'ta';
    if (next === 'en' && s.nameMode === 'ta') patch.nameMode = 'en';
    await updateSettings(patch);
    return patch;
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /* ---------- theme ---------- */
  const [theme, setThemeState] = useState(getTheme);
  const setTheme = useCallback((th) => {
    applyTheme(th);
    setThemeState(th);
  }, []);
  const toggleTheme = useCallback(() => setTheme(nextTheme(getTheme())), [setTheme]);

  /* ---------- toasts ---------- */
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = 'success') => {
    const id = Math.random();
    setToasts((x) => [...x, { id, msg, type }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 2800);
  }, []);

  /* ---------- confirm dialog ---------- */
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback((opts) => {
    setDialog(opts);
    return new Promise((res) => (resolver.current = res));
  }, []);
  const closeDialog = (ok) => {
    resolver.current?.(ok);
    setDialog(null);
  };

  /* ---------- receipt printing ---------- */
  const [job, setJob] = useState(null);
  const printReceipt = useCallback(async (bill) => {
    const s = await getSettings();
    let qr = null;
    if (s.printQr && s.upiId && bill.payMode === 'upi') {
      qr = await QRCode.toDataURL(
        upiLink({ upiId: s.upiId, name: s.upiName || s.shopName, amount: bill.total, note: `Bill ${billNoStr(bill.billNo)}` }),
        { margin: 0, width: 240 }
      );
    }
    setJob({ bill, settings: s, qr, nonce: Date.now() });
  }, []);

  useEffect(() => {
    if (!job) return;
    const timer = setTimeout(() => window.print(), 150);
    return () => clearTimeout(timer);
  }, [job]);

  return (
    <Ctx.Provider
      value={{ settings, ready, toast, confirm, printReceipt, theme, setTheme, toggleTheme, lang, t, locale, setLang }}
    >
      {children}

      {createPortal(job ? <Receipt key={job.nonce} {...job} /> : null, document.getElementById('print-root'))}

      <div className="fixed z-[70] top-4 inset-x-0 flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((x) => (
          <div
            key={x.id}
            className="animate-toast flex items-center gap-2.5 rounded-full pl-3 pr-5 py-2.5 bg-ink-800/95 border border-white/10 shadow-2xl backdrop-blur text-sm"
          >
            {x.type === 'error' ? (
              <CircleAlert size={18} className="text-rose-300" />
            ) : (
              <CircleCheck size={18} className="text-emerald-300" />
            )}
            {x.msg}
          </div>
        ))}
      </div>

      <Modal open={!!dialog} onClose={() => closeDialog(false)} title={dialog?.title} size="sm">
        <p className="text-sm text-white/60 leading-relaxed">{dialog?.message}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button className={btn.ghost} onClick={() => closeDialog(false)}>
            {t('Cancel')}
          </button>
          <button className={dialog?.danger ? btn.danger : btn.primary} onClick={() => closeDialog(true)} autoFocus>
            {dialog?.confirmText || t('Confirm')}
          </button>
        </div>
      </Modal>

    </Ctx.Provider>
  );
}
