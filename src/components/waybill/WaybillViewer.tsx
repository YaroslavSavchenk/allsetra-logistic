import { useEffect, useRef } from 'react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Download, Printer, X } from 'lucide-react';
import type { Order } from '@/types/order';
import { WaybillDocument } from './WaybillDocument';

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal wrapper around the pakbon PDF. Renders the document in an inline
 * iframe via `<PDFViewer>` and exposes three actions: close, download,
 * print. Tailwind is only used here — the PDF itself is styled by
 * `waybillStyles.ts`.
 */
export function WaybillViewer({ order, isOpen, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

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
  //  1. Find the PDFViewer's iframe inside our modal subtree.
  //  2. Call iframe.contentWindow.print() — most browsers/WebView2 honour
  //     this and show the system print dialog scoped to the PDF.
  //  3. If that throws (cross-origin in dev, or contentWindow is null
  //     because the PDF hasn't finished rendering yet), fall back to
  //     opening the iframe.src in a new tab — the user can print from
  //     the browser's built-in PDF chrome.
  //
  // The blob URL is a same-origin object URL produced by @react-pdf, so the
  // cross-origin path mostly bites in odd test setups; the fallback is
  // mainly for the "user clicked Printen before the PDF loaded" race.
  const handlePrint = () => {
    const iframe = modalRef.current?.querySelector('iframe');
    if (!iframe) {
      console.warn('Pakbon: print mislukt — iframe niet gevonden.');
      return;
    }
    try {
      const win = iframe.contentWindow;
      if (!win) throw new Error('contentWindow is null');
      win.focus();
      win.print();
    } catch (err) {
      console.warn('Pakbon: directe print mislukt, val terug op nieuw venster.', err);
      const src = iframe.getAttribute('src');
      if (src) {
        window.open(src, '_blank', 'noopener,noreferrer');
      }
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
      <div
        ref={modalRef}
        className="flex h-[90vh] max-h-[90vh] min-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-surface-700 bg-surface-900 shadow-2xl"
      >
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

        {/* Body — PDFViewer fills remaining space. */}
        <div className="flex-1 overflow-hidden bg-surface-950">
          <PDFViewer
            width="100%"
            height="100%"
            showToolbar={false}
            style={{ border: 0, backgroundColor: '#1a2130' }}
          >
            <WaybillDocument order={order} />
          </PDFViewer>
        </div>

        {/* Footer with actions */}
        <footer className="flex items-center justify-end gap-2 border-t border-surface-700 bg-surface-850 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-surface-700 bg-surface-800 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-surface-700"
          >
            Sluiten
          </button>
          <PDFDownloadLink
            document={<WaybillDocument order={order} />}
            fileName={`pakbon-${order.orderNumber}.pdf`}
            className="inline-flex items-center gap-2 rounded-md border border-surface-700 bg-surface-800 px-4 py-2 text-sm text-slate-200 no-underline transition-colors hover:bg-surface-700"
          >
            {({ loading }) => (
              <>
                <Download className="h-4 w-4" />
                {loading ? 'Bezig…' : 'Downloaden'}
              </>
            )}
          </PDFDownloadLink>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-hover"
          >
            <Printer className="h-4 w-4" />
            Printen
          </button>
        </footer>
      </div>
    </div>
  );
}
