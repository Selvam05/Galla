const KEY = 'chai-pos:theme';

export const THEMES = ['dark', 'light', 'green'];

const META_COLOR = { dark: '#0c0907', light: '#f5efe6', green: '#07120d' };

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.includes(t) ? t : 'dark';
  } catch {
    return 'dark';
  }
}

export const nextTheme = (t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length];

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme] || META_COLOR.dark);
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
}
