import { ChevronRight, Truck, UserCircle2 } from 'lucide-react';
import { USERS } from '@/config/users';
import { useCurrentUserOrNull } from '@/contexts/CurrentUserContext';
import { RoleBadge } from './RoleBadge';

/**
 * First-run / post-switch identity picker. Renders full-screen as a
 * full-window card (not a modal — there's nothing behind it the user
 * could possibly want to interact with first). Picking a profile
 * persists to localStorage via the context and unmounts the picker.
 *
 * This is intentionally not authentication: the OS already authenticated
 * the user. The picker exists so the app knows which role to apply to UI
 * gating + which name to attach to mutations later.
 */
export function ProfilePicker() {
  const { setCurrentUser } = useCurrentUserOrNull();

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-50">Wie ben je?</h1>
            <p className="mt-1 text-sm text-slate-400">
              Kies je profiel om door te gaan.
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {USERS.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => setCurrentUser(user)}
                className="flex w-full items-center gap-3 rounded-lg border border-surface-700 bg-surface-850 p-3 text-left transition-colors hover:border-accent/40 hover:bg-surface-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-800 text-slate-300">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-100">
                      {user.name}
                    </span>
                    <RoleBadge role={user.role} />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Profiel-id: {user.id}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-500" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-[11px] text-slate-500">
          Profielen zijn lokaal opgeslagen en kunnen via instellingen worden
          gewisseld.
        </p>
      </div>
    </div>
  );
}
