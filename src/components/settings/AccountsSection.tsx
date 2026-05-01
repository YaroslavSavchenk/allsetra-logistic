import { Lock, UserCircle2 } from 'lucide-react';
import { USERS } from '@/config/users';
import {
  useCurrentUserOrNull,
  useHasRole,
} from '@/contexts/CurrentUserContext';
import { RoleBadge } from './RoleBadge';

/**
 * List of every defined profile. Beheer-only - logistiek users see a
 * locked placeholder that explains the gating without exposing edit UI
 * (which doesn't exist anyway: profile lists are code-only).
 */
export function AccountsSection() {
  const isBeheer = useHasRole('beheer');
  const { currentUser } = useCurrentUserOrNull();

  if (!isBeheer) {
    return (
      <section className="rounded-lg border border-surface-700 bg-surface-850 p-5">
        <header className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-100">Accounts</h2>
        </header>
        <p className="text-xs text-slate-400">
          Alleen beheer kan accounts beheren.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-surface-700 bg-surface-850 p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-slate-100">Accounts</h2>
        <p className="mt-1 text-xs text-slate-400">
          Profielen zijn vastgelegd in de code-base. Bewerken vereist een
          nieuwe release.
        </p>
      </header>
      <ul className="divide-y divide-surface-800 overflow-hidden rounded-lg border border-surface-700 bg-surface-900">
        {USERS.map((user) => {
          const isCurrent = currentUser?.id === user.id;
          return (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-800 text-slate-400">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {user.name}
                  </div>
                  <div className="text-xs text-slate-500">{user.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={user.role} />
                {isCurrent && (
                  <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    Actief
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
