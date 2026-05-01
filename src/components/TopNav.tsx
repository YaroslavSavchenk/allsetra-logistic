import { useEffect, useState } from 'react';
import { FlaskConical, Truck } from 'lucide-react';
import type { ComponentType } from 'react';
import { getServiceMode, type ServiceMode } from '@/services';

export interface TabDefinition<Id extends string = string> {
  id: Id;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface Props<Id extends string> {
  tabs: ReadonlyArray<TabDefinition<Id>>;
  activeTab: Id;
  onTabChange: (id: Id) => void;
}

export function TopNav<Id extends string>({
  tabs,
  activeTab,
  onTabChange,
}: Props<Id>) {
  const mode = useServiceMode();

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

      {mode === 'mock' && (
        <span
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300"
          title="De app draait op lokale demo data — geen verbinding met Zoho. Wijzigingen verdwijnen na een reload."
        >
          <FlaskConical className="h-3 w-3" />
          Mock data
        </span>
      )}
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
