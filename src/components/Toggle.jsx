export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition cursor-pointer ${
        checked ? 'bg-gold-400' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full shadow transition-transform ${
          checked ? 'translate-x-5 bg-ink-950' : 'bg-white/70'
        }`}
      />
    </button>
  );
}
