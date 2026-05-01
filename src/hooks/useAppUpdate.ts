import { useEffect, useRef, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'available'; update: AvailableUpdate }
  | { kind: 'downloading'; update: AvailableUpdate; progress: DownloadProgress }
  | { kind: 'ready'; update: AvailableUpdate }
  | { kind: 'error'; message: string };

export interface AvailableUpdate {
  version: string;
  currentVersion: string;
  notes: string | null;
  date: string | null;
}

export interface DownloadProgress {
  downloaded: number;
  total: number | null;
}

function isTauriContext(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function summarize(update: Update): AvailableUpdate {
  return {
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body ?? null,
    date: update.date ?? null,
  };
}

export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' });
  const updateRef = useRef<Update | null>(null);
  const didRunRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    if (!isTauriContext()) {
      // Browser dev - updater plugin not available, stay idle.
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const update = await check();
        if (cancelled || !update) return;
        updateRef.current = update;
        setState({ kind: 'available', update: summarize(update) });
      } catch (err) {
        if (cancelled) return;
        console.warn('Update check failed', err);
        // Silent failure - no UI disruption on flaky network.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const install = async () => {
    const update = updateRef.current;
    if (!update) return;

    const summary = summarize(update);
    let downloaded = 0;
    let total: number | null = null;

    setState({
      kind: 'downloading',
      update: summary,
      progress: { downloaded: 0, total: null },
    });

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? null;
          setState({
            kind: 'downloading',
            update: summary,
            progress: { downloaded: 0, total },
          });
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          setState({
            kind: 'downloading',
            update: summary,
            progress: { downloaded, total },
          });
        } else if (event.event === 'Finished') {
          setState({ kind: 'ready', update: summary });
        }
      });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Update mislukt',
      });
    }
  };

  const restart = async () => {
    try {
      await relaunch();
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Herstart mislukt',
      });
    }
  };

  const dismiss = () => {
    setState({ kind: 'idle' });
  };

  return { state, install, restart, dismiss };
}
