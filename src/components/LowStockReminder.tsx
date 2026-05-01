import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { getProductName } from '@/lib/productStrategy';

/**
 * Low-stock nudge that floats bottom-right above <UpdatePrompt/>. Surfaces
 * products whose physical stock has dropped below the threshold AND that
 * have nothing on order - i.e. logistics has not yet placed a purchase
 * order to refill them. The card tells the user to bestel bij of bel even.
 *
 * The reminder has three render states:
 *
 * 1. Hidden - empty list, or the user pressed X within the last hour
 *    (1-hour session-scoped snooze; reopening the app re-arms it).
 * 2. Pill - small permanent badge in the corner. Indicates that there is
 *    still work to do without obstructing the inkooporder-form on the
 *    Voorraad tab. Click to expand.
 * 3. Card - full reminder UI. Each product row is a button that calls
 *    onNavigate(productId) and auto-collapses to the pill, so the bestel
 *    form is unobstructed the moment the user starts working on a product.
 *
 * If a NEW low-stock product appears (the count grows), the card auto-
 * expands - the user should see fresh alerts. Items improving (going on
 * order or above 20) just shrink the count silently.
 *
 * Dismissal via X is intentionally session-scoped, not persisted: hiding
 * forever via localStorage would defeat the point. The pill itself has no
 * X - to snooze, the user must expand and then close.
 */

const STOCK_THRESHOLD = 20;
const SNOOZE_DURATION_MS = 60 * 60 * 1000; // 1 hour
/**
 * Cap the listed items at five. Most low-stock alerts fire for a handful
 * of SKUs - five lines fit comfortably in a 360px card without scrolling
 * or making the whole window heavy. Anything beyond that gets summarised
 * as "+N meer" so the card stays scannable; the Voorraad tab is one
 * click away if logistics wants the full picture.
 */
const MAX_VISIBLE_ITEMS = 5;

interface LowStockEntry {
  productId: string;
  name: string;
  opVoorraad: number;
}

interface Props {
  /**
   * Switches to the Voorraad tab and selects the given product. Wired by
   * App.tsx (parallel agent). When undefined, product rows fall back to
   * non-clickable display - the reminder stays informative but the
   * navigation shortcut is silently disabled. We deliberately keep the
   * rows visually quieter in that case (no hover tint, no chevron, not a
   * button) so users don't expect a click to do something.
   */
  onNavigate?: (productId: string) => void;
}

export function LowStockReminder({ onNavigate }: Props = {}) {
  const { data: inventory } = useInventory();
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Re-arm the card precisely when the snooze expires. We avoid an interval
  // ping; a single setTimeout is enough since dismissedUntil only changes on
  // user action.
  useEffect(() => {
    if (dismissedUntil === null) return;
    const remaining = dismissedUntil - Date.now();
    if (remaining <= 0) {
      setDismissedUntil(null);
      return;
    }
    const handle = window.setTimeout(() => {
      setDismissedUntil(null);
    }, remaining);
    return () => window.clearTimeout(handle);
  }, [dismissedUntil]);

  const lowStockItems = useMemo<LowStockEntry[]>(() => {
    if (!inventory) return [];
    return inventory
      .filter(
        (item) => item.opVoorraad < STOCK_THRESHOLD && item.opBestelling === 0,
      )
      .map((item) => ({
        productId: item.productId,
        name: getProductName(item.productId),
        opVoorraad: item.opVoorraad,
      }))
      .sort((a, b) => a.opVoorraad - b.opVoorraad);
  }, [inventory]);

  // Auto-expand when a NEW low-stock item appears. Improvements (count
  // shrinking) leave the collapsed state alone - if the user collapsed it,
  // they stay collapsed until something fresh demands their attention.
  const lowCount = lowStockItems.length;
  const prevCountRef = useRef(lowCount);
  useEffect(() => {
    if (lowCount > prevCountRef.current) {
      setCollapsed(false);
    }
    prevCountRef.current = lowCount;
  }, [lowCount]);

  const isSnoozed =
    dismissedUntil !== null && Date.now() < dismissedUntil;

  if (!inventory || lowStockItems.length === 0 || isSnoozed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedUntil(Date.now() + SNOOZE_DURATION_MS);
  };

  const handleProductClick = (productId: string) => {
    onNavigate?.(productId);
    setCollapsed(true);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={`${lowCount} ${lowCount === 1 ? 'product' : 'producten'} te bestellen, openen`}
        className="fixed bottom-[120px] right-5 z-40 inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 shadow-lg hover:bg-rose-500/25 cursor-pointer"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>{lowCount} te bestellen</span>
      </button>
    );
  }

  const visibleItems = lowStockItems.slice(0, MAX_VISIBLE_ITEMS);
  const overflowCount = lowStockItems.length - visibleItems.length;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[120px] right-5 z-40 w-[360px] overflow-hidden rounded-lg border border-rose-400/40 bg-surface-850 shadow-2xl"
    >
      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/15 text-rose-300">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-100">
              Voorraad bijbestellen?
            </div>
            <div className="text-xs text-slate-400">
              {lowStockItems.length === 1
                ? '1 product onder de 20 stuks'
                : `${lowStockItems.length} producten onder de 20 stuks`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-slate-500 hover:text-slate-300"
            aria-label="Inklappen"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-300">
          Deze producten staan onder de 20 stuks en er is geen openstaande
          inkooporder. Bestel bij of bel de leverancier.
        </p>

        <ul className="mb-2 divide-y divide-surface-800 overflow-hidden rounded-md border border-surface-700 bg-surface-900">
          {visibleItems.map((item) =>
            onNavigate ? (
              <li key={item.productId}>
                <button
                  type="button"
                  onClick={() => handleProductClick(item.productId)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-xs transition-colors hover:bg-rose-500/10 cursor-pointer"
                >
                  <span className="truncate text-slate-200">{item.name}</span>
                  <span className="flex flex-shrink-0 items-center gap-1.5">
                    <span className="font-mono font-semibold text-rose-300">
                      {item.opVoorraad}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  </span>
                </button>
              </li>
            ) : (
              <li
                key={item.productId}
                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
              >
                <span className="truncate text-slate-200">{item.name}</span>
                <span className="flex-shrink-0 font-mono font-semibold text-rose-300">
                  {item.opVoorraad}
                </span>
              </li>
            ),
          )}
          {overflowCount > 0 && (
            <li className="px-3 py-2 text-center text-[11px] font-medium text-slate-400">
              +{overflowCount} meer
            </li>
          )}
        </ul>

        {onNavigate && (
          <p className="mb-3 text-[11px] text-slate-500">
            Klik op een product om er naartoe te gaan.
          </p>
        )}

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-surface-800"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
