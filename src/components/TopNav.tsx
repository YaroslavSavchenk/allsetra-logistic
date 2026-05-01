import { useEffect, useState } from 'react';
import { FlaskConical, Truck, UserCircle2 } from 'lucide-react';
import type { ComponentType } from 'react';
import { getServiceMode, type ServiceMode } from '@/services';
import { useCurrentUserOrNull } from '@/contexts/CurrentUserContext';
import { ROLE_LABEL } from '@/config/users';

export interface TabDefinition<Id extends string = string> {
  id: Id;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface Props<Id extends string> {
  tabs: ReadonlyArray<TabDefinition<Id>>;
  activeTab: Id;
  onTabChange: (id: Id) => void;
  /**
   * Optional click handler for the active-user badge on the right. The App
   * shell wires this to "switch to the Settings tab" so the user can swap
   * profiles without hunting for the gear icon.
   */
  onUserBadgeClick?: () => void;
}

export function TopNav<Id extends string>({
  tabs,
  activeTab,
  onTabChange,
  onUserBadgeClick,
}: Props<Id>) {
  const mode = useServiceMode();
  const { currentUser } = useCurrentUserOrNull();

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-6 border-b border-surface-700 bg-surface-900 px-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Truck className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-100">
            Logistiek Allsetra
          </div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
            Werkomgeving
          </div>
        </div>
      </div>

      <nav role="tablist" className="flex h-full items-stretch gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`relative inline-flex items-center gap-2 px-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {isActive && (
                <span
                  className="absolute inset-x-2 -bottom-px h-0.5 bg-accent"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {mode === 'mock' && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300"
            title="De app draait op lokale demo data — geen verbinding met Zoho. Wijzigingen verdwijnen na een reload."
          >
            <FlaskConical className="h-3 w-3" />
            Mock data
          </span>
        )}
        {currentUser && (
          <button
            type="button"
            onClick={onUserBadgeClick}
            disabled={!onUserBadgeClick}
            className="inline-flex items-center gap-2 rounded-full border border-surface-700 bg-surface-850 px-2.5 py-1 text-xs font-semibold text-slate-200 transition-colors hover:bg-surface-800 disabled:cursor-default disabled:hover:bg-surface-850"
            title={`Profiel: ${currentUser.name} (${ROLE_LABEL[currentUser.role]})`}
          >
            <UserCircle2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="max-w-[12rem] truncate">{currentUser.name}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                currentUser.role === 'beheer'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface-800 text-slate-400'
              }`}
            >
              {ROLE_LABEL[currentUser.role]}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}

function useServiceMode(): ServiceMode | null {
  const [mode, setMode] = useState<ServiceMode | null>(null);
  useEffect(() => {
    let cancelled = false;
    getServiceMode().then((m) => {
      if (!cancelled) setMode(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return mode;
}
