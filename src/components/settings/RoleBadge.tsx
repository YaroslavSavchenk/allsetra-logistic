import { ShieldCheck, User } from 'lucide-react';
import { ROLE_LABEL, type UserRole } from '@/config/users';

/**
 * Small inline pill that surfaces a user's role. Reused by the picker,
 * the profile section, the accounts list and the TopNav user badge so the
 * visual treatment stays consistent across the app.
 */
export function RoleBadge({ role }: { role: UserRole }) {
  const isBeheer = role === 'beheer';
  const Icon = isBeheer ? ShieldCheck : User;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        isBeheer
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-surface-700 bg-surface-800 text-slate-300'
      }`}
    >
      <Icon className="h-3 w-3" />
      {ROLE_LABEL[role]}
    </span>
  );
}
