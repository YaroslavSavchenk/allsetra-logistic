import { useEffect, useMemo, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import type { Order } from '@/types/order';
import { buildWaybillHtml } from './buildWaybillHtml';

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal wrapper around the pakbon. Renders the document as styled HTML
 * inside an iframe via `srcDoc`, which works under Tauri's strict CSP
 * (no `blob:` URLs, no script). The same iframe is what gets printed —
 * what you see is what you print.
 *
 * Saving as PDF: Windows ships "Microsoft Print to PDF" by default, so
 * the system print dialog handles both physical printing and PDF export.
 */
export function WaybillViewer({ order, isOpen, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build the HTML once per modal open. The order object identity is stable
  // across the modal lifetime (it's the React Query cache entry), so a
  // dependency on `order` itself is enough — no per-render rebuilds.
  const html = useMemo(() => buildWaybillHtml(order), [order]);

  // Escape closes the modal — non-intrusive, matches OS expectations.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Print flow:
  //  - The iframe is same-origin (srcDoc), so contentWindow is reachable.
  //  - focus() before print() so the print dialog scopes to the iframe
  //    rather than the host modal/document.
  //  - WebView2 forwards this to the Windows system print dialog, where
  //    "Microsoft Print to PDF" is a built-in destination.
  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Pakbon: print mislukt', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Pakbon ${order.orderNumber}`}
      onClick={(e) => {
        // Click on backdrop closes; clicks inside the card don't bubble here.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] max-h-[90vh] min-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-surface-700 bg-surface-900 shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-surface-700 bg-surface-850 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Pakbon —{' '}
            <span className="font-mono text-accent">{order.orderNumber}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-surface-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body — neutral dark gray frame around a white A4 iframe so the
            page preview reads as a sheet of paper. */}
        <div className="flex flex-1 items-stretch overflow-hidden bg-surface-950 p-4">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title={`Pakbon ${order.orderNumber}`}
            className="h-full w-full rounded border border-surface-700 bg-white"
            // sandbox intentionally omitted — we control the document content
            // and need scripted print() via contentWindow. Our HTML has no
            // scripts of its own.
          />
        </div>

        {/* Footer with actions */}
        <footer className="flex items-center justify-end gap-3 border-t border-surface-700 bg-surface-850 px-5 py-3">
          <p className="mr-auto text-xs text-slate-500">
            Kies in het printvenster &laquo;Microsoft Print to PDF&raquo; om
            als PDF op te slaan.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-surface-700 bg-surface-800 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-surface-700"
          >
            Sluiten
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-hover"
          >
            <Printer className="h-4 w-4" />
            Printen / opslaan als PDF
          </button>
        </footer>
      </div>
    </div>
  );
}
