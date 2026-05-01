import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeChoice } from '@/hooks/useTheme';

const OPTIONS: ReadonlyArray<{
  id: ThemeChoice;
  label: string;
  description: string;
  icon: typeof Monitor;
}> = [
  {
    id: 'system',
    label: 'Systeem',
    description: 'Volg de instelling van Windows.',
    icon: Monitor,
  },
  {
    id: 'light',
    label: 'Licht',
    description: 'Lichte werkomgeving.',
    icon: Sun,
  },
  {
    id: 'dark',
    label: 'Donker',
    description: 'Donkere werkomgeving.',
    icon: Moon,
  },
];

/**
 * Three-way theme toggle. Clicking a card switches the theme immediately
 * (the `useTheme` hook persists to localStorage and re-applies the
 * `data-theme` attribute on <html>).
 */
export function ThemeSection() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <section className="rounded-lg border border-surface-700 bg-surface-850 p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-slate-100">Weergave</h2>
        <p className="mt-1 text-xs text-slate-400">
          Kies tussen donker, licht of automatisch volgen van het systeem.
          {theme === 'system' && (
            <>
              {' '}
              Nu actief: <strong>{resolvedTheme === 'light' ? 'licht' : 'donker'}</strong>.
            </>
          )}
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors ${
                isActive
                  ? 'border-accent/60 bg-accent/10 text-slate-100'
                  : 'border-surface-700 bg-surface-900 text-slate-300 hover:border-surface-600 hover:bg-surface-800'
              }`}
              aria-pressed={isActive}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-md ${
                  isActive ? 'bg-accent/20 text-accent' : 'bg-surface-800 text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{option.label}</div>
                <div className="text-xs text-slate-400">{option.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
