import { LogOut, UserCircle2 } from 'lucide-react';
import { useCurrentUserOrNull } from '@/contexts/CurrentUserContext';
import { RoleBadge } from './RoleBadge';

/**
 * Section that surfaces the active profile + a "wissel profiel" button.
 * Clearing the active user pops the picker back over the app — no full
 * page reload, no React Query cache flush.
 */
export function ProfileSection() {
  const { currentUser, clearCurrentUser } = useCurrentUserOrNull();
  if (!currentUser) return null;

  return (
    <section className="rounded-lg border border-surface-700 bg-surface-850 p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-slate-100">Profiel</h2>
        <p className="mt-1 text-xs text-slate-400">
          Het actieve profiel bepaalt welke acties beschikbaar zijn.
        </p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-surface-700 bg-surface-900 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">
                {currentUser.name}
              </span>
              <RoleBadge role={currentUser.role} />
            </div>
            <div className="text-xs text-slate-500">Profiel-id: {currentUser.id}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={clearCurrentUser}
          className="inline-flex items-center gap-2 rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-surface-800"
        >
          <LogOut className="h-3.5 w-3.5" />
          Wissel profiel
        </button>
      </div>
    </section>
  );
}
