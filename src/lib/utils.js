import { Coffee, Cookie, GlassWater, CakeSlice, UtensilsCrossed } from 'lucide-react';

export const inr = (n) => {
  const v = Number(n || 0);
  return (v < 0 ? '−₹' : '₹') + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const fmtTime = (ts, locale = 'en-IN') =>
  new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });

export const fmtDate = (ts, locale = 'en-IN') =>
  new Date(ts).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });

export const billNoStr = (n) => '#' + String(n).padStart(4, '0');

export const upiLink = ({ upiId, name, amount, note }) =>
  `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || '')}` +
  `&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note || '')}`;

const TONES = [
  'bg-amber-400/12 text-amber-300 ring-amber-300/15',
  'bg-rose-400/12 text-rose-300 ring-rose-300/15',
  'bg-sky-400/12 text-sky-300 ring-sky-300/15',
  'bg-emerald-400/12 text-emerald-300 ring-emerald-300/15',
  'bg-violet-400/12 text-violet-300 ring-violet-300/15',
  'bg-orange-400/12 text-orange-300 ring-orange-300/15',
];

export function categoryIcon(cat = '') {
  if (/tea|coffee|chai|hot/i.test(cat)) return Coffee;
  if (/snack|bake|fry/i.test(cat)) return Cookie;
  if (/drink|juice|milk|cool|shake/i.test(cat)) return GlassWater;
  if (/sweet|cake|dessert/i.test(cat)) return CakeSlice;
  return UtensilsCrossed;
}

export const toneFor = (index) => TONES[Math.abs(index) % TONES.length];

const TONE_RGB = ['251,191,36', '251,113,133', '56,189,248', '52,211,153', '167,139,250', '251,146,60'];
export const toneRgb = (index) => TONE_RGB[Math.abs(index) % TONE_RGB.length];

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
