import { useCallback, useEffect, useState } from 'react';

/**
 * What the user picked in Settings. `'system'` defers to OS preference and
 * resubscribes to media-query changes; the other two pin the choice.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

/**
 * What's actually applied to <html data-theme>. Always concrete, never
 * `'system'` — components that want to render-condition on the active
 * palette read this.
 */
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'logistiek.theme';

/**
 * Reads the persisted choice. `null` is returned for missing/invalid values
 * so the caller can default to `'system'` (which is also our HTML bootstrap
 * script's behaviour, keeping React state in sync with the pre-mount paint).
 */
function readStoredChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // localStorage may throw in private/sandboxed contexts — fall through.
  }
  return 'system';
}

function getOSPreference(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved);
}

/**
 * Theme hook. Exposes the user's choice + the resolved (applied) theme,
 * keeps localStorage and `<html data-theme>` in sync, and re-evaluates the
 * resolved value when:
 *   - the user picks a new choice (`setTheme`)
 *   - the choice is `'system'` and the OS preference flips
 *
 * The inline bootstrap script in `index.html` already paints the correct
 * theme on first render. This hook then takes over for live updates.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(() => readStoredChoice());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    theme === 'system' ? getOSPreference() : theme,
  );

  // Apply on mount + whenever `theme` changes. The inline script already did
  // a first paint, but if React's stored choice differs (e.g. invalid value
  // got coerced to 'system') we re-sync here.
  useEffect(() => {
    const next: ResolvedTheme = theme === 'system' ? getOSPreference() : theme;
    setResolvedTheme(next);
    applyTheme(next);
  }, [theme]);

  // Subscribe to OS changes only when in `'system'` mode. Native MediaQueryList
  // listeners stay alive for the page's lifetime, so we tear down when the
  // user switches to a pinned choice.
  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      const next: ResolvedTheme = mq.matches ? 'light' : 'dark';
      setResolvedTheme(next);
      applyTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Same fallthrough — we still update React state so the UI feels
      // responsive even when persistence is unavailable.
    }
    setThemeState(next);
  }, []);

  return { theme, setTheme, resolvedTheme };
}
