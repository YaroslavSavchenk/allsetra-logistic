import { useMemo, useState } from 'react';
import { Loader2, Package, Search } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory';
import type { ProductCategory } from '@/types/product';
import { CATEGORY_LABEL, getProduct } from '@/lib/productStrategy';
import { formatDateTime } from '@/lib/format';

// Fixed render order for the sidebar groups. The category itself is set on
// each Product upstream — in mock mode directly from productStrategy, in
// live mode through zohoCatalogService's normaliseCategory() coercion — so
// we just consume `Product.category` here without any service knowledge.
const CATEGORY_ORDER: ProductCategory[] = [
  'tracker',
  'tracker-accessory',
  'bike-security',
  'sensor',
];

interface Props {
  inventory: InventoryItem[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
  isLoading: boolean;
}

/**
 * Sidebar-style product list with search + per-row stock summary. Mirrors
 * the visual cues from `Sidebar` (selection stripe on the left, dense rows,
 * monospace numbers).
 */
export function InventoryTable({
  inventory,
  selectedProductId,
  onSelect,
  isLoading,
}: Props) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return inventory
      .map((item) => ({ item, product: getProduct(item.productId) }))
      .filter((row) => row.product !== null);
  }, [inventory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? rows.filter(
          (row) =>
            row.product!.name.toLowerCase().includes(q) ||
            row.product!.sku.toLowerCase().includes(q),
        )
      : rows;

    // Sort: products with an active inkooporder bubble to the top; within
    // each group the lowest stock floats up so logistics sees the urgent
    // items first.
    return [...matched].sort((a, b) => {
      const aPending = a.item.opBestelling > 0 ? 1 : 0;
      const bPending = b.item.opBestelling > 0 ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;
      return a.item.opVoorraad - b.item.opVoorraad;
    });
  }, [rows, query]);

  // Group the (already-sorted) filtered rows by category, preserving the
  // within-group order. Render order is fixed via CATEGORY_ORDER; empty
  // groups are skipped so no spurious header/whitespace appears. A
  // category not in CATEGORY_ORDER (e.g. a future Zoho category before
  // the registry catches up) renders last with its raw key as the header
  // so unknown data stays visible instead of being silently dropped.
  const grouped = useMemo(() => {
    const buckets = new Map<string, typeof filtered>();
    for (const row of filtered) {
      const key = row.product!.category;
      const list = buckets.get(key);
      if (list) list.push(row);
      else buckets.set(key, [row]);
    }
    const ordered: Array<{ category: string; label: string; rows: typeof filtered }> = [];
    for (const cat of CATEGORY_ORDER) {
      const list = buckets.get(cat);
      if (list && list.length > 0) {
        ordered.push({ category: cat, label: CATEGORY_LABEL[cat], rows: list });
        buckets.delete(cat);
      }
    }
    for (const [cat, list] of buckets) {
      if (list.length > 0) {
        ordered.push({ category: cat, label: cat, rows: list });
      }
    }
    return ordered;
  }, [filtered]);

  return (
    <aside className="flex w-[420px] flex-shrink-0 flex-col border-r border-surface-700 bg-surface-900">
      <div className="flex items-center gap-2 border-b border-surface-700 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Package className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Voorraad
          </div>
          <div className="text-sm font-semibold text-slate-100">Producten</div>
        </div>
      </div>

      <div className="border-b border-surface-700 px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Producten
          </span>
          <span className="font-mono text-sm font-semibold text-accent">
            {rows.length}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Zoek op naam of SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-surface-700 bg-surface-850 py-2 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent/60"
          />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 border-b border-surface-700 bg-surface-900 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <span>Product</span>
        <span className="text-right">Voorraad</span>
        <span className="text-right">Best.</span>
        <span className="text-right">Totaal</span>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Laden…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            {query ? 'Geen producten gevonden' : 'Geen voorraad'}
          </div>
        )}
        {grouped.map(({ category, label, rows: groupRows }) => (
          <section key={category}>
            <div className="sticky top-0 z-10 flex items-baseline justify-between bg-surface-900/95 px-4 py-2 backdrop-blur">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {label}
              </span>
              <span className="font-mono text-xs text-accent">
                {groupRows.length}
              </span>
            </div>
            <ul className="divide-y divide-surface-800">
              {groupRows.map(({ item, product }) => (
                <ProductRow
                  key={item.productId}
                  productId={item.productId}
                  name={product!.name}
                  sku={product!.sku}
                  opVoorraad={item.opVoorraad}
                  opBestelling={item.opBestelling}
                  lastMovementAt={item.lastMovementAt}
                  isSelected={item.productId === selectedProductId}
                  onClick={() => onSelect(item.productId)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}

interface RowProps {
  productId: string;
  name: string;
  sku: string;
  opVoorraad: number;
  opBestelling: number;
  lastMovementAt: string | null;
  isSelected: boolean;
  onClick: () => void;
}

function ProductRow({
  name,
  sku,
  opVoorraad,
  opBestelling,
  lastMovementAt,
  isSelected,
  onClick,
}: RowProps) {
  const totaal = opVoorraad + opBestelling;
  const lowStock = opVoorraad <= 5;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`group relative grid w-full grid-cols-[minmax(0,1fr)_70px_70px_70px] gap-2 px-4 py-3 text-left transition-colors ${
          isSelected ? 'bg-surface-800' : 'hover:bg-surface-850'
        }`}
      >
        {isSelected && (
          <span
            className="absolute inset-y-0 left-0 w-0.5 bg-accent"
            aria-hidden
          />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="break-words text-sm font-semibold leading-tight text-slate-100">
            {name}
          </span>
          <span className="font-mono text-xs text-slate-500">{sku}</span>
          {lastMovementAt && (
            <span className="mt-0.5 text-[10px] text-slate-500">
              {formatDateTime(lastMovementAt)}
            </span>
          )}
        </div>
        <span
          className={`self-center text-right font-mono text-sm ${
            lowStock ? 'text-rose-300' : 'text-slate-100'
          }`}
        >
          {opVoorraad}
        </span>
        <span className="self-center text-right font-mono text-sm text-slate-300">
          {opBestelling}
        </span>
        <span className="self-center text-right font-mono text-sm font-semibold text-accent">
          {totaal}
        </span>
      </button>
    </li>
  );
}
