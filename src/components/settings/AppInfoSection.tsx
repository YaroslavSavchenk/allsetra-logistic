import { useEffect, useState } from 'react';
import { FlaskConical, Info, Plug } from 'lucide-react';
import { getServiceMode, type ServiceMode } from '@/services';
import packageInfo from '../../../package.json';

/**
 * Static-ish app metadata: version (from package.json baked in at build
 * time) + which back-end (mock/zoho) the service façade resolved to.
 * Helps support reproduce issues without asking the user to dig through
 * the dev tools.
 */
export function AppInfoSection() {
  const mode = useServiceMode();
  const version = packageInfo.version;

  return (
    <section className="rounded-lg border border-surface-700 bg-surface-850 p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-slate-100">Over de app</h2>
        <p className="mt-1 text-xs text-slate-400">
          Versie- en omgevingsinformatie voor support.
        </p>
      </header>
      <dl className="grid gap-3 sm:grid-cols-2">
        <InfoRow icon={Info} label="Versie" value={version} />
        <InfoRow
          icon={mode === 'mock' ? FlaskConical : Plug}
          label="Databron"
          value={
            mode === null
              ? 'Bezig met laden…'
              : mode === 'mock'
                ? 'Mock data (lokaal)'
                : 'Zoho CRM (live)'
          }
          tone={mode === 'mock' ? 'warning' : 'default'}
        />
      </dl>
    </section>
  );
}

interface InfoRowProps {
  icon: typeof Info;
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}

function InfoRow({ icon: Icon, label, value, tone = 'default' }: InfoRowProps) {
  const valueClass =
    tone === 'warning' ? 'text-amber-300' : 'text-slate-100';
  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2.5">
      <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className={`truncate font-mono text-sm ${valueClass}`}>{value}</div>
      </div>
    </div>
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
