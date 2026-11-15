import { Sun, Moon, Leaf } from 'lucide-react';
import { useApp } from '../AppContext';

const ICON = { dark: Moon, light: Sun, green: Leaf };
const NAME = { dark: 'Dark', light: 'Light', green: 'Tea Leaf' };

/** Cycles Dark → Light → Tea Leaf. Shows the current theme's icon. */
export default function ThemeButton({ className = '' }) {
  const { theme, toggleTheme, t } = useApp();
  const Icon = ICON[theme] || Moon;
  const label = `${t('Change theme')} · ${t(NAME[theme] || 'Dark')}`;
  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`size-11 grid place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/55 hover:text-gold-300 hover:border-gold-400/30 transition cursor-pointer ${className}`}
    >
      <Icon size={19} />
    </button>
  );
}
