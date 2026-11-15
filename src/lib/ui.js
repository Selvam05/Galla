const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer';

export const btn = {
  primary: `${base} h-11 px-5 bg-linear-to-b from-gold-300 to-gold-500 text-on-gold font-semibold shadow-[0_10px_30px_-10px_rgba(234,181,87,.65)] hover:brightness-105`,
  ghost: `${base} h-11 px-4 bg-white/[0.04] border border-white/10 text-cream/90 hover:bg-white/[0.08]`,
  danger: `${base} h-11 px-4 bg-rose-500/10 border border-rose-400/20 text-rose-300 hover:bg-rose-500/20`,
  icon: `${base} size-9 rounded-lg text-white/50 hover:text-cream hover:bg-white/[0.08]`,
};

export const input =
  'w-full h-11 rounded-xl bg-ink-950/60 border border-white/10 px-3.5 text-cream placeholder:text-white/25 outline-none focus:border-gold-400/60 focus:ring-4 focus:ring-gold-400/10 transition';

export const card = 'rounded-2xl bg-ink-900/70 border border-white/[0.06] backdrop-blur';

export const label = 'block text-xs font-medium uppercase tracking-wider text-white/40 mb-1.5';
