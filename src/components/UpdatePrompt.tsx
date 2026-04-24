import { Download, RotateCw, X, CircleAlert, Check } from 'lucide-react';
import { useAppUpdate, type DownloadProgress } from '@/hooks/useAppUpdate';

export function UpdatePrompt() {
  const { state, install, restart, dismiss } = useAppUpdate();

  if (state.kind === 'idle') return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 w-[360px] overflow-hidden rounded-lg border border-surface-700 bg-surface-850 shadow-2xl"
    >
      {state.kind === 'available' && (
        <AvailableView
          version={state.update.version}
          currentVersion={state.update.currentVersion}
          notes={state.update.notes}
          onInstall={install}
          onDismiss={dismiss}
        />
      )}
      {state.kind === 'downloading' && (
        <DownloadingView
          version={state.update.version}
          progress={state.progress}
        />
      )}
      {state.kind === 'ready' && (
        <ReadyView version={state.update.version} onRestart={restart} />
      )}
      {state.kind === 'error' && (
        <ErrorView message={state.message} onDismiss={dismiss} />
      )}
    </div>
  );
}

function AvailableView({
  version,
  currentVersion,
  notes,
  onInstall,
  onDismiss,
}: {
  version: string;
  currentVersion: string;
  notes: string | null;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Download className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-100">
            Update beschikbaar
          </div>
          <div className="font-mono text-xs text-slate-400">
            v{currentVersion} → v{version}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300"
          aria-label="Sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {notes && (
        <div className="mb-3 max-h-28 overflow-y-auto rounded border border-surface-700 bg-surface-900 p-2 text-xs text-slate-300">
          <div className="whitespace-pre-wrap">{notes}</div>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-surface-800"
        >
          Later
        </button>
        <button
          type="button"
          onClick={onInstall}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-surface-950 hover:bg-accent-hover"
        >
          <Download className="h-3.5 w-3.5" />
          Nu updaten
        </button>
      </div>
    </div>
  );
}

function DownloadingView({
  version,
  progress,
}: {
  version: string;
  progress: DownloadProgress;
}) {
  const pct =
    progress.total && progress.total > 0
      ? Math.min(100, (progress.downloaded / progress.total) * 100)
      : null;

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-100">
          Update downloaden…
        </div>
        <span className="font-mono text-xs text-slate-400">v{version}</span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-800">
        {pct !== null ? (
          <div
            className="h-full bg-accent transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full w-1/3 animate-pulse bg-accent/70" />
        )}
      </div>
      <div className="font-mono text-[11px] text-slate-500">
        {pct !== null
          ? `${formatBytes(progress.downloaded)} / ${formatBytes(progress.total!)} (${pct.toFixed(0)}%)`
          : formatBytes(progress.downloaded)}
      </div>
    </div>
  );
}

function ReadyView({
  version,
  onRestart,
}: {
  version: string;
  onRestart: () => void;
}) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Check className="h-4 w-4" strokeWidth={3} />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100">
            Update klaar (v{version})
          </div>
          <div className="text-xs text-slate-400">
            Herstart de app om te gebruiken.
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-surface-950 hover:bg-accent-hover"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Herstarten
        </button>
      </div>
    </div>
  );
}

function ErrorView({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="p-4">
      <div className="mb-2 flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
          <CircleAlert className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-100">
            Update mislukt
          </div>
          <div className="mt-0.5 break-words text-xs text-slate-400">
            {message}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300"
          aria-label="Sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
