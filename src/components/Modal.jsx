import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, size = 'md', bare = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-2xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 light:bg-[#2b1f14]/35 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${width} max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-ink-900 border border-white/10 shadow-[0_40px_120px_-20px_var(--shadow-deep)] animate-pop`}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              {subtitle && <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="size-9 -mr-2 grid place-items-center rounded-full text-white/50 hover:text-cream hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={bare ? 'flex-1 min-h-0 flex flex-col' : 'px-6 pb-6 overflow-y-auto'}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
